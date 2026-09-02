import re
import json

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

with open('js/store.js', 'r', encoding='utf-8') as f:
    store_js = f.read()

with open('js/seed.js', 'r', encoding='utf-8') as f:
    seed_js = f.read()

with open('js/i18n.js', 'r', encoding='utf-8') as f:
    i18n_js = f.read()

# Find all getElementById in app.js
ids_in_js = set(re.findall(r"getElementById\(['\"]([^'\"]+)['\"]", app_js))
ids_in_html = set(re.findall(r'id=["\']([^"\']+)["\']', html))

missing = [i for i in ids_in_js if i not in ids_in_html]
print("=== CHECKING ELEMENT IDs IN HTML ===")
print("Total IDs in JS:", len(ids_in_js))
print("Total IDs in HTML:", len(ids_in_html))
print("Missing IDs that JS looks for:", missing)
