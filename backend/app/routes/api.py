from flask import Blueprint, jsonify, request, current_app, Response, stream_with_context
from app.services.twelvelabs_service import TwelveLabsService
from app.services.sambanova_service import SambanovaService
from app.services.sample_games_service import SampleGamesService
from app.services.file_service import FileService
from app.utils.decorators import handle_errors

api_bp = Blueprint('api', __name__)

@api_bp.route('/indexes', methods=['GET'])
@handle_errors
def get_indexes():
    api_key = request.headers.get('X-Twelvelabs-Api-Key')
    twelvelabs_service = TwelveLabsService(api_key=api_key)
    indexes = twelvelabs_service.get_indexes()
    return jsonify({"indexes": indexes})

@api_bp.route('/indexes/<index_id>/videos', methods=['GET'])
@handle_errors
def get_videos(index_id):
    api_key = request.headers.get('X-Twelvelabs-Api-Key')
    twelvelabs_service = TwelveLabsService(api_key=api_key)
    videos = twelvelabs_service.get_videos(index_id)
    return jsonify({"videos": videos})

@api_bp.route('/analyze', methods=['POST'])
@handle_errors
def analyze_video():
    data = request.get_json()
    video_id = data.get('video_id')
    force_regenerate = data.get('regenerate', False)
    
    if not video_id:
        return jsonify({"error": "video_id is required"}), 400
    
    sample_games_service = SampleGamesService()
    if not force_regenerate:
        existing_app = sample_games_service.find_by_video_id(video_id)
        if existing_app:
            print(f"Using existing app for video: {video_id}")
            return jsonify({
                **existing_app,
                "cached": True,
                "message": "Game loaded from sample apps. Use 'regenerate': true to create a new version."
            })
    
    print(f"Analyzing video content with TwelveLabs, {video_id}")
    
    api_key = request.headers.get('X-Twelvelabs-Api-Key')
    twelvelabs_service = TwelveLabsService(api_key=api_key)
    analysis_prompt = current_app.prompt_service.get_prompt('analysis')
    video_analysis = twelvelabs_service.analyze_video(video_id, analysis_prompt)
    
    print(f"Video analysis completed. Length: {len(video_analysis)} characters")
    
    print("Generating Game with SambaNova")
    
    sambanova_service = SambanovaService()
    game_generation_prompt = current_app.prompt_service.get_prompt('game_generation', video_analysis=video_analysis)
    system_prompt = current_app.prompt_service.get_prompt('system')
    
    game_code = sambanova_service.generate_game(system_prompt, game_generation_prompt)
    print(f"Game code generated. Length: {len(game_code)} characters")
    
    file_service = FileService()
    html_content = file_service.process_html_content(game_code)
    html_file_path = file_service.save_html_file(html_content, video_id)
    
    game_data = sample_games_service.create_game_data(
        video_id,
        video_analysis,
        html_file_path,
        twelvelabs_video_ids=data.get('twelvelabs_video_ids', []),
        youtube_url=data.get('youtube_url', ''),
        video_title=data.get('video_title', ''),
        channel_name=data.get('channel_name', ''),
        view_count=data.get('view_count', '')
    )
    sample_games_service.save_game(game_data)
    
    return jsonify({
        **game_data,
        "message": "Interactive HTML game generated and saved to sample apps successfully"
    })

