import os
import yt_dlp
import shutil
import time
from pathlib import Path
from flask import current_app

class YouTubeService:
    def __init__(self):
        # Use a dedicated downloads folder inside src
        self.downloads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'downloads')
        self.downloads_dir = os.path.abspath(self.downloads_dir)
        os.makedirs(self.downloads_dir, exist_ok=True)

    def _empty_downloads_dir(self):
        # Remove all files in the downloads directory
        for filename in os.listdir(self.downloads_dir):
            file_path = os.path.join(self.downloads_dir, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception as e:
                print(f'Failed to delete {file_path}. Reason: {e}')

    def download_video(self, url):
        if not url:
            return None, "No URL provided"
        try:
            # Ensure the downloads directory is empty before downloading
            self._empty_downloads_dir()
            os.makedirs(self.downloads_dir, exist_ok=True)

            ydl_opts = {
                'format': 'mp4/best',
                'outtmpl': os.path.join(self.downloads_dir, '%(title)s_%(id)s.%(ext)s'),
                'quiet': True,
                'no_warnings': True,
                'ignoreerrors': True,
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://www.youtube.com/'
                }
            }

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
            # After removing the file, empty the downloads directory
            self._empty_downloads_dir()
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