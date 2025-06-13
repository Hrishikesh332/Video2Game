import os
from app import create_app

app = create_app()

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