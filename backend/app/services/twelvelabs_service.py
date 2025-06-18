from twelvelabs import TwelveLabs
from flask import current_app

class TwelveLabsService:
    
    def __init__(self):
        self.client = TwelveLabs(api_key=current_app.config['TWELVELABS_API_KEY'])
    
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
            analysis_response = self.client.generate.text(
                video_id=video_id,
                prompt=prompt
            )
            return analysis_response.data
        except Exception as e:
            print(f"Error analyzing video {video_id}: {e}")
            raise e