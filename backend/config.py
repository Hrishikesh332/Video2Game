import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    TWELVELABS_API_KEY = os.getenv("TWELVELABS_API_KEY")
    SAMBANOVA_API_KEY = os.getenv("SAMBANOVA_API_KEY")
    TWELVELABS_INDEX_ID = os.getenv("TWELVELABS_INDEX_ID")
    SAMBANOVA_BASE_URL=os.getenv("SAMBANOVA_BASE_URL")
    
    GAMES_DIR = "generated_games"
    CACHE_DIR = "game_cache"
    INSTRUCTIONS_DIR = "instructions"
    
    SAMBANOVA_BASE_URL = SAMBANOVA_BASE_URL
    SAMBANOVA_MODEL = "DeepSeek-R1-Distill-Llama-70B"
    
    GENERATION_TEMPERATURE = 0.1
    GENERATION_TOP_P = 0.1
    GENERATION_MAX_TOKENS = 32000
    
    MIN_HTML_LENGTH = 5000
    
    @classmethod
    def validate_config(cls):
        errors = []
        if not cls.TWELVELABS_API_KEY:
            errors.append("TWELVELABS_API_KEY not found")
        if not cls.SAMBANOVA_API_KEY:
            errors.append("SAMBANOVA_API_KEY not found")
        if not cls.TWELVELABS_INDEX_ID:
            errors.append("TWELVELABS_INDEX_ID not found")
        return errors

class ProductionConfig(Config):
    DEBUG = False
    PORT = 8000

config = {
    'production': ProductionConfig,
    'default': ProductionConfig
}