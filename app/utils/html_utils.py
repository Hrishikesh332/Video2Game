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
        print(f"Warning: Could not clean HTML content: {e}")
        return html_content

def ensure_valid_html(html_content):
    try:
        has_doctype = '<!DOCTYPE html>' in html_content
        has_html_open = '<html' in html_content
        has_html_close = '</html>' in html_content
        has_body_close = '</body>' in html_content
        has_script_open = '<script' in html_content
        has_style_close = '</style>' in html_content
        
        if not has_doctype:
            html_content = '<!DOCTYPE html>\n' + html_content
            
        if not has_html_open:
            html_content = html_content.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<html lang="en">')
            
        if has_html_open and not has_html_close:
            print("HTML appears incomplete, attempting to fix...")
            
            lines = html_content.split('\n')
            last_meaningful_line = len(lines) - 1
            
            while last_meaningful_line > 0 and not lines[last_meaningful_line].strip():
                last_meaningful_line -= 1
            
            html_content = '\n'.join(lines[:last_meaningful_line + 1])
            
            if has_script_open and not html_content.rstrip().endswith('</script>'):
                html_content += '\n    </script>'
                
            if not has_style_close and '<style' in html_content:
                html_content += '\n    </style>'

            if not has_body_close and '<body' in html_content:
                html_content += '\n</body>'
                
            html_content += '\n</html>'
            print("Fixed incomplete HTML structure")
            
        return html_content
        
    except Exception as e:
        print(f"Warning: Could not fix HTML structure: {e}")
        return html_content