from twelvelabs import TwelveLabs
from flask import current_app
import requests
import sys

class TwelveLabsService:
    
    def __init__(self, api_key=None):
        if api_key is None:
            api_key = current_app.config['TWELVELABS_API_KEY']
        self.client = TwelveLabs(api_key=api_key)
    
    def get_indexes(self):
        try:
            print("Fetching indexes...")
            indexes = self.client.index.list()
            print(f"Raw response type: {type(indexes)}")
            
            result = []
            if hasattr(indexes, 'data'):
                index_list = indexes.data
                print("Using .data attribute")
            else:
                index_list = indexes
                print("Using direct response")
                
            for index in index_list:
                result.append({
                    "id": index.id,
                    "name": index.name
                })
            return result
        except Exception as e:
            print(f"Error fetching indexes: {e}")
            raise e
    
    def get_videos(self, index_id):
        try:
            videos = self.client.index.video.list(index_id=index_id)
            result = []
            
            if hasattr(videos, 'data'):
                video_list = videos.data
            else:
                video_list = videos
                
            for video in video_list:
                result.append({
                    "id": video.id,
                    "name": getattr(video.metadata, 'filename', f'Video {video.id}') if hasattr(video, 'metadata') else f'Video {video.id}',
                    "duration": getattr(video.metadata, 'duration', 0) if hasattr(video, 'metadata') else 0
                })
            return result
        except Exception as e:
            print(f"Error fetching videos for index {index_id}: {e}")
            raise e
    
    def analyze_video(self, video_id, prompt):
        try:
            analysis_response = self.client.analyze(
                video_id=video_id,
                prompt=prompt
            )
            return analysis_response.data
        except Exception as e:
            print(f"Error analyzing video {video_id}: {e}")
            raise e

    def get_video_details(self, index_id, video_id):
        if not hasattr(self, 'client') or not getattr(self, 'client', None):
            return None
        api_key = self.client.api_key if hasattr(self.client, 'api_key') else None
        if not api_key:
            return None
        url = f"https://api.twelvelabs.io/v1.3/indexes/{index_id}/videos/{video_id}?embed=false"
        headers = {
            "accept": "application/json",
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Failed to get video details: Status {response.status_code}")
                return None
        except Exception as e:
            print(f"Exception getting video details: {str(e)}")
            return None

    def get_video_thumbnail(self, index_id, video_id):
        if not hasattr(self, 'client') or not getattr(self, 'client', None):
            print("[DEBUG] No client available", file=sys.stderr)
            return None
        api_key = self.client.api_key if hasattr(self.client, 'api_key') else None
        if not api_key:
            print("[DEBUG] No API key available", file=sys.stderr)
            return None
        url = f"https://api.twelvelabs.io/v1.3/indexes/{index_id}/videos/{video_id}/thumbnail"
        headers = {
            "accept": "application/json",
            "x-api-key": api_key
        }
        try:
            response = requests.get(url, headers=headers)
            print(f"[DEBUG] Thumbnail endpoint content-type: {response.headers.get('Content-Type')}", file=sys.stderr)
            if response.status_code != 200:
                print(f"[DEBUG] Thumbnail endpoint returned status {response.status_code}: {response.text}", file=sys.stderr)
                return None
            data = response.json()
            if not isinstance(data, dict) or 'thumbnail' not in data:
                print(f"[DEBUG] Unexpected thumbnail response: {data}", file=sys.stderr)
                return None
            thumbnail_url = data.get('thumbnail')
            print(f"[DEBUG] Extracted thumbnail URL: {thumbnail_url}", file=sys.stderr)
            if thumbnail_url:
                img_resp = requests.get(thumbnail_url)
                print(f"[DEBUG] Image fetch status: {img_resp.status_code}", file=sys.stderr)
                if img_resp.status_code == 200:
                    print(f"[DEBUG] Image fetch successful, bytes: {len(img_resp.content)}", file=sys.stderr)
                    return img_resp.content
                else:
                    print(f"[DEBUG] Failed to fetch actual thumbnail image: {img_resp.status_code}", file=sys.stderr)
                    return None
            else:
                print("[DEBUG] No thumbnail URL in JSON response", file=sys.stderr)
                return None
        except Exception as e:
            print(f"[DEBUG] Exception getting thumbnail: {str(e)}", file=sys.stderr)
            return None