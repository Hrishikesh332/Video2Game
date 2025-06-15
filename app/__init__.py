import os
from flask import Flask
from flask_cors import CORS
from config import config

def create_app(config_name=None, *args, **kwargs):
    
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'default')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    CORS(app)
    
    config_errors = config[config_name].validate_config()
    if config_errors:
        for error in config_errors:
            print(f"{error}")
        if not app.config['DEBUG']:
            raise RuntimeError("Missing required configuration")
    
    _create_directories(app)
    _register_blueprints(app)
    _initialize_services(app)
    
    return app

def _create_directories(app):
    directories = [
        app.config['GAMES_DIR'],
        app.config['CACHE_DIR'],
        app.config['INSTRUCTIONS_DIR']
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"📁 Directory ensured: {directory}")

def _register_blueprints(app):
    from app.routes import register_blueprints
    register_blueprints(app)

def _initialize_services(app):
    from app.services.prompt_service import PromptService

    prompt_service = PromptService(app.config['INSTRUCTIONS_DIR'])
    app.prompt_service = prompt_service
    
    print(f"🚀 Application initialized with {len(prompt_service.prompts)} prompts loaded")