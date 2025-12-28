import os
import json

SCRIPT_DIR = os.path.join(os.path.dirname(__file__), '..')

BLOCKS_DIR = os.path.join(SCRIPT_DIR, 'external', 'pz-scripts-data', 'data', 'blocks')
OUTPUT_FILE = os.path.join(SCRIPT_DIR, 'src', 'data', 'scriptBlocks.json')

result = {}
for filename in os.listdir(BLOCKS_DIR):
    if filename.endswith('.json'):
        key = os.path.splitext(filename)[0]
        file_path = os.path.join(BLOCKS_DIR, filename)
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                result[key] = json.load(f)
            except Exception as e:
                print(f"Error reading {filename}: {e}")

os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"Combined JSON written to {OUTPUT_FILE}")