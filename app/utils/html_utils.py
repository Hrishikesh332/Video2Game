import re

def clean_html_content(html_content):
    try:
        html_content = re.sub(r'<think>.*?</think>', '', html_content, flags=re.DOTALL)
        html_content = re.sub(r'```html\s*', '', html_content)
        html_content = re.sub(r'```\s*$', '', html_content, flags=re.MULTILINE)
        
        first_tag_match = re.search(r'<(?:!DOCTYPE|html)', html_content, re.IGNORECASE)
        if first_tag_match:
            html_content = html_content[first_tag_match.start():]
        
        html_content = re.sub(r'^[^<]*(?=<)', '', html_content)
        html_content = re.sub(r'# [^\n]*\n', '', html_content)
        html_content = re.sub(r'\n\s*\n\s*\n', '\n\n', html_content)
        html_content = re.sub(r'\r\n', '\n', html_content)
        
        return html_content.strip()
        
    except Exception as e:
        print(f"Warning, Could not clean HTML content: {e}")
        return html_content

def ensure_valid_html(html_content):
    try:
        has_doctype = '<!DOCTYPE html>' in html_content
        has_html_open = '<html' in html_content
        has_html_close = '</html>' in html_content
        has_head_open = '<head>' in html_content
        has_head_close = '</head>' in html_content
        has_body_open = '<body>' in html_content
        has_body_close = '</body>' in html_content

        if not has_doctype:
            html_content = '<!DOCTYPE html>\n' + html_content
            
        if not has_html_open:
            html_content = html_content.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<html lang="en">')
            
        if has_html_open and not has_html_close:
            print("HTML appears incomplete, attempting to fix...")
            html_content = fix_incomplete_html(html_content)
            
        return html_content
        
    except Exception as e:
        print(f"Warning, Could not fix HTML structure: {e}")
        return html_content

def fix_incomplete_html(html_content):
    try:
        lines = html_content.split('\n')
        
        last_meaningful_line = len(lines) - 1
        while last_meaningful_line > 0 and not lines[last_meaningful_line].strip():
            last_meaningful_line -= 1
        
        html_content = '\n'.join(lines[:last_meaningful_line + 1])
        
        needs_closing = []
        
        script_opens = html_content.count('<script')
        script_closes = html_content.count('</script>')
        if script_opens > script_closes:
            for _ in range(script_opens - script_closes):
                needs_closing.append('</script>')
        
        style_opens = html_content.count('<style')
        style_closes = html_content.count('</style>')
        if style_opens > style_closes:
            for _ in range(style_opens - style_closes):
                needs_closing.append('</style>')
        
        div_opens = html_content.count('<div')
        div_closes = html_content.count('</div>')
        if div_opens > div_closes:
            for _ in range(min(5, div_opens - div_closes)):
                needs_closing.append('</div>')
        
        for tag in needs_closing:
            html_content += f'\n    {tag}'

        if '<body>' in html_content and '</body>' not in html_content:
            html_content += '\n</body>'
        
        if '<html' in html_content and '</html>' not in html_content:
            html_content += '\n</html>'
        
        print("Fixed incomplete HTML structure")
        return html_content
        
    except Exception as e:
        print(f"Error fixing incomplete HTML: {e}")
        return html_content

def validate_html_structure(html_content):
    issues = []
    
    required_elements = [
        ('<!DOCTYPE html>', 'Missing DOCTYPE declaration'),
        ('<html', 'Missing HTML tag'),
        ('<head>', 'Missing HEAD tag'),
        ('</head>', 'Missing HEAD closing tag'),
        ('<body>', 'Missing BODY tag'),
        ('</body>', 'Missing BODY closing tag'),
        ('</html>', 'Missing HTML closing tag')
    ]
    
    for element, message in required_elements:
        if element not in html_content:
            issues.append(message)
    
    tag_pairs = [
        ('<script', '</script>'),
        ('<style', '</style>'),
        ('<div', '</div>'),
        ('<head>', '</head>'),
        ('<body>', '</body>')
    ]
    
    for open_tag, close_tag in tag_pairs:
        open_count = html_content.count(open_tag)
        close_count = html_content.count(close_tag)
        if open_count > close_count:
            issues.append(f'Unclosed {open_tag} tags: {open_count - close_count}')
    
    return issues

def add_fallback_game_structure(html_content):
    if len(html_content) < 1000:  
        print("HTML too short, adding fallback structure")
        
        fallback_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Video Game</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: white;
            color: #333;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .game-container {
            background-color: #f5f5f5;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 600px;
            width: 100%;
        }
        .error-message {
            color: #666;
            margin-bottom: 20px;
        }
        button {
            background-color: #333;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #555;
        }
    </style>
</head>
<body>
    <div class="game-container">
        <h1>Interactive Video Game</h1>
        <div class="error-message">
            The game content is being generated. Please try refreshing or regenerating the game.
        </div>
        <button onclick="window.location.reload()">Refresh Game</button>
    </div>
    <script>
        console.log('Fallback game structure loaded');
    </script>
</body>
</html>"""
        return fallback_html
    
    return html_content