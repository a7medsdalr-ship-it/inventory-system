import json

with open('database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# Update all ingredients to have hasExpiry = 'yes' by default
# For non-perishable categories like Packaging (cat_11), set to 'no'
for ing in db.get('inv_ingredients', []):
    if ing.get('categoryId') == 'cat_11' or 'تغليف' in ing.get('name', ''):
        ing['hasExpiry'] = 'no'
    else:
        ing['hasExpiry'] = 'yes'
    # Remove old productType if present
    ing.pop('productType', None)

with open('database.json', 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

print("Updated database.json with hasExpiry fields successfully!")
