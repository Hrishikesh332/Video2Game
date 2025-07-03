import os
import json
import time
import hashlib
from flask import current_app

class SampleGamesService:
    def __init__(self):
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
        data_dir = os.path.abspath(data_dir)
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        self.sample_games_file = os.path.join(data_dir, 'sample_games.json')
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        if not os.path.exists(self.sample_games_file):
            self._save_file({})

    def _load_file(self):
        try:
            with open(self.sample_games_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading sample games file: {e}")
            return {}

    def _save_file(self, data):
        try:
            with open(self.sample_games_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error saving sample games file: {e}")
            return False

    def get_all_games(self):
        data = self._load_file()
        if not data:
            return []
        games = []
        for video_id, game_data in data.items():
            games.append({
                "video_id": video_id,
                "youtube_url": game_data.get('youtube_url'),
                "video_title": game_data.get('video_title'),
                "created_at": game_data.get('created_at'),
                "cached_at": game_data.get('cached_at'),
                "has_html_file": bool(game_data.get('html_file_path')),
                "has_analysis": 'video_analysis' in game_data
            })
        games.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return games

    def find_by_video_id(self, video_id):
        data = self._load_file()
        return data.get(video_id)

    def find_by_youtube_url(self, youtube_url):
        data = self._load_file()
        for game in data.values():
            if game.get('youtube_url') == youtube_url:
                return game
        return None

    def save_game(self, game_data):
        data = self._load_file()
        video_id = game_data.get('video_id')
        if not video_id:
            return False
        game_data['cached_at'] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        # Only keep allowed fields
        allowed_fields = [
            "video_id", "video_analysis", "html_file_path", "created_at", "cached",
            "youtube_url", "video_title", "channel_name", "view_count", "cached_at"
        ]
        filtered_game_data = {k: v for k, v in game_data.items() if k in allowed_fields}
        data[video_id] = filtered_game_data
        return self._save_file(data)

    def delete_game(self, video_id):
        data = self._load_file()
        if video_id not in data:
            return False
        del data[video_id]
        return self._save_file(data)

    def create_game_data(self, video_id, video_analysis, html_file_path, **additional_data):
        current_time = time.time()
        game_data = {
            "video_id": video_id,
            "video_analysis": video_analysis,
            "html_file_path": html_file_path,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(current_time)),
            "cached": True,
            "youtube_url": additional_data.get('youtube_url', ''),
            "video_title": additional_data.get('video_title', ''),
            "channel_name": additional_data.get('channel_name', ''),
            "view_count": additional_data.get('view_count', ''),
            # cached_at will be set in save_game
        }
        return game_data

    def get_stats(self):
        data = self._load_file()
        return {
            "total_entries": len(data),
            "last_updated": max((g.get('cached_at', '') for g in data.values()), default=None)
        } 