@api_bp.route('/youtube/process', methods=['POST', 'GET'])
@handle_errors
def process_youtube_video():
    from app.services.youtube_indexing_service import YouTubeIndexingService

    def event_stream(youtube_url, index_id=None, force_regenerate=False):
        sample_games_service = SampleGamesService()
        youtube_service = YouTubeIndexingService()
        yield f"event: progress\ndata: Validating YouTube URL...\n\n"
        if not youtube_url:
            yield f"event: error\ndata: youtube_url is required\n\n"
            return
        if not youtube_service.youtube_service.validate_youtube_url(youtube_url):
            yield f"event: error\ndata: Invalid YouTube URL provided\n\n"
            return
        if not force_regenerate:
            existing_app = sample_games_service.find_by_youtube_url(youtube_url)
            if existing_app:
                yield f"event: done\ndata: [DONE]\n\n"
                return
        yield f"event: progress\ndata: Downloading video...\n\n"
        video_file_path, video_title = youtube_service.youtube_service.download_video(youtube_url)
        if not video_file_path:
            yield f"event: error\ndata: Failed to download video: {video_title}\n\n"
            return
        yield f"event: progress\ndata: Video downloaded. Indexing with TwelveLabs...\n\n"
        if not index_id:
            indexes = youtube_service.twelvelabs_service.get_indexes()
            if not indexes:
                yield f"event: error\ndata: No TwelveLabs indexes available. Please create an index first.\n\n"
                return
            index_id = indexes[0]["id"]
        duration = youtube_service.youtube_service.get_video_duration(video_file_path)
        max_duration = 59 * 60
        video_ids = []
        if duration and duration > max_duration:
            yield f"event: progress\ndata: Chunking video...\n\n"
            chunk_files = youtube_service.chunking_service.chunk_video(video_file_path, max_duration)
            if not chunk_files:
                yield f"event: error\ndata: Failed to chunk video\n\n"
                return
            for i, chunk_path in enumerate(chunk_files):
                yield f"event: progress\ndata: Indexing chunk {i+1}/{len(chunk_files)}...\n\n"
                video_id = youtube_service._index_video_file(chunk_path, index_id)
                if video_id:
                    video_ids.append(video_id)
                else:
                    yield f"event: error\ndata: Failed to index chunk {i+1}\n\n"
            if not video_ids:
                yield f"event: error\ndata: Failed to index any video chunks\n\n"
                return
            primary_video_id = video_ids[0]
        else:
            yield f"event: progress\ndata: Indexing video...\n\n"
            primary_video_id = youtube_service._index_video_file(video_file_path, index_id)
            if not primary_video_id:
                yield f"event: error\ndata: Failed to index video with TwelveLabs\n\n"
                return
            video_ids = [primary_video_id]
        yield f"event: progress\ndata: Analyzing video content...\n\n"
        analysis_prompt = current_app.prompt_service.get_prompt('analysis')
        video_analysis = youtube_service.twelvelabs_service.analyze_video(primary_video_id, analysis_prompt)
        yield f"event: analysis\ndata: {video_analysis}\n\n"
        yield f"event: progress\ndata: Generating game with SambaNova...\n\n"
        sambanova_service = youtube_service.sambanova_service
        game_generation_prompt = current_app.prompt_service.get_prompt('game_generation', video_analysis=video_analysis)
        system_prompt = current_app.prompt_service.get_prompt('system')
        try:
            streamed_html = ""
            for chunk in sambanova_service.generate_game_stream(system_prompt, game_generation_prompt):
                if chunk:
                    streamed_html += chunk
                    yield f"event: game_chunk\ndata: {chunk}\n\n"
            
            if streamed_html:
                file_service = youtube_service.file_service
                html_content = file_service.process_html_content(streamed_html)
                video_id_hash = youtube_service._generate_video_hash(youtube_url)
                html_file_path = file_service.save_html_file(html_content, video_id_hash)
                
                # Save to sample apps
                game_data = sample_games_service.create_game_data(
                    video_id_hash,
                    video_analysis,
                    html_file_path,
                    twelvelabs_video_ids=video_ids,
                    youtube_url=youtube_url,
                    video_title=video_title,
                    channel_name='',
                    view_count=''
                )
                sample_games_service.save_game(game_data)
                
        except Exception as e:
            yield f"event: error\ndata: Error streaming from SambaNova: {str(e)}\n\n"
            return
        yield f"event: done\ndata: [DONE]\n\n"

    if request.method == 'GET':
        youtube_url = request.args.get('youtube_url')
        index_id = request.args.get('index_id')
        force_regenerate = request.args.get('regenerate', 'false').lower() == 'true'
        return Response(stream_with_context(event_stream(youtube_url, index_id, force_regenerate)), mimetype='text/event-stream')
    else:
        data = request.get_json()
        youtube_url = data.get('youtube_url')
        index_id = data.get('index_id')
        force_regenerate = data.get('regenerate', False)
        if not youtube_url:
            return jsonify({"error": "youtube_url is required"}), 400
        youtube_service = YouTubeIndexingService()
        print(f"Processing YouTube URL: {youtube_url}")
        result = youtube_service.process_youtube_url(
            youtube_url=youtube_url,
            index_id=index_id,
            force_regenerate=force_regenerate
        )
        if result["success"]:
            return jsonify(result)
        else:
            return jsonify(result), 500

@api_bp.route('/sample-apps', methods=['GET'])
@handle_errors
def get_sample_apps():
    sample_games_service = SampleGamesService()

    data = sample_games_service._load_file()
    apps = list(data.values())
    return jsonify({
        "apps": apps,
        "total": len(apps)
    })

