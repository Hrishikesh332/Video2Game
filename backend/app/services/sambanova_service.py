from openai import OpenAI
from flask import current_app
import time
import requests
import sys

class SambanovaService:
    def __init__(self):
        self.client = OpenAI(
            api_key=current_app.config['SAMBANOVA_API_KEY'],
            base_url=current_app.config['SAMBANOVA_BASE_URL'],
            timeout=60.0  # Add timeout to prevent hanging
        )
        print(f"🔧 SambanovaService initialized with:")
        print(f"   Base URL: {current_app.config['SAMBANOVA_BASE_URL']}")
        print(f"   Model: {current_app.config['SAMBANOVA_MODEL']}")
        print(f"   API Key: {current_app.config['SAMBANOVA_API_KEY'][:10]}...")
        print(f"   Timeout: 60 seconds")
    
    def _test_api_connection(self):
        """Test if the Sambanova API is reachable"""
        try:
            print("🔍 Testing Sambanova API connection...")
            response = requests.get(
                f"{current_app.config['SAMBANOVA_BASE_URL']}/models",
                headers={"Authorization": f"Bearer {current_app.config['SAMBANOVA_API_KEY']}"},
                timeout=10
            )
            print(f"✅ API connection test: {response.status_code}")
            return response.status_code == 200
        except Exception as e:
            print(f"❌ API connection test failed: {e}")
            return False
    
    def generate_game(self, system_prompt, user_prompt):
        max_retries = current_app.config.get('MAX_RETRIES', 3)
        game_code = ""

        # Test API connection first
        if not self._test_api_connection():
            raise Exception("Sambanova API is not reachable")

        for attempt in range(max_retries):
            try:
                print(f"🚀 Generation attempt {attempt + 1}/{max_retries}")
                print(f"📝 System prompt length: {len(system_prompt)} chars")
                print(f"📝 User prompt length: {len(user_prompt)} chars")
                
                start_time = time.time()
                response = self.client.chat.completions.create(
                    model=current_app.config['SAMBANOVA_MODEL'],
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=current_app.config['GENERATION_TEMPERATURE'],
                    top_p=current_app.config['GENERATION_TOP_P'],
                    max_tokens=current_app.config['GENERATION_MAX_TOKENS'],
                    stream=True
                )
                
                print(f"⏱️ API call initiated in {time.time() - start_time:.2f}s")
                
                # FIX: Collect streamed content properly
                game_code = ""
                chunk_count = 0
                last_chunk_time = time.time()
                
                for chunk in response:
                    current_time = time.time()
                    if current_time - last_chunk_time > 30:  # 30 second timeout
                        print(f"⚠️ No chunk received for 30 seconds, breaking...")
                        break
                    
                    delta = getattr(chunk.choices[0], 'delta', None)
                    content = getattr(delta, 'content', '') if delta else ''
                    if content:
                        game_code += content
                        chunk_count += 1
                        last_chunk_time = current_time
                        # Print live streaming progress
                        if chunk_count % 10 == 0:  # Print every 10 chunks
                            print(f"📝 Received {chunk_count} chunks, current length: {len(game_code)} chars")
                
                print(f"📊 Total chunks received: {chunk_count}, final length: {len(game_code)} chars")
                print(f"⏱️ Total generation time: {time.time() - start_time:.2f}s")
                
                if self._validate_html_completeness(game_code):
                    print(f"✅ Valid HTML generated on attempt {attempt + 1}")
                    return game_code
                else:
                    print(f"⚠️ Incomplete HTML on attempt {attempt + 1}, retrying...")
                    if attempt < max_retries - 1:
                        time.sleep(2) 
                        continue
                
            except Exception as e:
                print(f"❌ Generation error on attempt {attempt + 1}: {e}")
                print(f"❌ Error type: {type(e).__name__}")
                if hasattr(e, 'response'):
                    print(f"❌ Response status: {e.response.status_code}")
                    print(f"❌ Response text: {e.response.text}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                else:
                    raise e
        
        print("⚠️ All generation attempts completed, using best result")
        return game_code
    
    def _validate_html_completeness(self, html_content):
        required_tags = current_app.config.get('REQUIRED_HTML_TAGS', [
            '<html>', '<head>', '<body>', '</html>'
        ])
        
        if len(html_content) < current_app.config.get('MIN_HTML_LENGTH', 8000):
            print(f"❌ HTML too short: {len(html_content)} characters")
            return False

        missing_tags = [tag for tag in required_tags if tag not in html_content]
        if missing_tags:
            print(f"❌ Missing required tags: {missing_tags}")
            return False

        if not html_content.strip().endswith('</html>'):
            print("❌ HTML doesn't end with </html>")
            return False
        
        print("✅ HTML validation passed")
        return True

    def generate_game_stream(self, system_prompt, user_prompt):
        print("🎬 Starting streaming generation...")
        print(f"📝 System prompt length: {len(system_prompt)} chars")
        print(f"📝 User prompt length: {len(user_prompt)} chars")
        
        # Test API connection first
        if not self._test_api_connection():
            yield "Error: Sambanova API is not reachable"
            return
        
        try:
            start_time = time.time()
            response = self.client.chat.completions.create(
                model=current_app.config['SAMBANOVA_MODEL'],
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=current_app.config['GENERATION_TEMPERATURE'],
                top_p=current_app.config['GENERATION_TOP_P'],
                max_tokens=current_app.config['GENERATION_MAX_TOKENS'],
                stream=True
            )
            
            print(f"⏱️ API call initiated in {time.time() - start_time:.2f}s")
            
            chunk_count = 0
            total_content = ""
            last_chunk_time = time.time()
            
            for chunk in response:
                current_time = time.time()
                if current_time - last_chunk_time > 30:  # 30 second timeout
                    print(f"⚠️ No chunk received for 30 seconds, breaking...")
                    break
                
                delta = getattr(chunk.choices[0], 'delta', None)
                content = getattr(delta, 'content', '') if delta else ''
                if content:
                    chunk_count += 1
                    total_content += content
                    last_chunk_time = current_time
                    
                    # Print live streaming progress
                    if chunk_count % 20 == 0:  # Print every 20 chunks
                        print(f"📡 Stream: {chunk_count} chunks, {len(total_content)} chars")
                    
                    yield content
            
            print(f"🎯 Streaming completed: {chunk_count} chunks, {len(total_content)} total chars")
            print(f"⏱️ Total streaming time: {time.time() - start_time:.2f}s")
            
        except Exception as e:
            error_msg = f"❌ Streaming error: {str(e)}"
            print(error_msg)
            print(f"❌ Error type: {type(e).__name__}")
            if hasattr(e, 'response'):
                print(f"❌ Response status: {e.response.status_code}")
                print(f"❌ Response text: {e.response.text}")
            yield error_msg