import os
from flask import Blueprint, jsonify, current_app
from app.utils.decorators import handle_errors
from app.services.sample_games_service import SampleGamesService

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/', methods=['GET'])
@handle_errors
def index():
    return jsonify({
        "message": "Video to Game API",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "indexes": "/indexes",
            "analyze": "/analyze",
            "youtube_process": "/youtube/process",
            "sample_apps": "/sample-apps",
            "sample_apps_stats": "/sample-apps/stats",
            "prompts": "/prompts"
        }
    })

@admin_bp.route('/debug/routes', methods=['GET'])
@handle_errors
def debug_routes():
    routes = []
    for rule in current_app.url_map.iter_rules():
        routes.append({
            "endpoint": rule.endpoint,
            "methods": list(rule.methods),
            "rule": rule.rule
        })
    return jsonify({"routes": routes})

@admin_bp.route('/prompts', methods=['GET'])
@handle_errors
def list_prompts():
    prompt_service = current_app.prompt_service
    prompt_info = prompt_service.get_prompt_info()
    
    return jsonify({
        "prompts": prompt_info,
        "instructions_directory": prompt_service.instructions_dir
    })

@admin_bp.route('/prompts/<prompt_type>', methods=['GET'])
@handle_errors
def get_prompt_content(prompt_type):
    prompt_service = current_app.prompt_service
    
    if prompt_type not in prompt_service.prompts:
        return jsonify({"error": f"Prompt type '{prompt_type}' not found"}), 404
    
    return jsonify({
        "prompt_type": prompt_type,
        "content": prompt_service.prompts[prompt_type],
        "length": len(prompt_service.prompts[prompt_type])
    })

@admin_bp.route('/prompts/reload', methods=['POST'])
@handle_errors
def reload_prompts_endpoint():
    prompt_service = current_app.prompt_service
    prompt_service.reload_prompts()
    
    return jsonify({
        "message": "Prompts reloaded successfully",
        "prompts": list(prompt_service.prompts.keys()),
        "instructions_directory": prompt_service.instructions_dir
    })

@admin_bp.route('/health', methods=['GET'])
@handle_errors
def health_check():
    config = current_app.config
    
    games_count = 0
    sample_apps_count = 0
    
    if os.path.exists(config['GAMES_DIR']):
        games_count = len([f for f in os.listdir(config['GAMES_DIR']) if f.endswith('.html')])
    
    sample_games_service = SampleGamesService()
    sample_apps_stats = sample_games_service.get_stats()
    
    return jsonify({
        "status": "healthy",
        "services": {
            "twelvelabs": "connected" if config['TWELVELABS_API_KEY'] else "missing",
            "sambanova": "connected" if config['SAMBANOVA_API_KEY'] else "missing"
        },
        "configuration": {
            "index_id": config.get('TWELVELABS_INDEX_ID', 'not_configured'),
            "index_id_configured": bool(config.get('TWELVELABS_INDEX_ID'))
        },
        "directories": {
            "games": config['GAMES_DIR'],
            "cache": config['CACHE_DIR'],
            "instructions": config['INSTRUCTIONS_DIR']
        },
        "stats": {
            "html_files": games_count,
            "sample_apps": sample_apps_stats
        },
        "prompts_loaded": list(current_app.prompt_service.prompts.keys()),
        "features": {
            "youtube_processing": True,
            "video_indexing": True,
            "game_generation": True,
            "sample_apps": True
        }
    })

@admin_bp.route('/sample-apps', methods=['GET'])
@handle_errors
def get_sample_apps_admin():
    sample_games_service = SampleGamesService()
    apps = sample_games_service.get_all_games()
    return jsonify({
        "apps": apps,
        "total": len(apps)
    })

@admin_bp.route('/sample-apps/stats', methods=['GET'])
@handle_errors
def get_sample_apps_stats_admin():
    sample_games_service = SampleGamesService()
    stats = sample_games_service.get_stats()
    return jsonify(stats)