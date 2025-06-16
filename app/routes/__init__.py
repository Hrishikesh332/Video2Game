from flask import Blueprint

def register_blueprints(app):
    from .api import api_bp
    from .game import game_bp
    from .admin import admin_bp
    
    app.register_blueprint(api_bp)
    app.register_blueprint(game_bp)
    app.register_blueprint(admin_bp)
    
    print("Blueprints registered - api, game, admin")

    print("Available routes")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.rule} [{', '.join(rule.methods)}]")