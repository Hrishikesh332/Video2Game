from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import time
import json
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
CACHE_DIR = "game_cache"
INSTRUCTIONS_DIR = "instructions"
os.makedirs(GAMES_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(INSTRUCTIONS_DIR, exist_ok=True)

ANALYSIS_PROMPT_FILE = os.path.join(INSTRUCTIONS_DIR, "analysis_prompt.md")
GAME_GENERATION_PROMPT_FILE = os.path.join(INSTRUCTIONS_DIR, "game_generation_prompt.md")
SYSTEM_PROMPT_FILE = os.path.join(INSTRUCTIONS_DIR, "system_prompt.md")

def load_prompt_from_file(file_path):
    try:
        if not os.path.exists(file_path):
            print(f"Prompt file {file_path} not found!")
            return f"Error: Prompt file {file_path} not found"
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        print(f"Loaded prompt from {file_path}")
        return content
        
    except Exception as e:
        print(f"Error loading prompt from {file_path}: {e}")
        return f"Error loading prompt: {e}"

def load_all_prompts():
    prompts = {
        'analysis': load_prompt_from_file(ANALYSIS_PROMPT_FILE),
        'game_generation': load_prompt_from_file(GAME_GENERATION_PROMPT_FILE),
        'system': load_prompt_from_file(SYSTEM_PROMPT_FILE)
    }
    
    print(f"Loaded {len(prompts)} prompt files from {INSTRUCTIONS_DIR}/")
    return prompts

def reload_prompts():
    global PROMPTS
    PROMPTS = load_all_prompts()
    return PROMPTS

def get_prompt(prompt_type, **kwargs):
    if prompt_type not in PROMPTS:
        print(f"⚠️ Prompt type '{prompt_type}' not found")
        return f"Error: Prompt type '{prompt_type}' not found"
    
    prompt = PROMPTS[prompt_type]
    
    try:
        formatted_prompt = prompt.format(**kwargs)
        return formatted_prompt
    except KeyError as e:
        print(f"Missing variable {e} for prompt type '{prompt_type}'")
        return prompt

PROMPTS = load_all_prompts()

def save_game_cache(video_id, game_data):
    try:
        cache_file = os.path.join(CACHE_DIR, f"{video_id}.json")
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(game_data, f, ensure_ascii=False, indent=2)
        print(f"Game cached for video: {video_id}")
        return True
    except Exception as e:
        print(f"Error saving cache: {e}")
        return False

def load_game_cache(video_id):
    try:
        cache_file = os.path.join(CACHE_DIR, f"{video_id}.json")
        if os.path.exists(cache_file):
            with open(cache_file, 'r', encoding='utf-8') as f:
                game_data = json.load(f)
            print(f"Found cached game for video: {video_id}")
            return game_data
        return None
    except Exception as e:
        print(f"Error loading cache: {e}")
        return None

def get_all_cached_games():
    try:
        cached_games = []
        if os.path.exists(CACHE_DIR):
            for filename in os.listdir(CACHE_DIR):
                if filename.endswith('.json'):
                    video_id = filename[:-5]
                    file_path = os.path.join(CACHE_DIR, filename)
                    file_stats = os.stat(file_path)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            game_data = json.load(f)
                        
                        cached_games.append({
                            "video_id": video_id,
                            "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(file_stats.st_ctime)),
                            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(file_stats.st_mtime)),
                            "size": file_stats.st_size,
                            "has_html": "html_content" in game_data,
                            "has_analysis": "video_analysis" in game_data
                        })
                    except:
                        continue
        
        cached_games.sort(key=lambda x: x['created_at'], reverse=True)
        return cached_games
    except Exception as e:
        print(f"❌ Error getting cached games: {e}")
        return []

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
        print(f"Warning: Could not clean HTML content: {e}")
        return html_content

def ensure_valid_html(html_content):
    try:
        has_doctype = '<!DOCTYPE html>' in html_content
        has_html_open = '<html' in html_content
        has_html_close = '</html>' in html_content
        has_body_close = '</body>' in html_content
        has_script_open = '<script' in html_content
        has_style_close = '</style>' in html_content
        
        if not has_doctype:
            html_content = '<!DOCTYPE html>\n' + html_content
            
        if not has_html_open:
            html_content = html_content.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<html lang="en">')
            
        if has_html_open and not has_html_close:
            print("HTML appears incomplete, attempting to fix...")
            
            lines = html_content.split('\n')
            last_meaningful_line = len(lines) - 1
            
            while last_meaningful_line > 0 and not lines[last_meaningful_line].strip():
                last_meaningful_line -= 1
            
            html_content = '\n'.join(lines[:last_meaningful_line + 1])
            
            if has_script_open and not html_content.rstrip().endswith('</script>'):
                html_content += '\n    </script>'
                
            if not has_style_close and '<style' in html_content:
                html_content += '\n    </style>'
                
            if not has_body_close and '<body' in html_content:
                html_content += '\n</body>'
                
            html_content += '\n</html>'
            print("Fixed incomplete HTML structure")
            
        return html_content
        
    except Exception as e:
        print(f"Warning, Could not fix HTML structure: {e}")
        return html_content

