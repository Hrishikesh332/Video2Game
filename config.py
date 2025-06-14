import os
from dotenv import load_dotenv

load_dotenv()

class Config:

    TWELVELABS_API_KEY = os.getenv("TWELVELABS_API_KEY")
    SAMBANOVA_API_KEY = os.getenv("SAMBANOVA_API_KEY")
    SAMBANOVA_BASE_URL = os.getenv("SAMBANOVA_BASE_URL")

    GAMES_DIR = "generated_games"
    CACHE_DIR = "game_cache"
    INSTRUCTIONS_DIR = "instructions"
    
    SAMBANOVA_BASE_URL = SAMBANOVA_BASE_URL
    SAMBANOVA_MODEL = "DeepSeek-R1-0528"
    
    GENERATION_TEMPERATURE = 0.3
    GENERATION_TOP_P = 0.8
    GENERATION_MAX_TOKENS = 16000
    
    MIN_HTML_LENGTH = 8000
    MAX_RETRIES = 3 
    
    REQUIRED_HTML_TAGS = ['', '', '', '']
    
    @classmethod
    def validate_config(cls):
        errors = []
        
        if not cls.TWELVELABS_API_KEY:
            errors.append("TWELVELABS_API_KEY not found in environment variables")
        
        if not cls.SAMBANOVA_API_KEY:
            errors.append("SAMBANOVA_API_KEY not found in environment variables")
        
        return errors

class DevelopmentConfig(Config):
    DEBUG = True
    PORT = 5000

class ProductionConfig(Config):
    DEBUG = False
    PORT = 8000

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}