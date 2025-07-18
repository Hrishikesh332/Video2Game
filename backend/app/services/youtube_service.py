import os
import yt_dlp
import tempfile
import time
from pathlib import Path
from flask import current_app

class YouTubeService:
    def __init__(self):
        self.temp_dir = tempfile.gettempdir()
    
    def download_video(self, url):
        if not url:
            return None, "No URL provided"
        
        try:
            downloads_dir = os.path.join(self.temp_dir, "youtube_downloads")
            os.makedirs(downloads_dir, exist_ok=True)
            
            ydl_opts = {
                'format': 'mp4/best',
                'outtmpl': os.path.join(downloads_dir, '%(title)s_%(id)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'ignoreerrors': True
            }

            # Add cookies.txt if present (for Render or restricted videos)
            possible_cookies_paths = [
                '/etc/secrets/cookies.txt',
                os.path.abspath(os.path.join(os.getcwd(), 'cookies.txt')),
                os.path.join(os.path.dirname(__file__), 'cookies.txt'),
                os.path.abspath(os.path.join(os.path.dirname(__file__), '../cookies.txt')),
                os.path.abspath(os.path.join(os.path.dirname(__file__), '../../cookies.txt')),
                os.path.abspath(os.path.join(os.getcwd(), 'backend/app/cookies.txt')),
            ]
            cookies_path = None
            for path in possible_cookies_paths:
                print(f"Checking for cookies.txt at: {path}")
                if os.path.exists(path):
                    # If the cookies file is in a read-only location, copy it to a writable temp dir
                    if path == '/etc/secrets/cookies.txt':
                        temp_cookies_path = os.path.join(self.temp_dir, 'cookies.txt')
                        try:
                            import shutil
                            shutil.copy(path, temp_cookies_path)
                            cookies_path = temp_cookies_path
                            print(f"Copied cookies.txt to writable location: {cookies_path}")
                        except Exception as e:
                            print(f"Failed to copy cookies.txt: {e}")
                            cookies_path = None
                    else:
                        cookies_path = path
                    break
            if cookies_path:
                ydl_opts['cookiefile'] = cookies_path
                print(f"Using cookies file: {cookies_path}")
            else:
                print("No cookies.txt file found; proceeding without cookies.")
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                try:
                    meta = ydl.extract_info(url, download=False)
                    if meta:
                        info = ydl.extract_info(url, download=True)
                        if info:
                            filename = ydl.prepare_filename(info)
                            if os.path.exists(filename):
                                title = info.get('title', 'Unknown Title')
                                duration = info.get('duration', 0)
                                print(f"Downloaded: {title} ({duration}s)")
                                return filename, title
                            
                            possible_extensions = ['.mp4', '.mkv', '.webm', '.avi']
                            base_filename = os.path.splitext(filename)[0]
                            for ext in possible_extensions:
                                test_file = base_filename + ext
                                if os.path.exists(test_file):
                                    title = info.get('title', 'Unknown Title')
                                    return test_file, title
                    
                    ydl_opts['format'] = 'best'
                    info = ydl.extract_info(url, download=True)
                    if info:
                        filename = ydl.prepare_filename(info)
                        if os.path.exists(filename):
                            title = info.get('title', 'Unknown Title')
                            return filename, title
                
                except Exception as e:
                    print(f"Download error: {str(e)}")
                    return None, f"Download failed: {str(e)}"
            
            return None, "Could not download video"
            
        except Exception as e:
            print(f"YouTube download error: {str(e)}")
            return None, str(e)
    
    def get_video_duration(self, file_path):
        try:
            try:
                from moviepy.editor import VideoFileClip
            except ImportError:
                try:
                    from moviepy import VideoFileClip
                except ImportError:
                    print("MoviePy not available, using ffprobe fallback")
                    return self._get_duration_ffprobe(file_path)
            
            clip = VideoFileClip(file_path)
            duration = clip.duration
            clip.close()
            return duration
        except Exception as e:
            print(f"Error getting video duration with moviepy: {str(e)}")
            return self._get_duration_ffprobe(file_path)
    
    # Fallback method to get duration using ffprobe"
    def _get_duration_ffprobe(self, file_path):

        try:
            import subprocess
            import json
            
            cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json',
                '-show_format', file_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                data = json.loads(result.stdout)
                duration = float(data['format']['duration'])
                return duration
        except Exception as e:
            print(f"Error getting duration with ffprobe: {str(e)}")
        
        print("Could not determine video duration, assuming 10 minutes")
        return 600  # 10 minutes
    
    def cleanup_file(self, file_path):
        try:
            if file_path and os.path.exists(file_path):
                os.remove(file_path)
                print(f"Cleaned up: {file_path}")
                
                parent_dir = os.path.dirname(file_path)
                if os.path.exists(parent_dir) and not os.listdir(parent_dir):
                    os.rmdir(parent_dir)
                    print(f"Removed empty directory: {parent_dir}")
                    
                return True
        except Exception as e:
            print(f"Cleanup error: {str(e)}")
        return False
    
    def validate_youtube_url(self, url):
        youtube_patterns = [
            'youtube.com/watch',
            'youtu.be/',
            'youtube.com/embed/',
            'youtube.com/v/',
            'm.youtube.com/watch'
        ]
        
        return any(pattern in url for pattern in youtube_patterns)