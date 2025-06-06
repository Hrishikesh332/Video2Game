from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from twelvelabs import TwelveLabs
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

API_KEY = os.getenv("TWELVELABS_API_KEY")

if not API_KEY:
    print("TWELVELABS_API_KEY not found in .env file")
    exit(1)

client = TwelveLabs(api_key=API_KEY)

@app.route('/indexes', methods=['GET'])
def get_indexes():
    try:
        print("Fetching indexes...")
        indexes = client.index.list()
        print(f"Raw response type: {type(indexes)}")
        print(f"Raw response: {indexes}")
        
        result = []
        if hasattr(indexes, 'data'):
            index_list = indexes.data
            print("Using .data attribute")
        else:
            index_list = indexes
            print("Using direct response")
            
        print(f"Index list type: {type(index_list)}")
        
        for index in index_list:
            print(f"Processing index: {index}")
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
        videos = client.index.video.list(index_id=index_id)
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
        
        prompt = """
        Please analyze this video thoroughly and create the MOST SUITABLE interactive Python game based on the content type and topic.

        First, deeply understand the video:
        1. What is the main topic/theme? (sports, cooking, dance, education, nature, etc.)
        2. What type of content is this? (tutorial, performance, documentary, etc.)
        3. What are the key visual elements, actions, or concepts?
        4. What would be most engaging and educational for viewers?
        5. What learning outcomes would be most valuable?

        Then determine the BEST game type for this content

        FOR EDUCATIONAL/TUTORIAL VIDEOS - Create a step-by-step sequence game or concept matching
        FOR SPORTS/DANCE VIDEOS - Create movement sequence, timing game, or technique identification  
        FOR COOKING VIDEOS - Create ingredient matching, recipe sequence, or technique quiz
        FOR NATURE/DOCUMENTARY - Create ecosystem games, animal behavior matching, or fact exploration
        FOR ART/CREATIVE VIDEOS - Create color/shape games, technique identification, or creative challenges
        FOR MUSIC VIDEOS - Create rhythm games, instrument identification, or lyric interaction
        FOR TRAVEL/PLACES - Create geography games, landmark identification, or cultural trivia
        FOR STORY/NARRATIVE - Create character games, plot sequence, or dialogue interaction

        Game types to choose from:
        - Quiz Game: Multiple choice questions (good for factual content)
        - Memory Match: Pair matching of related concepts (good for learning associations)
        - Sequence Game: Arrange events/steps in order (perfect for tutorials/processes)
        - Drawing/Visual Game: Describe and guess visual elements (great for art/creative content)
        - Trivia Challenge: True/false with explanations (good for interesting facts)
        - Classification Game: Sort items into categories (perfect for educational content)
        - Timeline Game: Place events on a timeline (great for historical/process content)
        - Prediction Game: Guess what happens next (engaging for any narrative)
        - Spot the Difference: Find changes or details (perfect for observation skills)
        - Word Association: Connect concepts and vocabulary (great for language/concepts)

        Generate complete Python code with:
        1. Intelligent game selection based on video content
        2. 4-5 interactive challenges appropriate to the content
        3. Engaging mechanics that match the video topic
        4. Scoring system with meaningful feedback
        5. Educational value extraction from the video
        6. Interactive user experience with clear instructions
        7. Timestamps where relevant (format: MM:SS)
        8. Visual ASCII art or emojis where appropriate
        9. Multiple difficulty levels if suitable

        Make it a complete, polished game that someone would actually enjoy playing. The game should feel natural and perfectly suited to the specific video content you observe.

        Structure as a proper Python class with proper methods, error handling, and user experience design.
        """
        
        print(f"Analyzing video {video_id}")
        
        response = client.generate.text(
            video_id=video_id,
            prompt=prompt
        )
        
        return jsonify({
            "video_id": video_id,
            "game_code": response.data,
            "message": "Adaptive interactive Python game generated based on video content and topic"
        })
        
    except Exception as e:
        print(f"Error analyzing video: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("TwelveLabs API connected successfully")
    app.run(debug=True, port=5000)