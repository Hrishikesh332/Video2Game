from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import time
from twelvelabs import TwelveLabs
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

TWELVELABS_API_KEY = os.getenv("TWELVELABS_API_KEY")
SAMBANOVA_API_KEY = os.getenv("SAMBANOVA_API_KEY")

if not TWELVELABS_API_KEY:
    print("TWELVELABS_API_KEY not found in .env file")
    exit(1)

if not SAMBANOVA_API_KEY:
    print("SAMBANOVA_API_KEY not found in .env file")
    exit(1)

twelvelabs_client = TwelveLabs(api_key=TWELVELABS_API_KEY)

sambanova_client = OpenAI(
    api_key=SAMBANOVA_API_KEY,
    base_url="https://api.sambanova.ai/v1",
)

GAMES_DIR = "generated_games"
os.makedirs(GAMES_DIR, exist_ok=True)

def clean_html_content(html_content):
    try:
        html_content = re.sub(r'<think>.*?</think>', '', html_content, flags=re.DOTALL)
        
        html_content = re.sub(r'```html\s*', '', html_content)
        html_content = re.sub(r'```\s*$', '', html_content, flags=re.MULTILINE)
        
        first_tag_match = re.search(r'<(?:!DOCTYPE|html)', html_content, re.IGNORECASE)
        if first_tag_match:
            html_content = html_content[first_tag_match.start():]
        
        html_content = re.sub(r'^[^<]*(?=<)', '', html_content)
        html_content = re.sub(r'# [^\n]*\n', '', html_content)
        
        html_content = re.sub(r'\n\s*\n\s*\n', '\n\n', html_content)
        html_content = re.sub(r'\r\n', '\n', html_content)
        
        return html_content.strip()
        
    except Exception as e:
        print(f"Warning, Could not clean HTML content: {e}")
        return html_content

def ensure_valid_html(html_content):
    try:
        has_doctype = '<!DOCTYPE html>' in html_content
        has_html_open = '<html' in html_content
        has_html_close = '</html>' in html_content
        has_body_close = '</body>' in html_content
        
        if not has_doctype:
            html_content = '<!DOCTYPE html>\n' + html_content
            
        if not has_html_open:
            html_content = html_content.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<html lang="en">')
            
        if has_html_open and not has_html_close:
            print("⚠️ HTML appears incomplete, attempting to fix...")
            
            lines = html_content.split('\n')
            last_meaningful_line = len(lines) - 1
            
            while last_meaningful_line > 0 and not lines[last_meaningful_line].strip():
                last_meaningful_line -= 1
            
            html_content = '\n'.join(lines[:last_meaningful_line + 1])
            
            if not has_body_close and '<body' in html_content:
                html_content += '\n    </script>\n</body>'
            elif '<script' in html_content and not html_content.rstrip().endswith('</script>'):
                html_content += '\n    </script>'
                
            if not has_body_close and '<body' in html_content:
                html_content += '\n</body>'
                
            html_content += '\n</html>'
            print("Fixed incomplete HTML structure")
            
        return html_content
        
    except Exception as e:
        print(f"Warning - Could not fix HTML structure: {e}")
        return html_content

