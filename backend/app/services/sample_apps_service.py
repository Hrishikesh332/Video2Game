import os
import json
import time
import hashlib
from flask import current_app

class SampleAppsService:
    
    def __init__(self):
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
        data_dir = os.path.abspath(data_dir)
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        self.sample_apps_file = os.path.join(data_dir, 'sample_apps.json')
        self._ensure_file_exists()
    
    def _ensure_file_exists(self):
        if not os.path.exists(self.sample_apps_file):
            initial_structure = {
                "metadata": {
                    "version": "1.0",
                    "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                    "total_entries": 0,
                    "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
                },
                "entries": {},
                "indexes": {
                    "youtube_urls": {},
                    "video_titles": {},
                    "video_ids": {},
                    "twelvelabs_video_ids": {}
                }
            }
            self._save_file(initial_structure)
    
    def _load_file(self):
        try:
            with open(self.sample_apps_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading sample apps file: {e}")
            return None
    
    def _save_file(self, data):
        try:
            if os.path.exists(self.sample_apps_file):
                backup_file = f"{self.sample_apps_file}.backup"
                with open(self.sample_apps_file, 'r', encoding='utf-8') as f:
                    backup_data = f.read()
                with open(backup_file, 'w', encoding='utf-8') as f:
                    f.write(backup_data)
            
            with open(self.sample_apps_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"Error saving sample apps file: {e}")
            return False
    
    def _generate_cache_key(self, youtube_url):
        return hashlib.md5(youtube_url.encode()).hexdigest()[:16]
    
    def find_by_youtube_url(self, youtube_url):
        data = self._load_file()
        if not data:
            return None
        
        cache_key = data['indexes']['youtube_urls'].get(youtube_url)
        if cache_key:
            return data['entries'].get(cache_key)
        return None
    
    def find_by_video_id(self, video_id):
        data = self._load_file()
        if not data:
            return None
        
        cache_key = data['indexes']['video_ids'].get(video_id)
        if cache_key:
            return data['entries'].get(cache_key)
        return None
    
    def find_by_twelvelabs_video_id(self, twelvelabs_video_id):
        data = self._load_file()
        if not data:
            return None
        
        cache_key = data['indexes']['twelvelabs_video_ids'].get(twelvelabs_video_id)
        if cache_key:
            return data['entries'].get(cache_key)
        return None
    
    def save_app(self, app_data):
        data = self._load_file()
        if not data:
            return False
        
        cache_key = None
        if 'youtube_url' in app_data:
            cache_key = self._generate_cache_key(app_data['youtube_url'])
        elif 'video_id' in app_data:
            cache_key = app_data['video_id']
        else:
            return False
        
        app_data['cache_key'] = cache_key
        app_data['cached_at'] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        
        data['entries'][cache_key] = app_data
        
        if 'youtube_url' in app_data:
            data['indexes']['youtube_urls'][app_data['youtube_url']] = cache_key
        
        if 'video_title' in app_data:
            data['indexes']['video_titles'][app_data['video_title']] = cache_key
        
        if 'video_id' in app_data:
            data['indexes']['video_ids'][app_data['video_id']] = cache_key
        
        if 'twelvelabs_video_ids' in app_data:
            for video_id in app_data['twelvelabs_video_ids']:
                data['indexes']['twelvelabs_video_ids'][video_id] = cache_key
        
        data['metadata']['total_entries'] = len(data['entries'])
        data['metadata']['last_updated'] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        
        return self._save_file(data)
    
    def get_all_apps(self):
        data = self._load_file()
        if not data:
            return []
        
        apps = []
        for cache_key, app_data in data['entries'].items():
            apps.append({
                "cache_key": cache_key,
                "video_id": app_data.get('video_id'),
                "youtube_url": app_data.get('youtube_url'),
                "video_title": app_data.get('video_title'),
                "created_at": app_data.get('created_at'),
                "cached_at": app_data.get('cached_at'),
                "has_html": 'html_content' in app_data,
                "has_analysis": 'video_analysis' in app_data
            })
        
        apps.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return apps
    
    def delete_app(self, cache_key):
        data = self._load_file()
        if not data or cache_key not in data['entries']:
            return False
        
        app_data = data['entries'][cache_key]
        
        del data['entries'][cache_key]
        
        if 'youtube_url' in app_data:
            data['indexes']['youtube_urls'].pop(app_data['youtube_url'], None)
        
        if 'video_title' in app_data:
            data['indexes']['video_titles'].pop(app_data['video_title'], None)
        
        if 'video_id' in app_data:
            data['indexes']['video_ids'].pop(app_data['video_id'], None)
        
        if 'twelvelabs_video_ids' in app_data:
            for video_id in app_data['twelvelabs_video_ids']:
                data['indexes']['twelvelabs_video_ids'].pop(video_id, None)
        
        data['metadata']['total_entries'] = len(data['entries'])
        data['metadata']['last_updated'] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        
        return self._save_file(data)
    
    def create_game_data(self, video_id, video_analysis, html_content, html_file_path, **additional_data):
        current_time = time.time()
        game_data = {
            "video_id": video_id,
            "video_analysis": video_analysis,
            "html_content": html_content,
            "html_file_path": html_file_path,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(current_time)),
            "cached": True
        }
        
        game_data.update(additional_data)
        
        return game_data
    
    def get_stats(self):
        data = self._load_file()
        if not data:
            return {
                "total_entries": 0,
                "total_youtube_urls": 0,
                "total_video_titles": 0,
                "total_video_ids": 0,
                "total_twelvelabs_video_ids": 0,
                "last_updated": None
            }
        
        return {
            "total_entries": data['metadata']['total_entries'],
            "total_youtube_urls": len(data['indexes']['youtube_urls']),
            "total_video_titles": len(data['indexes']['video_titles']),
            "total_video_ids": len(data['indexes']['video_ids']),
            "total_twelvelabs_video_ids": len(data['indexes']['twelvelabs_video_ids']),
            "last_updated": data['metadata']['last_updated']
        } 