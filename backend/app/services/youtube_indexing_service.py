import os
import time
from flask import current_app
from app.services.twelvelabs_service import TwelveLabsService
from app.services.sambanova_service import SambanovaService
from app.services.youtube_service import YouTubeService
from app.services.video_chunking_service import VideoChunkingService
from app.services.sample_apps_service import SampleAppsService
from app.services.file_service import FileService

class YouTubeIndexingService:
    def __init__(self):
        self.youtube_service = YouTubeService()
        self.chunking_service = VideoChunkingService()
        self.twelvelabs_service = TwelveLabsService()
        self.sambanova_service = SambanovaService()
        self.sample_apps_service = SampleAppsService()
        self.file_service = FileService()
    
    def process_youtube_url(self, youtube_url, index_id=None, force_regenerate=False):
        video_file_path = None
        chunk_files = []
        
        try:
            if not self.youtube_service.validate_youtube_url(youtube_url):
                return {
                    "success": False,
                    "error": "Invalid YouTube URL provided",
                    "step": "validation"
                }
            
            if not force_regenerate:
                existing_app = self.sample_apps_service.find_by_youtube_url(youtube_url)
                if existing_app:
                    return {
                        "success": True,
                        "data": existing_app,
                        "cached": True,
                        "message": "Game loaded from sample apps"
                    }
            
            video_id_hash = self._generate_video_hash(youtube_url)
            
            print(f"Downloading video from YouTube: {youtube_url}")
            video_file_path, video_title = self.youtube_service.download_video(youtube_url)
            
            if not video_file_path:
                return {
                    "success": False,
                    "error": f"Failed to download video: {video_title}",
                    "step": "download"
                }
            
            print(f"Video downloaded successfully: {video_title}")
            
            if not index_id:
                indexes = self.twelvelabs_service.get_indexes()
                if not indexes:
                    return {
                        "success": False,
                        "error": "No TwelveLabs indexes available. Please create an index first.",
                        "step": "indexing_setup"
                    }
                index_id = indexes[0]["id"]
                print(f"Using first available index: {index_id}")
            
            print(f"Processing video for indexing (Index: {index_id})")
            
            duration = self.youtube_service.get_video_duration(video_file_path)
            max_duration = 59 * 60 
            
            video_ids = []
            
            if duration and duration > max_duration:
                print(f"Video duration ({duration/60:.1f} min) exceeds limit. Chunking required.")
                chunk_files = self.chunking_service.chunk_video(video_file_path, max_duration)
                
                if not chunk_files:
                    return {
                        "success": False,
                        "error": "Failed to chunk video",
                        "step": "chunking"
                    }
                
                print(f"Indexing {len(chunk_files)} video chunks")
                success_count = 0
                
                for i, chunk_path in enumerate(chunk_files):
                    print(f"Indexing chunk {i+1}/{len(chunk_files)}")
                    video_id = self._index_video_file(chunk_path, index_id)
                    
                    if video_id:
                        video_ids.append(video_id)
                        success_count += 1
                        print(f"Successfully indexed chunk {i+1}: {video_id}")
                    else:
                        print(f"Failed to index chunk {i+1}")
                
                if success_count == 0:
                    return {
                        "success": False,
                        "error": "Failed to index any video chunks",
                        "step": "indexing"
                    }
                
                print(f"Successfully indexed {success_count}/{len(chunk_files)} chunks")
                primary_video_id = video_ids[0]  # Use first chunk for game generation
                
            else:
                print(f"Video duration ({duration/60:.1f} min if duration else 'unknown') is within limits. Direct indexing.")
                primary_video_id = self._index_video_file(video_file_path, index_id)
                
                if not primary_video_id:
                    return {
                        "success": False,
                        "error": "Failed to index video with TwelveLabs",
                        "step": "indexing"
                    }
                
                video_ids = [primary_video_id]
                print(f"Video indexed successfully. Video ID: {primary_video_id}")
            
            print(f"Analyzing video content for game generation")
            analysis_prompt = current_app.prompt_service.get_prompt('analysis')
            video_analysis = self.twelvelabs_service.analyze_video(primary_video_id, analysis_prompt)
            
            print(f"Generating interactive game code")
            game_generation_prompt = current_app.prompt_service.get_prompt('game_generation', video_analysis=video_analysis)
            system_prompt = current_app.prompt_service.get_prompt('system')
            
            game_code = self.sambanova_service.generate_game(system_prompt, game_generation_prompt)
            
            print(f"Processing and saving HTML game")
            html_content = self.file_service.process_html_content(game_code)
            html_file_path = self.file_service.save_html_file(html_content, video_id_hash)
            
            print(f"Saving to sample apps")
            game_data = self.sample_apps_service.create_game_data(
                video_id_hash, video_analysis, html_content, html_file_path,
                youtube_url=youtube_url,
                video_title=video_title,
                twelvelabs_video_ids=video_ids,
                primary_video_id=primary_video_id,
                total_chunks=len(video_ids) if len(video_ids) > 1 else None
            )
            
            self.sample_apps_service.save_app(game_data)
            
            return {
                "success": True,
                "data": game_data,
                "cached": False,
                "message": f"YouTube video processed successfully. {'Chunked into ' + str(len(video_ids)) + ' parts' if len(video_ids) > 1 else 'Single video'} indexed and game generated."
            }
            
        except Exception as e:
            print(f"Error in YouTube processing pipeline: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "step": "processing"
            }
        
        finally:
            if video_file_path:
                self.youtube_service.cleanup_file(video_file_path)
                print(f"Cleaned up downloaded file: {video_file_path}")
            
            if chunk_files:
                self.chunking_service.cleanup_chunks(chunk_files)
                print(f"Cleaned up {len(chunk_files)} chunk files")
    
    def _index_video_file(self, file_path, index_id):
        try:
            task = self.twelvelabs_service.client.task.create(
                index_id=index_id,
                file=file_path,
            )
            
            print(f"Indexing task created: {task.id}")
            
            max_wait_time = 900 
            start_time = time.time()
            
            while time.time() - start_time < max_wait_time:
                task = self.twelvelabs_service.client.task.retrieve(task.id)
                
                if task.status == "ready":
                    print(f"Indexing completed successfully. Video ID: {task.video_id}")
                    return task.video_id
                elif task.status == "failed":
                    print(f"Indexing failed: {task.status}")
                    return None
                elif task.status in ["processing", "pending"]:
                    elapsed = int(time.time() - start_time)
                    print(f"Indexing in progress... Status: {task.status} (Elapsed: {elapsed}s)")
                    time.sleep(15)
                else:
                    print(f"Unknown status: {task.status}")
                    time.sleep(10)
            
            print("Indexing timed out")
            return None
            
        except Exception as e:
            print(f"Error during video indexing: {str(e)}")
            return None
    
    def _generate_video_hash(self, youtube_url):
        import hashlib
        return hashlib.md5(youtube_url.encode()).hexdigest()[:16]