from flask import Blueprint, jsonify, request, current_app
from app.services.twelvelabs_service import TwelveLabsService
from app.services.sambanova_service import SambanovaService
from app.services.sample_apps_service import SampleAppsService
from app.services.file_service import FileService
from app.utils.decorators import handle_errors

api_bp = Blueprint('api', __name__)

@api_bp.route('/indexes', methods=['GET'])
@handle_errors
def get_indexes():
    api_key = request.headers.get('X-Twelvelabs-Api-Key')
    twelvelabs_service = TwelveLabsService(api_key=api_key)
    indexes = twelvelabs_service.get_indexes()
    return jsonify({"indexes": indexes})

@api_bp.route('/indexes/<index_id>/videos', methods=['GET'])
@handle_errors
def get_videos(index_id):
    api_key = request.headers.get('X-Twelvelabs-Api-Key')
    twelvelabs_service = TwelveLabsService(api_key=api_key)
    videos = twelvelabs_service.get_videos(index_id)
    return jsonify({"videos": videos})

@api_bp.route('/analyze', methods=['POST'])
@handle_errors
def analyze_video():
    data = request.get_json()
    video_id = data.get('video_id')
    force_regenerate = data.get('regenerate', False)
    
    if not video_id:
        return jsonify({"error": "video_id is required"}), 400
    
    sample_apps_service = SampleAppsService()
    if not force_regenerate:
        existing_app = sample_apps_service.find_by_video_id(video_id)
        if existing_app:
            print(f"Using existing app for video: {video_id}")
            return jsonify({
                **existing_app,
                "cached": True,
                "message": "Game loaded from sample apps. Use 'regenerate': true to create a new version."
            })
    
    print(f"Analyzing video content with TwelveLabs, {video_id}")
    
    api_key = request.headers.get('X-Twelvelabs-Api-Key')
    twelvelabs_service = TwelveLabsService(api_key=api_key)
    analysis_prompt = current_app.prompt_service.get_prompt('analysis')
    video_analysis = twelvelabs_service.analyze_video(video_id, analysis_prompt)
    
    print(f"Video analysis completed. Length: {len(video_analysis)} characters")
    
    print("Generating Game with SambaNova")
    
    sambanova_service = SambanovaService()
    game_generation_prompt = current_app.prompt_service.get_prompt('game_generation', video_analysis=video_analysis)
    system_prompt = current_app.prompt_service.get_prompt('system')
    
    game_code = sambanova_service.generate_game(system_prompt, game_generation_prompt)
    print(f"Game code generated. Length: {len(game_code)} characters")
    
    file_service = FileService()
    html_content = file_service.process_html_content(game_code)
    html_file_path = file_service.save_html_file(html_content, video_id)
    
    game_data = sample_apps_service.create_game_data(video_id, video_analysis, html_content, html_file_path)
    sample_apps_service.save_app(game_data)
    
    return jsonify({
        **game_data,
        "message": "Interactive HTML game generated and saved to sample apps successfully"
    })

@api_bp.route('/youtube/process', methods=['POST'])
@handle_errors
def process_youtube_video():
    try:
        from app.services.youtube_indexing_service import YouTubeIndexingService
        
        data = request.get_json()
        youtube_url = data.get('youtube_url')
        index_id = data.get('index_id')
        force_regenerate = data.get('regenerate', False)
        
        if not youtube_url:
            return jsonify({"error": "youtube_url is required"}), 400
        
        youtube_service = YouTubeIndexingService()
        
        print(f"Processing YouTube URL: {youtube_url}")
        result = youtube_service.process_youtube_url(
            youtube_url=youtube_url,
            index_id=index_id,
            force_regenerate=force_regenerate
        )
        
        if result["success"]:
            return jsonify(result)
        else:
            return jsonify(result), 500
            
    except ImportError as e:
        return jsonify({
            "error": "YouTube processing service not available",
            "details": str(e),
            "solution": "Install required dependencies: pip install moviepy yt-dlp"
        }), 500
    except Exception as e:
        return jsonify({
            "error": "YouTube processing failed",
            "details": str(e)
        }), 500

@api_bp.route('/sample-apps', methods=['GET'])
@handle_errors
def get_sample_apps():
    sample_apps_service = SampleAppsService()
    apps = sample_apps_service.get_all_apps()
    return jsonify({
        "apps": apps,
        "total": len(apps)
    })

@api_bp.route('/sample-apps/stats', methods=['GET'])
@handle_errors
def get_sample_apps_stats():
    sample_apps_service = SampleAppsService()
    stats = sample_apps_service.get_stats()
    return jsonify(stats)

@api_bp.route('/sample-apps/youtube/<path:youtube_url>', methods=['GET'])
@handle_errors
def get_sample_app_by_youtube_url(youtube_url):
    sample_apps_service = SampleAppsService()
    app = sample_apps_service.find_by_youtube_url(youtube_url)
    
    if app:
        return jsonify({
            "success": True,
            "data": app,
            "message": "App found in sample apps"
        })
    else:
        return jsonify({
            "success": False,
            "error": "App not found",
            "message": "No app found for this YouTube URL"
        }), 404

@api_bp.route('/sample-apps/<cache_key>', methods=['DELETE'])
@handle_errors
def delete_sample_app(cache_key):
    sample_apps_service = SampleAppsService()
    success = sample_apps_service.delete_app(cache_key)
    
    if success:
        return jsonify({
            "success": True,
            "message": f"App {cache_key} deleted successfully"
        })
    else:
        return jsonify({
            "success": False,
            "error": "App not found",
            "message": f"No app found with cache key {cache_key}"
        }), 404