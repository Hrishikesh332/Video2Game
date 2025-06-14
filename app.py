import os
from app import create_app
from flask_cors import CORS
import requests

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import atexit


app = create_app()
CORS(app, resources={r"/*": {"origins": "*"}})


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

atexit.register(lambda: scheduler.shutdown())



if __name__ == '__main__':
    config_name = os.getenv('FLASK_ENV', 'development')
    
    if config_name == 'development':
        port = app.config.get('PORT', 5000)
        debug = app.config.get('DEBUG', True)
    else:
        port = app.config.get('PORT', 8000)
        debug = app.config.get('DEBUG', False)
    
    print(f"Starting Flask application in {config_name} mode")
    print(f"Server running on http://localhost:{port}")
    
    app.run(debug=debug, port=port)