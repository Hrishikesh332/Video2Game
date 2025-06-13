import os

class PromptService:
    
    def __init__(self, instructions_dir):
        self.instructions_dir = instructions_dir
        self.prompt_files = {
            'analysis': os.path.join(instructions_dir, 'analysis_prompt.md'),
            'game_generation': os.path.join(instructions_dir, 'game_generation_prompt.md'),
            'system': os.path.join(instructions_dir, 'system_prompt.md')
        }
        self.prompts = {}
        self.load_all_prompts()
    
    def load_prompt_from_file(self, file_path):
        try:
            if not os.path.exists(file_path):
                print(f"Prompt file {file_path} not found!")
                return f"Error: Prompt file {file_path} not found"
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
            
            print(f"Loaded prompt from {file_path}")
            return content
            
        except Exception as e:
            print(f"Error loading prompt from {file_path}: {e}")
            return f"Error loading prompt: {e}"
    
    def load_all_prompts(self):
        for prompt_type, file_path in self.prompt_files.items():
            self.prompts[prompt_type] = self.load_prompt_from_file(file_path)
        
        print(f"Loaded {len(self.prompts)} prompt files from {self.instructions_dir}/")
    
    def reload_prompts(self):
        self.load_all_prompts()
        return self.prompts
    
    def get_prompt(self, prompt_type, **kwargs):
        if prompt_type not in self.prompts:
            print(f"⚠️ Prompt type '{prompt_type}' not found")
            return f"Error: Prompt type '{prompt_type}' not found"
        
        prompt = self.prompts[prompt_type]
        
        try:
            formatted_prompt = prompt.format(**kwargs)
            return formatted_prompt
        except KeyError as e:
            print(f"Missing variable {e} for prompt type '{prompt_type}'")
            return prompt
    
    def get_prompt_info(self):
        prompt_info = {}
        for prompt_type, file_path in self.prompt_files.items():
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                prompt_info[prompt_type] = {
                    "file_path": file_path,
                    "length": len(content),
                    "exists": True
                }
            else:
                prompt_info[prompt_type] = {
                    "file_path": file_path,
                    "length": 0,
                    "exists": False
                }
        
        return prompt_info