@api_bp.route('/sample-apps/stats', methods=['GET'])
@handle_errors
def get_sample_apps_stats():
    sample_games_service = SampleGamesService()
    stats = sample_games_service.get_stats()
    return jsonify(stats)

@api_bp.route('/sample-apps/youtube/<path:youtube_url>', methods=['GET'])
@handle_errors
def get_sample_app_by_youtube_url(youtube_url):
    sample_games_service = SampleGamesService()
    app = sample_games_service.find_by_youtube_url(youtube_url)
    
    if app:
        return jsonify({
            "success": True,
            "data": app,
            "message": "App found in sample apps"
        })
    else:
        return jsonify({
            "success": False,
            "error": "App not found",
            "message": "No app found for this YouTube URL"
        }), 404

@api_bp.route('/sample-apps/<cache_key>', methods=['DELETE'])
@handle_errors
def delete_sample_app(cache_key):
    sample_games_service = SampleGamesService()
    success = sample_games_service.delete_game(cache_key)
    
    if success:
        return jsonify({
            "success": True,
            "message": f"App {cache_key} deleted successfully"
        })
    else:
        return jsonify({
            "success": False,
            "error": "App not found",
            "message": f"No app found with cache key {cache_key}"
        }), 404

@api_bp.route('/youtube/regenerate', methods=['POST', 'GET'])
@handle_errors
def regenerate_from_indexed_video():
    from app.services.sample_games_service import SampleGamesService
    from app.services.twelvelabs_service import TwelveLabsService
    from app.services.sambanova_service import SambanovaService
    from app.services.file_service import FileService

    def event_stream(youtube_url):
        sample_games_service = SampleGamesService()
        app_entry = sample_games_service.find_by_youtube_url(youtube_url)

        video_id = None
        if app_entry:
            video_id = app_entry.get('video_id') or app_entry.get('primary_video_id')

        if app_entry and video_id:
            yield f"event: progress\ndata: Starting analysis with TwelveLabs...\n\n"
            twelvelabs_service = TwelveLabsService()
            analysis_prompt = current_app.prompt_service.get_prompt('analysis')
            video_analysis = twelvelabs_service.analyze_video(video_id, analysis_prompt)
            yield f"event: analysis\ndata: {video_analysis}\n\n"

            yield f"event: progress\ndata: Generating game with SambaNova...\n\n"
            sambanova_service = SambanovaService()
            game_generation_prompt = current_app.prompt_service.get_prompt('game_generation', video_analysis=video_analysis)
            system_prompt = current_app.prompt_service.get_prompt('system')

            try:
                streamed_html = ""
                for chunk in sambanova_service.generate_game_stream(system_prompt, game_generation_prompt):
                    if chunk:
                        streamed_html += chunk
                        yield f"event: game_chunk\ndata: {chunk}\n\n"
                
                if streamed_html:
                    file_service = FileService()
                    html_content = file_service.process_html_content(streamed_html)
                    html_file_path = file_service.save_html_file(html_content, video_id)

                    updated_game_data = sample_games_service.create_game_data(
                        video_id,
                        video_analysis,
                        html_file_path,
                        twelvelabs_video_ids=app_entry.get('twelvelabs_video_ids', []),
                        youtube_url=youtube_url,
                        video_title=app_entry.get('video_title', ''),
                        channel_name=app_entry.get('channel_name', ''),
                        view_count=app_entry.get('view_count', '')
                    )
                    sample_games_service.save_game(updated_game_data)
                    
            except Exception as e:
                yield f"event: error\ndata: Error streaming from SambaNova: {str(e)}\n\n"
                return

            yield f"event: done\ndata: [DONE]\n\n"
        else:
            yield f"event: error\ndata: No indexed video found for this YouTube URL.\n\n"

    if request.method == 'GET':
        youtube_url = request.args.get('youtube_url')
    else:
        data = request.get_json()
        youtube_url = data.get('youtube_url')

    if not youtube_url:
        return jsonify({"error": "youtube_url is required"}), 400

    return Response(stream_with_context(event_stream(youtube_url)), mimetype='text/event-stream')

