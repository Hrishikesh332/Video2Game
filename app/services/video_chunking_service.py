import os
import math
import tempfile
import shutil

class VideoChunkingService:
    def __init__(self):
        self.temp_dir = tempfile.gettempdir()
    
    def chunk_video(self, input_path, chunk_duration=59*60):
        try:
            try:
                from moviepy.editor import VideoFileClip
            except ImportError:
                try:
                    from moviepy import VideoFileClip
                except ImportError:
                    print("MoviePy not available, cannot chunk video")
                    return [input_path]
            
            chunks_dir = os.path.join(os.path.dirname(input_path), "chunks")
            os.makedirs(chunks_dir, exist_ok=True)
            
            print("Analyzing video file...")
            
            video = VideoFileClip(input_path)
            total_duration = video.duration
            video.close()
            
            num_chunks = math.ceil(total_duration / chunk_duration)
            
            if num_chunks <= 1:
                print("Video is already within time limit. No chunking needed.")
                return [input_path]
                
            print(f"Chunking Plan")
            print(f"Video Duration: {total_duration/60:.1f} minutes")
            print(f"Chunk Duration: {chunk_duration/60:.1f} minutes")
            print(f"Total Chunks: {num_chunks}")
                
            chunk_files = []
            base_name = os.path.splitext(os.path.basename(input_path))[0]
            
            for i in range(num_chunks):
                start_time = i * chunk_duration
                end_time = min((i + 1) * chunk_duration, total_duration)
                
                print(f"Creating chunk {i+1}/{num_chunks}: {start_time/60:.1f} - {end_time/60:.1f} minutes")
                
                chunk_path = os.path.join(chunks_dir, f"{base_name}_chunk_{i+1}.mp4")
                
                with VideoFileClip(input_path) as video:
                    new_clip = video.subclip(start_time, end_time)
                    new_clip.write_videofile(
                        chunk_path, 
                        codec="libx264",
                        audio_codec="aac",
                        temp_audiofile=os.path.join(tempfile.gettempdir(), f"temp_audio_{i}.m4a"),
                        remove_temp=True,
                        verbose=False,
                        logger=None
                    )
                
                chunk_files.append(chunk_path)
                print(f"Chunk {i+1}/{num_chunks} completed")
                
            print(f"Video chunking complete, Created {len(chunk_files)} chunks.")
                
            return chunk_files
            
        except Exception as e:
            print(f"Error during chunking: {str(e)}")
            print("Falling back to original file without chunking")
            return [input_path]
    
    def cleanup_chunks(self, chunk_files):
        for chunk_file in chunk_files:
            try:
                if os.path.exists(chunk_file):
                    os.remove(chunk_file)
                    print(f"Cleaned up chunk: {chunk_file}")
            except Exception as e:
                print(f"Error cleaning up chunk {chunk_file}: {str(e)}")
        
        # Clean up chunks directory
        if chunk_files:
            chunks_dir = os.path.dirname(chunk_files[0])
            try:
                if os.path.exists(chunks_dir) and not os.listdir(chunks_dir):
                    shutil.rmtree(chunks_dir)
                    print(f"Removed chunks directory: {chunks_dir}")
            except Exception as e:
                print(f"Error removing chunks directory: {str(e)}")