import os
from flask import Flask
from flask_cors import CORS
from config import config
import requests

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import atexit


def wake_up_app():
    try:
        app_url = os.getenv('APP_URL')
        if app_url:
            response = requests.get(app_url)
            if response.status_code == 200:
                print(f"Successfully pinged {app_url} at {datetime.now()}")
            else:
                print(f"Failed to ping {app_url} (status code: {response.status_code}) at {datetime.now()}")
        else:
            print("APP_URL environment variable not set.")
    except Exception as e:
        print(f"Error occurred while pinging app: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(wake_up_app, 'interval', minutes=9)
scheduler.start()


def create_app(config_name=None, *args, **kwargs):

    if config_name is not None and not isinstance(config_name, str):
        config_name = None
    
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'default')
    
    print(f"Creating Flask app with config, {config_name}")
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    CORS(app)
    
    config_errors = config[config_name].validate_config()
    if config_errors:
        for error in config_errors:
            print(f"Configuration error: {error}")
        if not app.config['DEBUG']:
            raise RuntimeError("Missing required configuration")
    
    _create_directories(app)
    _register_blueprints(app)
    _initialize_services(app)
    scheduler = BackgroundScheduler()
    scheduler.add_job(wake_up_app, 'interval', minutes=9)
    scheduler.start()
    
    print(f"Flask app created successfully")
    return app


def _create_directories(app):
    directories = [
        app.config['GAMES_DIR'],
        app.config['CACHE_DIR'],
        app.config['INSTRUCTIONS_DIR']
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Directory ensured: {directory}")

def _register_blueprints(app):
    from app.routes import register_blueprints
    register_blueprints(app)

def _initialize_services(app):
    from app.services.prompt_service import PromptService

    prompt_service = PromptService(app.config['INSTRUCTIONS_DIR'])
    app.prompt_service = prompt_service
    
    print(f"Application initialized with {len(prompt_service.prompts)} prompts loaded")