def extract_and_save_html(response_content, video_id):
    try:
        print(f"Processing response content (length: {len(response_content)} chars)")

        html_pattern = r'```html\s*(<!DOCTYPE html>.*?</html>)\s*```'
        html_match = re.search(html_pattern, response_content, re.DOTALL | re.IGNORECASE)
        
        if html_match:
            html_content = html_match.group(1)
            print("Found HTML in markdown code block")
        else:
            html_pattern = r'<!DOCTYPE html>.*?</html>'
            html_match = re.search(html_pattern, response_content, re.DOTALL | re.IGNORECASE)
            
            if html_match:
                html_content = html_match.group(0)
                print("Found HTML with DOCTYPE")
            else:
                html_pattern = r'<html.*?>.*?</html>'
                html_match = re.search(html_pattern, response_content, re.DOTALL | re.IGNORECASE)
                
                if html_match:
                    html_content = html_match.group(0)
                    html_content = '<!DOCTYPE html>\n' + html_content
                    print("Found HTML without DOCTYPE, added it")
                else:
                    if 'html' in response_content.lower() and '<' in response_content:
                        start_index = response_content.find('<')
                        last_close_index = response_content.rfind('>')
                        
                        if start_index != -1 and last_close_index != -1:
                            html_content = response_content[start_index:last_close_index + 1]
                            
                            if not html_content.strip().endswith('</html>'):
                                if '</body>' not in html_content:
                                    html_content += '\n</body>'
                                html_content += '\n</html>'
                            
                            if not html_content.strip().startswith('<!DOCTYPE html>'):
                                html_content = '<!DOCTYPE html>\n' + html_content
                            
                            print("Extracted incomplete HTML and fixed it")
                        else:
                            html_content = response_content
                            print("⚠️ Using entire response as HTML")
                    else:
                        html_content = response_content
                        print("No HTML detected, using full response")
        
        html_content = clean_html_content(html_content)
        
        html_content = ensure_valid_html(html_content)
        
        filename = f"video_game_{video_id}_{int(time.time())}.html"
        file_path = os.path.join(GAMES_DIR, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"HTML game saved to: {file_path}")
        print(f"Final HTML size: {len(html_content)} characters")
        return file_path
        
    except Exception as e:
        print(f"Error saving HTML file: {e}")
        filename = f"video_game_{video_id}_{int(time.time())}_raw.html"
        file_path = os.path.join(GAMES_DIR, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(response_content)
        
        print(f"⚠️ Raw content saved to: {file_path}")
        return file_path

@app.route('/indexes', methods=['GET'])
def get_indexes():
    try:
        print("Fetching indexes...")
        indexes = twelvelabs_client.index.list()
        print(f"Raw response type: {type(indexes)}")
        
        result = []
        if hasattr(indexes, 'data'):
            index_list = indexes.data
            print("Using .data attribute")
        else:
            index_list = indexes
            print("Using direct response")
            
        for index in index_list:
            result.append({
                "id": index.id,
                "name": index.name
            })
        return jsonify({"indexes": result})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/indexes/<index_id>/videos', methods=['GET'])
def get_videos(index_id):
    try:
        videos = twelvelabs_client.index.video.list(index_id=index_id)
        result = []
        if hasattr(videos, 'data'):
            video_list = videos.data
        else:
            video_list = videos
            
        for video in video_list:
            result.append({
                "id": video.id,
                "name": getattr(video.metadata, 'filename', f'Video {video.id}') if hasattr(video, 'metadata') else f'Video {video.id}',
                "duration": getattr(video.metadata, 'duration', 0) if hasattr(video, 'metadata') else 0
            })
        return jsonify({"videos": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_video():
    try:
        data = request.get_json()
        video_id = data.get('video_id')
        
        if not video_id:
            return jsonify({"error": "video_id is required"}), 400
        
        print(f"Analyzing video content with TwelveLabs: {video_id}")
        
        analysis_prompt = """
        Analyze this video thoroughly and provide a detailed description including:
        
        1. **Main Topic/Theme** - What is this video about? (sports, cooking, dance, education, nature, etc.)
        2. **Content Type** - Tutorial, performance, documentary, entertainment, etc.
        3. **Key Elements** - Main characters, objects, actions, scenes, dialogue
        4. **Visual Details** - Colors, settings, movements, techniques shown
        5. **Educational Value** - What can viewers learn from this content?
        6. **Timestamps** - Key moments and their timings (format: MM:SS)
        7. **Engagement Points** - What would be most interesting to interact with?
        
        Provide a comprehensive analysis that would help create an engaging interactive game.
        """

        analysis_response = twelvelabs_client.generate.text(
            video_id=video_id,
            prompt=analysis_prompt
        )
        
        video_analysis = analysis_response.data
        print(f"Video analysis completed. Length: {len(video_analysis)} characters")
        
        print("Generating game with SambaNova")
        
        game_generation_prompt = f"""
        Based on this video analysis, create a complete, interactive HTML game that's perfectly suited to the content:

        VIDEO ANALYSIS:
        {video_analysis}

        CRITICAL REQUIREMENTS:
        1. **Return ONLY complete HTML code** - Start with <!DOCTYPE html> and end with </html>
        2. **No explanations or markdown** - Just the raw HTML file content
        3. **Self-contained** - All CSS in <style> tags, all JavaScript in <script> tags
        4. **Complete and functional** - Must be a working game that runs in any browser
        
        GAME SPECIFICATIONS:
        1. **Choose the BEST game type** for this content: quiz, memory match, sequence, drawing/visual, trivia, classification, timeline, prediction
        
        2. **Include these elements**:
           - Professional responsive design with modern CSS
           - 3-4 interactive challenges as per the game type based on video content
           - Scoring system with visual feedback
           - Progress tracking and completion screen
           - Error handling and input validation
           - Engaging animations and transitions
           - Educational content specific to the video
        
        3. **Technical requirements**:
           - HTML5 semantic structure
           - CSS3 with flexbox/grid layouts
           - Vanilla JavaScript (no external dependencies)
           - Mobile-responsive design
           - Accessibility features
        
        4. **Content-specific adaptation**:
           - Game mechanics that match the video topic perfectly
           - Visual style that complements the video aesthetic
           - Educational value extracted from video content
           - Interactive elements relevant to the subject matter

        5. COLOR THEME to Use - White Background and Grey as bg color and then over that use other color if needed, keep it simplistic as black, white and gray

        6. Please do have the next button on the top side to switch the

        7. Please make sure that everything is working and functional
        
        IMPORTANT: Return ONLY the HTML code. No markdown blocks, no explanations, no additional text.
        """
        
        sambanova_response = sambanova_client.chat.completions.create(
            model="DeepSeek-R1-0528",
            messages=[
                {"role": "system", "content": "You are an expert web developer who creates engaging, educational HTML games based on video content analysis. Always return complete, self-contained HTML files."},
                {"role": "user", "content": game_generation_prompt}
            ],
            temperature=0.1,
            top_p=0.1
        )
        
        game_code = sambanova_response.choices[0].message.content
        print(f"Game code generated. Length: {len(game_code)} characters")
        
        html_file_path = extract_and_save_html(game_code, video_id)
        
        return jsonify({
            "video_id": video_id,
            "video_analysis": video_analysis,
            "game_code": game_code,
            "html_file_path": html_file_path,
            "message": "Interactive HTML game generated and saved locally"
        })
        
    except Exception as e:
        print(f"Error in two-step analysis: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/games/list', methods=['GET'])
def list_generated_games():
    try:
        games = []
        if os.path.exists(GAMES_DIR):
            for filename in os.listdir(GAMES_DIR):
                if filename.endswith('.html'):
                    file_path = os.path.join(GAMES_DIR, filename)
                    file_stats = os.stat(file_path)
                    games.append({
                        "filename": filename,
                        "path": file_path,
                        "size": file_stats.st_size,
                        "created": file_stats.st_ctime
                    })
        
        games.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify({
            "games": games,
            "total": len(games),
            "games_directory": GAMES_DIR
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/games/open/<filename>', methods=['GET'])
def open_game_file(filename):
    try:
        file_path = os.path.join(GAMES_DIR, filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "Game file not found"}), 404
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return jsonify({
            "filename": filename,
            "content": content,
            "path": file_path
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "services": {
            "twelvelabs": "connected" if TWELVELABS_API_KEY else "missing",
            "sambanova": "connected" if SAMBANOVA_API_KEY else "missing"
        },
        "games_directory": GAMES_DIR,
        "games_count": len([f for f in os.listdir(GAMES_DIR) if f.endswith('.html')]) if os.path.exists(GAMES_DIR) else 0
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)