from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from twelvelabs import TwelveLabs
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

TWELVELABS_API_KEY = os.getenv("TWELVELABS_API_KEY")
SAMBANOVA_API_KEY = os.getenv("SAMBANOVA_API_KEY")
SAMBANOVA_BASE_URL= os.getenv("SAMBANOVA_BASE_URL")

if not TWELVELABS_API_KEY:
    print("TWELVELABS_API_KEY not found in .env file")
    exit(1)

if not SAMBANOVA_API_KEY:
    print("SAMBANOVA_API_KEY not found in .env file")
    exit(1)

twelvelabs_client = TwelveLabs(api_key=TWELVELABS_API_KEY)

sambanova_client = OpenAI(
    api_key=SAMBANOVA_API_KEY,
    base_url=SAMBANOVA_BASE_URL,
)

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
        
        print(f"Analyzing video content with TwelveLabs {video_id}")
        
        analysis_prompt = """
        Analyze this video thoroughly and provide a detailed description including:
        
        1. **Main Topic/Theme**: What is this video about? (sports, cooking, dance, education, nature, etc.)
        2. **Content Type**: Tutorial, performance, documentary, entertainment, etc.
        3. **Key Elements**: Main characters, objects, actions, scenes, dialogue
        4. **Visual Details**: Colors, settings, movements, techniques shown
        5. **Educational Value**: What can viewers learn from this content?
        6. **Timestamps**: Key moments and their timings (format: MM:SS)
        7. **Engagement Points**: What would be most interesting to interact with?
        
        Provide a comprehensive analysis that would help create an engaging interactive game.
        """
        
        analysis_response = twelvelabs_client.generate.text(
            video_id=video_id,
            prompt=analysis_prompt
        )
        
        video_analysis = analysis_response.data
   
        game_generation_prompt = f"""
        Based on this video analysis, create a complete, HTML files, having the best visual and usage of the CSS and JS for actions also with the color of the grey and white, other colors if needed, into runnable game that's perfectly suited to the content:

        VIDEO ANALYSIS:
        {video_analysis}

        INSTRUCTIONS:
        1. **Choose the BEST game type** for this content from: quiz, memory match, sequence, drawing/visual, trivia, classification, timeline, prediction, spot-the-difference, word association
        
        2. **Create complete Python code** that includes -
           - Professional class structure
           - 3-4 interactive challenges based on the video content
           - Engaging mechanics that match the video topic
           - Scoring system with meaningful feedback
           - Clear instructions and user interface
           - Error handling and input validation
           - Timestamps where relevant
           - ASCII art or emojis for visual appeal
           - Replay functionality
        
        3. **Make it content-specific** - The game should feel natural and perfectly suited to this exact video content
        
        4. **Ensure it's runnable** - Complete, working Python code that can be executed immediately
        
        5. **Add educational value** - Extract meaningful learning from the video content
        
        Return ONLY the streamlit code, properly formatted and ready to run.
        """
        
        sambanova_response = sambanova_client.chat.completions.create(
            model="DeepSeek-R1-0528",
            messages=[
                {"role": "system", "content": "You are an expert Python game developer who creates engaging, educational games based on video content analysis."},
                {"role": "user", "content": game_generation_prompt}
            ],
            temperature=0.1,
            top_p=0.1
        )
        
        game_code = sambanova_response.choices[0].message.content
        print(f"Game code generated. Length: {len(game_code)} characters")
        
        return jsonify({
            "video_id": video_id,
            "video_analysis": video_analysis,
            "game_code": game_code,
            "message": "Adaptive interactive Python game generated using TwelveLabs analysis + SambaNova code generation"
        })
        
    except Exception as e:
        print(f"Error in two-step analysis: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "services": {
            "twelvelabs": "connected" if TWELVELABS_API_KEY else "missing",
            "sambanova": "connected" if SAMBANOVA_API_KEY else "missing"
        }
    })

if __name__ == '__main__':
    print("Starting App...")
    app.run(debug=True, port=5000)