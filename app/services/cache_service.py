import os
import json
import time
from flask import current_app

class CacheService:
    
    def __init__(self):
        self.cache_dir = current_app.config['CACHE_DIR']
    
    def save_game_cache(self, video_id, game_data):
        try:
            cache_file = os.path.join(self.cache_dir, f"{video_id}.json")
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(game_data, f, ensure_ascii=False, indent=2)
            print(f"Game cached for video: {video_id}")
            return True
        except Exception as e:
            print(f"Error saving cache: {e}")
            return False
    
    def load_game_cache(self, video_id):
        try:
            cache_file = os.path.join(self.cache_dir, f"{video_id}.json")
            if os.path.exists(cache_file):
                with open(cache_file, 'r', encoding='utf-8') as f:
                    game_data = json.load(f)
                print(f"Found cached game for video: {video_id}")
                return game_data
            return None
        except Exception as e:
            print(f"Error loading cache: {e}")
            return None
    
    def get_all_cached_games(self):
        try:
            cached_games = []
            if os.path.exists(self.cache_dir):
                for filename in os.listdir(self.cache_dir):
                    if filename.endswith('.json'):
                        video_id = filename[:-5]
                        file_path = os.path.join(self.cache_dir, filename)
                        file_stats = os.stat(file_path)
                        
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                game_data = json.load(f)
                            
                            cached_games.append({
                                "video_id": video_id,
                                "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(file_stats.st_ctime)),
                                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(file_stats.st_mtime)),
                                "size": file_stats.st_size,
                                "has_html": "html_content" in game_data,
                                "has_analysis": "video_analysis" in game_data
                            })
                        except:
                            continue
            
            cached_games.sort(key=lambda x: x['created_at'], reverse=True)
            return cached_games
        except Exception as e:
            print(f"Error getting cached games: {e}")
            return []
    
    def create_game_data(self, video_id, video_analysis, html_content, html_file_path):
        current_time = time.time()
        return {
            "video_id": video_id,
            "video_analysis": video_analysis,
            "html_content": html_content,
            "html_file_path": html_file_path,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(current_time)),
            "cached": False
        }