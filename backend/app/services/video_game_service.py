from flask import current_app
from app.services.twelvelabs_service import TwelveLabsService
from app.services.sambanova_service import SambanovaService
from app.services.cache_service import CacheService
from app.services.file_service import FileService

class VideoGameService:
    
    def __init__(self):
        self.twelvelabs_service = TwelveLabsService()
        self.sambanova_service = SambanovaService()
        self.cache_service = CacheService()
        self.file_service = FileService()
    
    def generate_game_from_video_id(self, video_id, force_regenerate=False):
        try:
            if not force_regenerate:
                cached_game = self.cache_service.load_game_cache(video_id)
                if cached_game:
                    return {
                        "success": True,
                        "data": cached_game,
                        "cached": True,
                        "message": "Game loaded from cache"
                    }
            
            print(f"Generating game from video_id: {video_id}")

            print(f"Analyzing video content")
            analysis_prompt = current_app.prompt_service.get_prompt('analysis')
            video_analysis = self.twelvelabs_service.analyze_video(video_id, analysis_prompt)

            print(f"Generating interactive game code")
            game_generation_prompt = current_app.prompt_service.get_prompt('game_generation', video_analysis=video_analysis)
            system_prompt = current_app.prompt_service.get_prompt('system')
            
            game_code = self.sambanova_service.generate_game(system_prompt, game_generation_prompt)
            
            print(f"Processing and saving HTML game...")
            html_content = self.file_service.process_html_content(game_code)
            html_file_path = self.file_service.save_html_file(html_content, video_id)
            
            print(f"Caching results...")
            game_data = self.cache_service.create_game_data(
                video_id, video_analysis, html_content, html_file_path
            )
            self.cache_service.save_game_cache(video_id, game_data)
            
            return {
                "success": True,
                "data": game_data,
                "cached": False,
                "message": f"Game generated successfully from video_id: {video_id}"
            }
            
        except Exception as e:
            print(f"Error generating game from video_id {video_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "step": "game_generation"
            }