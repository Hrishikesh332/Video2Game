from flask import Blueprint, jsonify, request
from app.services.cache_service import CacheService
from app.services.file_service import FileService
from app.utils.decorators import handle_errors

game_bp = Blueprint('game', __name__)

@game_bp.route('/game/<video_id>', methods=['GET'])
@handle_errors
def get_game_by_video_id(video_id):
    cache_service = CacheService()
    cached_game = cache_service.load_game_cache(video_id)
    
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

@game_bp.route('/game/<video_id>/html', methods=['GET'])
@handle_errors
def get_game_html_only(video_id):
    cache_service = CacheService()
    cached_game = cache_service.load_game_cache(video_id)
    
    if cached_game and 'html_content' in cached_game:
        return cached_game['html_content'], 200, {'Content-Type': 'text/html'}
    else:
        return jsonify({
            "error": "No game HTML found for this video ID"
        }), 404

@game_bp.route('/game/<video_id>/regenerate', methods=['POST'])
@handle_errors
def regenerate_game(video_id):
    from app.routes.api import analyze_video
    
    original_json = request.get_json
    request.get_json = lambda: {"video_id": video_id, "regenerate": True}
    
    try:
        result = analyze_video()
        return result
    finally:
        request.get_json = original_json

@game_bp.route('/games/cached', methods=['GET'])
@handle_errors
def list_cached_games():
    cache_service = CacheService()
    cached_games = cache_service.get_all_cached_games()
    
    return jsonify({
        "cached_games": cached_games,
        "total": len(cached_games),
        "cache_directory": cache_service.cache_dir
    })

@game_bp.route('/games/list', methods=['GET'])
@handle_errors
def list_generated_games():
    file_service = FileService()
    games = file_service.list_generated_games()
    
    return jsonify({
        "games": games,
        "total": len(games),
        "games_directory": file_service.games_dir
    })

@game_bp.route('/games/open/<filename>', methods=['GET'])
@handle_errors
def open_game_file(filename):
    file_service = FileService()
    game_content = file_service.open_game_file(filename)
    
    if game_content:
        return jsonify(game_content)
    else:
        return jsonify({"error": "Game file not found"}), 404