def save_html_file(html_content, video_id):
    try:
        filename = f"video_game_{video_id}_{int(time.time())}.html"
        file_path = os.path.join(GAMES_DIR, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"HTML game saved to: {file_path}")
        return file_path
    except Exception as e:
        print(f"Error saving HTML file: {e}")
        return None

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
        force_regenerate = data.get('regenerate', False)
        
        if not video_id:
            return jsonify({"error": "video_id is required"}), 400
        
        if not force_regenerate:
            cached_game = load_game_cache(video_id)
            if cached_game:
                print(f"🎯 Using cached game for video: {video_id}")
                return jsonify({
                    **cached_game,
                    "cached": True,
                    "message": "Game loaded from cache. Use 'regenerate': true to create a new version."
                })
        
        print(f"Step 1: Analyzing video content with TwelveLabs: {video_id}")
        
        analysis_prompt = get_prompt('analysis')
        
        analysis_response = twelvelabs_client.generate.text(
            video_id=video_id,
            prompt=analysis_prompt
        )
        
        video_analysis = analysis_response.data
        print(f"Video analysis completed. Length: {len(video_analysis)} characters")
        
        print("Step 2: Generating HTML/JavaScript game with SambaNova")
        
        game_generation_prompt = get_prompt('game_generation', video_analysis=video_analysis)
        system_prompt = get_prompt('system')
        
        sambanova_response = sambanova_client.chat.completions.create(
            model="DeepSeek-R1-0528",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": game_generation_prompt}
            ],
            temperature=0.1,
            top_p=0.1,
            max_tokens=8000
        )
        
        game_code = sambanova_response.choices[0].message.content
        print(f"Game code generated. Length: {len(game_code)} characters")
        
        if len(game_code) < 5000:
            print("⚠️ Generated HTML seems too short, might be incomplete")
        
        if not game_code.strip().endswith('</html>'):
            print("⚠️ Generated HTML doesn't end with </html>, will attempt to fix")
        
        html_content = clean_html_content(game_code)
        html_content = ensure_valid_html(html_content)
        
        html_file_path = save_html_file(html_content, video_id)
        
        current_time = time.time()
        game_data = {
            "video_id": video_id,
            "video_analysis": video_analysis,
            "html_content": html_content,
            "html_file_path": html_file_path,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(current_time)),
            "cached": False
        }
        
        save_game_cache(video_id, game_data)
        
        return jsonify({
            **game_data,
            "message": "Interactive HTML game generated and cached successfully"
        })
        
    except Exception as e:
        print(f"Error in two-step analysis: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/game/<video_id>', methods=['GET'])
def get_game_by_video_id(video_id):
    try:
        cached_game = load_game_cache(video_id)
        if cached_game:
            return jsonify({
                **cached_game,
                "message": "Game loaded from cache"
            })
        else:
            return jsonify({
                "error": "No game found for this video ID",
                "video_id": video_id,
                "suggestion": "Use POST /analyze to generate a game for this video"
            }), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/game/<video_id>/html', methods=['GET'])
def get_game_html_only(video_id):
    try:
        cached_game = load_game_cache(video_id)
        if cached_game and 'html_content' in cached_game:
            return cached_game['html_content'], 200, {'Content-Type': 'text/html'}
        else:
            return jsonify({
                "error": "No game HTML found for this video ID"
            }), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/games/cached', methods=['GET'])
def list_cached_games():
    try:
        cached_games = get_all_cached_games()
        return jsonify({
            "cached_games": cached_games,
            "total": len(cached_games),
            "cache_directory": CACHE_DIR
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/game/<video_id>/regenerate', methods=['POST'])
def regenerate_game(video_id):
    try:
        request_data = {"video_id": video_id, "regenerate": True}
        
        original_json = request.get_json
        request.get_json = lambda: request_data
        
        result = analyze_video()
        
        request.get_json = original_json
        
        return result
    except Exception as e:
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

@app.route('/prompts', methods=['GET'])
def list_prompts():
    try:
        prompt_files = {
            'analysis': ANALYSIS_PROMPT_FILE,
            'game_generation': GAME_GENERATION_PROMPT_FILE,
            'system': SYSTEM_PROMPT_FILE
        }
        
        prompt_info = {}
        for prompt_type, file_path in prompt_files.items():
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                prompt_info[prompt_type] = {
                    "file_path": file_path,
                    "length": len(content),
                    "exists": True
                }
            else:
                prompt_info[prompt_type] = {
                    "file_path": file_path,
                    "length": 0,
                    "exists": False
                }
        
        return jsonify({
            "prompts": prompt_info,
            "instructions_directory": INSTRUCTIONS_DIR
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/prompts/<prompt_type>', methods=['GET'])
def get_prompt_content(prompt_type):
    try:
        if prompt_type not in PROMPTS:
            return jsonify({"error": f"Prompt type '{prompt_type}' not found"}), 404
        
        return jsonify({
            "prompt_type": prompt_type,
            "content": PROMPTS[prompt_type],
            "length": len(PROMPTS[prompt_type])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/prompts/reload', methods=['POST'])
def reload_prompts_endpoint():
    try:
        new_prompts = reload_prompts()
        return jsonify({
            "message": "Prompts reloaded successfully",
            "prompts": list(new_prompts.keys()),
            "instructions_directory": INSTRUCTIONS_DIR
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
        "directories": {
            "games": GAMES_DIR,
            "cache": CACHE_DIR,
            "instructions": INSTRUCTIONS_DIR
        },
        "stats": {
            "html_files": len([f for f in os.listdir(GAMES_DIR) if f.endswith('.html')]) if os.path.exists(GAMES_DIR) else 0,
            "cached_games": len([f for f in os.listdir(CACHE_DIR) if f.endswith('.json')]) if os.path.exists(CACHE_DIR) else 0
        },
        "prompts_loaded": list(PROMPTS.keys()) if PROMPTS else []
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)