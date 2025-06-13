from flask import Blueprint

def register_blueprints(app):
    
    from .api import api_bp
    from .game import game_bp
    from .admin import admin_bp
    
    app.register_blueprint(api_bp)
    app.register_blueprint(game_bp)
    app.register_blueprint(admin_bp)
    
    print("Blueprints registered, api, game, admin")