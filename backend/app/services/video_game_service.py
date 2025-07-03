from flask import current_app
from app.services.twelvelabs_service import TwelveLabsService
from app.services.sambanova_service import SambanovaService
from app.services.sample_games_service import SampleGamesService
from app.services.file_service import FileService

class VideoGameService:
    
    def __init__(self):
        self.twelvelabs_service = TwelveLabsService()
        self.sambanova_service = SambanovaService()
        self.sample_games_service = SampleGamesService()
        self.file_service = FileService()
    
    def generate_game_from_video_id(self, video_id, force_regenerate=False):
        try:
            if not force_regenerate:
                existing_app = self.sample_games_service.find_by_video_id(video_id)
                if existing_app:
                    return {
                        "success": True,
                        "data": existing_app,
                        "cached": True,
                        "message": "Game loaded from sample games"
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
            
            print(f"Saving to sample games...")
            game_data = self.sample_games_service.create_game_data(
                video_id, video_analysis, html_file_path
            )
            self.sample_games_service.save_app(game_data)
            
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