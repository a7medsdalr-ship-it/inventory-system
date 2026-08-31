import json

with open('database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# Keep only the admin employee
admin_emp = {
    "id": "admin-ahmed-default",
    "name": "أحمد بن سعيد",
    "username": "Ahmed.admin",
    "password": "aaaaaaaa",
    "role": "admin",
    "phone": "91234567",
    "allowedTabs": ["all"],
    "createdAt": "2026-08-26T10:00:00.000Z"
}

clean_db = {
    "inv_employees": [admin_emp],
    "inv_custom_roles": [],
    "inv_warehouses": db.get("inv_warehouses", []),
    "inv_categories": db.get("inv_categories", []),
    "inv_ingredients": db.get("inv_ingredients", []),
    "inv_purchases": [],
    "inv_recipes": [],
    "inv_usage_logs": [],
    "inv_waste_logs": [],
    "inv_recipe_waste_logs": [],
    "inv_production_orders": [],
    "inv_tasks": [],
    "inv_stocktakes": [],
    "inv_monthly_rollovers": [],
    "inv_opening_balances": {}
}

with open('database.json', 'w', encoding='utf-8') as f:
    json.dump(clean_db, f, ensure_ascii=False, indent=2)

print("Database cleaned: 0 purchases, 0 recipes, 0 waste, 0 orders, 0 tasks. Ready for real usage!")