@api_bp.route('/indexes/<index_id>/videos/<video_id>/details', methods=['GET'])
@handle_errors
def get_video_details(index_id, video_id):
    api_key = request.headers.get('X-Twelvelabs-Api-Key')
    twelvelabs_service = TwelveLabsService(api_key=api_key)
    details = twelvelabs_service.get_video_details(index_id, video_id)
    if details:
        return jsonify(details)
    else:
        return jsonify({'error': 'Failed to fetch video details'}), 404

@api_bp.route('/indexes/<index_id>/videos/<video_id>/thumbnail', methods=['GET'])
@handle_errors
def get_video_thumbnail(index_id, video_id):
    api_key = request.headers.get('X-Twelvelabs-Api-Key')
    twelvelabs_service = TwelveLabsService(api_key=api_key)
    thumbnail = twelvelabs_service.get_video_thumbnail(index_id, video_id)
    if thumbnail:
        return Response(thumbnail, mimetype='image/jpeg')
    else:
        return jsonify({'error': 'Failed to fetch video thumbnail'}), 404

@api_bp.route('/twelvelabs/regenerate', methods=['POST', 'GET'])
@handle_errors
def twelvelabs_regenerate():
    from app.services.sample_games_service import SampleGamesService
    from app.services.twelvelabs_service import TwelveLabsService
    from app.services.sambanova_service import SambanovaService
    from app.services.file_service import FileService

    def event_stream(video_id, api_key):
        sample_games_service = SampleGamesService()
        
        if not video_id:
            yield f"event: error\ndata: video_id is required\n\n"
            return
            
        if not api_key:
            yield f"event: error\ndata: API key is required\n\n"
            return

        try:
            yield f"event: progress\ndata: Starting analysis with TwelveLabs...\n\n"
            twelvelabs_service = TwelveLabsService(api_key=api_key)
            analysis_prompt = current_app.prompt_service.get_prompt('analysis')
            video_analysis = twelvelabs_service.analyze_video(video_id, analysis_prompt)
            yield f"event: analysis\ndata: {video_analysis}\n\n"

            yield f"event: progress\ndata: Generating game with SambaNova...\n\n"
            sambanova_service = SambanovaService()
            game_generation_prompt = current_app.prompt_service.get_prompt('game_generation', video_analysis=video_analysis)
            system_prompt = current_app.prompt_service.get_prompt('system')

            try:
                streamed_html = ""
                for chunk in sambanova_service.generate_game_stream(system_prompt, game_generation_prompt):
                    if chunk:
                        streamed_html += chunk
                        yield f"event: game_chunk\ndata: {chunk}\n\n"
                
                if streamed_html:
                    file_service = FileService()
                    html_content = file_service.process_html_content(streamed_html)
                    html_file_path = file_service.save_html_file(html_content, video_id)

                    game_data = sample_games_service.create_game_data(
                        video_id,
                        video_analysis,
                        html_file_path,
                        twelvelabs_video_ids=[video_id],
                        youtube_url='',
                        video_title=f'TwelveLabs Video {video_id}',
                        channel_name='TwelveLabs',
                        view_count='Generated'
                    )
                    sample_games_service.save_game(game_data)
                else:
                    yield f"event: error\ndata: No game content was generated\n\n"
                    return
                    
            except Exception as e:
                print(f"Error in SambaNova streaming: {str(e)}")
                yield f"event: error\ndata: Error streaming from SambaNova: {str(e)}\n\n"
                return

            yield f"event: done\ndata: [DONE]\n\n"
        except Exception as e:
            print(f"Error in TwelveLabs processing: {str(e)}")
            yield f"event: error\ndata: Error processing TwelveLabs video: {str(e)}\n\n"

    if request.method == 'GET':
        video_id = request.args.get('video_id')
        api_key = request.args.get('api_key')
    else:
        data = request.get_json()
        video_id = data.get('video_id')
        api_key = request.headers.get('X-Twelvelabs-Api-Key')

    if not video_id:
        return jsonify({"error": "video_id is required"}), 400

    return Response(stream_with_context(event_stream(video_id, api_key)), mimetype='text/event-stream')

@api_bp.route('/sample-apps/twelvelabs/<video_id>', methods=['GET'])
@handle_errors
def get_sample_app_by_twelvelabs_video_id(video_id):
    sample_games_service = SampleGamesService()
    app = sample_games_service.find_by_video_id(video_id)
    if app:
        return jsonify({
            "success": True,
            "data": app,
            "message": "App found in sample apps by video_id"
        })
    else:
        return jsonify({
            "success": False,
            "error": "App not found",
            "message": "No app found for this video_id"
        }), 404