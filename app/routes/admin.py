import os
from flask import Blueprint, jsonify, current_app
from app.utils.decorators import handle_errors

admin_bp = Blueprint('admin', __name__)

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
    cache_count = 0
    
    if os.path.exists(config['GAMES_DIR']):
        games_count = len([f for f in os.listdir(config['GAMES_DIR']) if f.endswith('.html')])
    
    if os.path.exists(config['CACHE_DIR']):
        cache_count = len([f for f in os.listdir(config['CACHE_DIR']) if f.endswith('.json')])
    
    return jsonify({
        "status": "healthy",
        "services": {
            "twelvelabs": "connected" if config['TWELVELABS_API_KEY'] else "missing",
            "sambanova": "connected" if config['SAMBANOVA_API_KEY'] else "missing"
        },
        "directories": {
            "games": config['GAMES_DIR'],
            "cache": config['CACHE_DIR'],
            "instructions": config['INSTRUCTIONS_DIR']
        },
        "stats": {
            "html_files": games_count,
            "cached_games": cache_count
        },
        "prompts_loaded": list(current_app.prompt_service.prompts.keys())
    })