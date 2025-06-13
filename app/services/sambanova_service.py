from openai import OpenAI
from flask import current_app

class SambanovaService:
    
    def __init__(self):
        self.client = OpenAI(
            api_key=current_app.config['SAMBANOVA_API_KEY'],
            base_url=current_app.config['SAMBANOVA_BASE_URL'],
        )
    
    def generate_game(self, system_prompt, user_prompt):
        try:
            response = self.client.chat.completions.create(
                model=current_app.config['SAMBANOVA_MODEL'],
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=current_app.config['GENERATION_TEMPERATURE'],
                top_p=current_app.config['GENERATION_TOP_P'],
                max_tokens=current_app.config['GENERATION_MAX_TOKENS']
            )
            
            game_code = response.choices[0].message.content
            
            if len(game_code) < current_app.config['MIN_HTML_LENGTH']:
                print("⚠️ Generated HTML seems too short, might be incomplete")
            
            if not game_code.strip().endswith('</html>'):
                print("⚠️ Generated HTML doesn't end with </html>, will attempt to fix")
            
            return game_code
            
        except Exception as e:
            print(f"Error generating game with SambaNova: {e}")
            raise e