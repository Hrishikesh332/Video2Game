import json

# Read the original sample_apps.json
with open('sample_apps.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

entries = data.get('entries', {})

# Build the new structure: video_id as key, remove html_content
new_data = {}
for entry in entries.values():
    video_id = entry.get('video_id')
    if not video_id:
        continue
    entry_copy = dict(entry)
    entry_copy.pop('html_content', None)
    new_data[video_id] = entry_copy

# Write to sample_games.json
with open('sample_games.json', 'w', encoding='utf-8') as f:
    json.dump(new_data, f, indent=2, ensure_ascii=False)

print('Migration complete: sample_games.json created.') 