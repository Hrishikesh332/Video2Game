from openai import OpenAI
from flask import current_app
import time

class SambanovaService:
    def __init__(self):
        self.client = OpenAI(
            api_key=current_app.config['SAMBANOVA_API_KEY'],
            base_url=current_app.config['SAMBANOVA_BASE_URL'],
        )
    
    def generate_game(self, system_prompt, user_prompt):
        max_retries = current_app.config.get('MAX_RETRIES', 3)
        
        for attempt in range(max_retries):
            try:
                print(f"Generation attempt {attempt + 1}/{max_retries}")
                
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
                
                game_code = response.choices[0].message.content
                
                if self._validate_html_completeness(game_code):
                    print(f"Valid HTML generated on attempt {attempt + 1}")
                    return game_code
                else:
                    print(f"⚠️ Incomplete HTML on attempt {attempt + 1}, retrying...")
                    if attempt < max_retries - 1:
                        time.sleep(2) 
                        continue
                
            except Exception as e:
                print(f"Generation error on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2)
                    continue
                else:
                    raise e
        
        print("All generation attempts completed, using best result")
        return game_code
    
    def _validate_html_completeness(self, html_content):
        required_tags = current_app.config.get('REQUIRED_HTML_TAGS', [
            '', '', '', ''
        ])
        
        if len(html_content) < current_app.config.get('MIN_HTML_LENGTH', 8000):
            print(f"HTML too short: {len(html_content)} characters")
            return False

        missing_tags = []
        for tag in required_tags:
            if tag not in html_content:
                missing_tags.append(tag)
        
        if missing_tags:
            print(f"Missing required tags: {missing_tags}")
            return False

        if not html_content.strip().endswith(''):
            print("HTML doesn't end with ")
            return False
        
        print("HTML validation passed")
        return True

    def generate_game_stream(self, system_prompt, user_prompt):
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
        for chunk in response:
            content = getattr(chunk.choices[0].delta, 'content', None) if hasattr(chunk.choices[0], 'delta') else getattr(chunk.choices[0], 'text', None)
            if content:
                yield content