import os
import time
from flask import current_app
from app.utils.html_utils import clean_html_content, ensure_valid_html

class FileService:
    
    def __init__(self):
        self.games_dir = current_app.config['GAMES_DIR']
    
    def process_html_content(self, raw_html):
        html_content = clean_html_content(raw_html)
        html_content = ensure_valid_html(html_content)
        return html_content
    
    def save_html_file(self, html_content, video_id):
        try:
            filename = f"video_game_{video_id}_{int(time.time())}.html"
            file_path = os.path.join(self.games_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"HTML game saved to: {file_path}")
            return file_path
        except Exception as e:
            print(f"Error saving HTML file: {e}")
            return None
    
    def list_generated_games(self):
        try:
            games = []
            if os.path.exists(self.games_dir):
                for filename in os.listdir(self.games_dir):
                    if filename.endswith('.html'):
                        file_path = os.path.join(self.games_dir, filename)
                        file_stats = os.stat(file_path)
                        games.append({
                            "filename": filename,
                            "path": file_path,
                            "size": file_stats.st_size,
                            "created": file_stats.st_ctime
                        })
            
            games.sort(key=lambda x: x['created'], reverse=True)
            return games
            
        except Exception as e:
            print(f"Error listing generated games: {e}")
            return []
    
    def open_game_file(self, filename):
        try:
            file_path = os.path.join(self.games_dir, filename)
            
            if not os.path.exists(file_path):
                return None
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {
                "filename": filename,
                "content": content,
                "path": file_path
            }
            
        except Exception as e:
            print(f"Error opening game file {filename}, {e}")
            return None