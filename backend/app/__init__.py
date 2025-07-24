import os
from flask import Flask
from flask_cors import CORS
from config import config

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
    _setup_scheduler(app)
    
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

def _setup_scheduler(app):
    """Setup APScheduler to prevent app from sleeping on free hosting platforms"""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        import requests
        import atexit
        
        def keep_alive():
            """Ping the app to prevent sleeping"""
            try:
                # Try to ping the app's health endpoint
                app_url = os.getenv('APP_URL', 'http://localhost:8000')
                response = requests.get(f"{app_url}/health", timeout=30)
                print(f"Keep-alive ping: {response.status_code}")
            except Exception as e:
                print(f"Keep-alive ping failed: {e}")
        
        # Only setup scheduler if not in development
        if not app.config.get('DEBUG', False):
            scheduler = BackgroundScheduler()
            
            # Ping every 9 minutes to prevent app sleeping
            scheduler.add_job(
                func=keep_alive,
                trigger="interval",
                minutes=9,
                id='keep_alive_job',
                name='Keep app alive',
                replace_existing=True
            )
            
            scheduler.start()
            print("APScheduler keep-alive started (pinging every 9 minutes)")
            
            # Shut down the scheduler when exiting the app
            atexit.register(lambda: scheduler.shutdown())
        else:
            print("APScheduler skipped in development mode")
            
    except ImportError:
        print("APScheduler not available - app may sleep on free hosting")
    except Exception as e:
        print(f"Failed to setup APScheduler: {e}")