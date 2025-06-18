import os
import time
from flask import current_app
from app.utils.html_utils import clean_html_content, ensure_valid_html, validate_html_structure, add_fallback_game_structure

class FileService:
    
    def __init__(self):
        self.games_dir = current_app.config['GAMES_DIR']
    
    def process_html_content(self, raw_html):
        print("Processing HTML content...")
        
        html_content = clean_html_content(raw_html)
        
        issues = validate_html_structure(html_content)
        if issues:
            print(f"HTML validation issues found: {issues}")
        
        html_content = ensure_valid_html(html_content)
        
        if len(html_content) < current_app.config.get('MIN_HTML_LENGTH', 8000):
            print(f"⚠️ HTML still too short ({len(html_content)} chars), checking for fallback...")
            html_content = add_fallback_game_structure(html_content)

        final_issues = validate_html_structure(html_content)
        if not final_issues:
            print("HTML processing completed successfully")
        else:
            print(f"Remaining issues after processing: {final_issues}")
        
        return html_content
    
    def save_html_file(self, html_content, video_id):
        try:
            filename = f"video_game_{video_id}_{int(time.time())}.html"
            file_path = os.path.join(self.games_dir, filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            file_size = os.path.getsize(file_path)
            print(f"HTML game saved to: {file_path} ({file_size} bytes)")
            
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
            print(f"Error opening game file {filename}: {e}")
            return None