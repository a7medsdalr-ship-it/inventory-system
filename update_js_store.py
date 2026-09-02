import json
import re

with open('database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

categories_json = json.dumps(db['inv_categories'], ensure_ascii=False, indent=16)
warehouses_json = json.dumps(db['inv_warehouses'], ensure_ascii=False, indent=16)
ingredients_json = json.dumps(db['inv_ingredients'], ensure_ascii=False, indent=16)

# Read store.js
with open('js/store.js', 'r', encoding='utf-8') as f:
    store_code = f.read()

# Generate new initDefaultData implementation
init_block = f"""    initDefaultData() {{
        const existingCats = this._get(this.KEYS.CATEGORIES);
        if (!existingCats || existingCats.length < 8) {{
            this._set(this.KEYS.CATEGORIES, {categories_json});
        }}

        const existingWhs = this._get(this.KEYS.WAREHOUSES);
        if (!existingWhs || existingWhs.length === 0 || existingWhs.some(w => w.name.includes('طحنه') || w.name.includes('كثيب') || w.name.includes('زعفل'))) {{
            this._set(this.KEYS.WAREHOUSES, {warehouses_json});
        }}

        const existingIngs = this._get(this.KEYS.INGREDIENTS);
        if (!existingIngs || existingIngs.length < 20) {{
            this._set(this.KEYS.INGREDIENTS, {ingredients_json});
        }}
    }},"""

# Replace initDefaultData block in store.js
new_store_code = re.sub(
    r'initDefaultData\(\)\s*\{[\s\S]*?initSync\(',
    init_block + '\n\n    async initSync(',
    store_code
)

with open('js/store.js', 'w', encoding='utf-8') as f:
    f.write(new_store_code)

print("Updated js/store.js successfully!")
