import json

with open('database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# Initial Departments
default_departments = [
    {
        "id": "dept_kitchen",
        "name": "قسم المطبخ والإنتاج",
        "icon": "🍳",
        "headId": "",
        "description": "مسؤول عن تحضير الوصفات، إدارة مقادير الإنتاج وتنفيذ طلبات المطبخ."
    },
    {
        "id": "dept_purchases",
        "name": "قسم المشتريات والتوريد",
        "icon": "🛒",
        "headId": "",
        "description": "مسؤول عن شراء المواد الخام، الفواتير الاستهلاكية ومتابعة الموردين."
    },
    {
        "id": "dept_warehouse",
        "name": "قسم إدارة المخازن",
        "icon": "🏬",
        "headId": "",
        "description": "مسؤول عن استلام وتخزين المواد، مراقبة حد الطلب والجرد الدوري."
    },
    {
        "id": "dept_pos",
        "name": "قسم الفروع والكاشير",
        "icon": "☕",
        "headId": "",
        "description": "مسؤول عن تسجيل الاستهلاك اليومي للوجبات وخدمة الزبائن في الفروع."
    },
    {
        "id": "dept_quality",
        "name": "قسم الجودة والنظافة",
        "icon": "🧼",
        "headId": "",
        "description": "مسؤول عن مراقبة الصلاحيات، تسجيل التالف ومعايير النظافة."
    }
]

db['inv_departments'] = default_departments

# Ensure admin has full role and title
for emp in db.get('inv_employees', []):
    if emp.get('role') == 'admin' or emp.get('username') == 'Ahmed.admin':
        emp['customRoleTitle'] = 'المدير العام'
        emp['departmentId'] = ''
        emp['isDeptHead'] = True
        emp['allowedTabs'] = ['all']

with open('database.json', 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)

print("Added initial departments and updated admin in database.json!")
