/**
 * store.js - Complete Enterprise Data Access Layer with Fail-Safe Auth & Dual Local/Cloud Sync
 */

const Store = {
    KEYS: {
        AUTH_USER: 'inv_auth_user',
        EMPLOYEES: 'inv_employees',
        DEPARTMENTS: 'inv_departments',
        CUSTOM_ROLES: 'inv_custom_roles',
        WAREHOUSES: 'inv_warehouses',
        CATEGORIES: 'inv_categories',
        INGREDIENTS: 'inv_ingredients',
        PRODUCTS: 'inv_products',
        PURCHASES: 'inv_purchases',
        RECIPES: 'inv_recipes',
        USAGE_LOGS: 'inv_usage_logs',
        WASTE_LOGS: 'inv_waste_logs',
        RECIPE_WASTE_LOGS: 'inv_recipe_waste_logs',
        PRODUCTION_ORDERS: 'inv_production_orders',
        TASKS: 'inv_tasks',
        STOCKTAKES: 'inv_stocktakes',
        MONTHLY_ROLLOVERS: 'inv_monthly_rollovers',
        OPENING_BALANCES: 'inv_opening_balances',
        SHELF_TRANSFERS: 'inv_shelf_transfers',
        EXTERNAL_PURCHASES: 'inv_external_purchases'
    },

    _get(key) {
        const data = localStorage.getItem(key);
        if (!data) return (key === this.KEYS.OPENING_BALANCES || key === this.KEYS.AUTH_USER) ? {} : [];
        try {
            return JSON.parse(data);
        } catch(e) {
            return [];
        }
    },

    _syncTimer: null,

    _set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
        this._debouncedSyncToServer();
    },

    _debouncedSyncToServer() {
        if (this._syncTimer) clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => {
            this._syncToServer();
        }, 300);
    },

    _isLocalServer() {
        const h = window.location.hostname;
        return h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.') || h.includes('trycloudflare.com') || h.includes('lhr.life') || true;
    },

    async _syncToServer() {
        try {
            const allData = {};
            Object.values(this.KEYS).forEach(k => {
                if (k !== this.KEYS.AUTH_USER) {
                    const val = localStorage.getItem(k);
                    if (val) {
                        try {
                            allData[k] = JSON.parse(val);
                        } catch(e) {
                            allData[k] = val;
                        }
                    }
                }
            });
            await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allData)
            });
            const syncEl = document.getElementById('sync-indicator');
            if (syncEl) {
                syncEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span> <span class="text-[11px] text-emerald-700 font-bold hidden sm:inline">متزامن لحظياً ✅</span>';
            }
        } catch (e) {
            console.log('Sync to server error:', e);
        }
    },

    async _syncFromServer() {
        try {
            const res = await fetch('/api/data', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data && typeof data === 'object' && Object.keys(data).length > 2) {
                    let hasChanges = false;
                    Object.entries(data).forEach(([key, val]) => {
                        if (val !== undefined && key !== this.KEYS.AUTH_USER) {
                            const current = localStorage.getItem(key);
                            const newJson = JSON.stringify(val);
                            if (current !== newJson) {
                                localStorage.setItem(key, newJson);
                                hasChanges = true;
                            }
                        }
                    });
                    const syncEl = document.getElementById('sync-indicator');
                    if (syncEl) {
                        syncEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500"></span> <span class="text-[11px] text-emerald-700 font-bold hidden sm:inline">متزامن ✅</span>';
                    }
                    return hasChanges;
                }
            }
        } catch (e) {
            console.log('Sync from server error:', e);
        }
        return false;
    },

            initDefaultData() {
        const existingCats = this._get(this.KEYS.CATEGORIES);
        if (!existingCats || existingCats.length < 8) {
            this._set(this.KEYS.CATEGORIES, [
                {
                                "id": "cat_1",
                                "name": "مكونات جافة أساسية"
                },
                {
                                "id": "cat_2",
                                "name": "زيوت ومواد سائلة"
                },
                {
                                "id": "cat_3",
                                "name": "صلصات ومواد جاهزة"
                },
                {
                                "id": "cat_4",
                                "name": "مكونات الحلويات والشوكولاتة"
                },
                {
                                "id": "cat_5",
                                "name": "مخبوزات وعجائن"
                },
                {
                                "id": "cat_6",
                                "name": "فواكه وخضروات طازجة"
                },
                {
                                "id": "cat_7",
                                "name": "ألبان ومنتجات مبردة"
                },
                {
                                "id": "cat_8",
                                "name": "بروتينات ولحوم"
                },
                {
                                "id": "cat_9",
                                "name": "مجمدات"
                },
                {
                                "id": "cat_10",
                                "name": "تسالي ومكسرات"
                },
                {
                                "id": "cat_11",
                                "name": "تعبئة وتغليف"
                }
]);
        }

        const existingWhs = this._get(this.KEYS.WAREHOUSES);
        if (!existingWhs || existingWhs.length === 0 || existingWhs.some(w => w.name.includes('طحنه') || w.name.includes('كثيب') || w.name.includes('زعفل'))) {
            this._set(this.KEYS.WAREHOUSES, [
                {
                                "id": "wh1_fixed_id",
                                "name": "مخزن المشتريات المحلية",
                                "categoryIds": ["cat_1", "cat_2", "cat_3", "cat_4", "cat_5", "cat_6", "cat_7", "cat_8", "cat_9", "cat_10"]
                },
                {
                                "id": "wh2_fixed_id",
                                "name": "مخزن المشتريات الخارجية",
                                "categoryIds": ["cat_wh2_syrup", "cat_wh2_topping", "cat_wh2_drinkware", "cat_wh2_foodpack", "cat_wh2_dry", "cat_wh2_frozen", "cat_wh2_dairy", "cat_wh2_coffee", "cat_wh2_tea"]
                }
]);
        }
        const existingIngs = this._get(this.KEYS.INGREDIENTS);
        if (!existingIngs) {
            this._set(this.KEYS.INGREDIENTS, []);
        }
    },

    async initSync(onComplete) {
        try {
            if (this._isLocalServer()) {
                const res = await fetch('/api/data');
                if (res.ok) {
                    const ct = res.headers.get('content-type') || '';
                    if (ct.includes('application/json')) {
                        const data = await res.json();
                        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                            Object.keys(data).forEach(k => {
                                if (data[k]) localStorage.setItem(k, JSON.stringify(data[k]));
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.log('initSync error caught:', e);
        }
        
        // Automatic fail-safe seed data if empty
        try { this.initDefaultData(); } catch(e) { console.error('initDefaultData error:', e); }

        if (onComplete) onComplete();
    },

    _generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    },

    // --- Authentication & Session ---
    getLoggedInUser() {
        const defaultAdmin = {
            id: 'admin-ahmed-master',
            name: "أحمد بن سعيد",
            username: "Ahmed.admin",
            role: "admin",
            phone: "91234567",
            allowedTabs: ["all"],
            createdAt: new Date().toISOString()
        };

        const data = localStorage.getItem(this.KEYS.AUTH_USER);
        if (!data) return defaultAdmin;
        try {
            const user = JSON.parse(data);
            const current = this.getEmployees().find(e => e.id === user.id || e.username?.toLowerCase() === user.username?.toLowerCase());
            return current || user || defaultAdmin;
        } catch (e) {
            return defaultAdmin;
        }
    },
    setLoggedInUser(user) {
        if (user) {
            localStorage.setItem(this.KEYS.AUTH_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.KEYS.AUTH_USER);
        }
    },
    login(username, password) {
        const u = (username || '').trim().toLowerCase();
        const p = (password || '').trim();

        // 1. Guaranteed Fail-Safe Admin Login
        if (u === 'ahmed.admin' && p === 'aaaaaaaa') {
            const adminUser = {
                id: 'admin-ahmed-master',
                name: "أحمد بن سعيد",
                username: "Ahmed.admin",
                password: "aaaaaaaa",
                role: "admin",
                phone: "91234567",
                allowedTabs: ["all"],
                createdAt: new Date().toISOString()
            };
            this.setLoggedInUser(adminUser);
            let employees = this._get(this.KEYS.EMPLOYEES);
            if (!employees.some(e => e.username?.toLowerCase() === 'ahmed.admin')) {
                employees.unshift(adminUser);
                localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(employees));
            }
            return { success: true, user: adminUser };
        }

        // 2. Other Employees Login
        let employees = this.getEmployees();
        const matched = employees.find(e => 
            e.username?.toLowerCase() === u && e.password === p
        );

        if (matched) {
            this.setLoggedInUser(matched);
            return { success: true, user: matched };
        }
        return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    },
    logout() {
        this.setLoggedInUser(null);
    },

    // --- Employees & User Accounts ---
    getEmployees() {
        let emps = this._get(this.KEYS.EMPLOYEES);
        if (!emps.some(e => e.username?.toLowerCase() === 'ahmed.admin')) {
            const admin = {
                id: 'admin-ahmed-default',
                name: "أحمد بن سعيد",
                username: "Ahmed.admin",
                password: "aaaaaaaa",
                role: "admin",
                phone: "91234567",
                allowedTabs: ["all"],
                createdAt: new Date().toISOString()
            };
            emps.unshift(admin);
            localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(emps));
        }
        return emps;
    },
    saveEmployee(employee) {
        let employees = this.getEmployees();
        if (employee.id) {
            const idx = employees.findIndex(e => e.id === employee.id);
            if (idx !== -1) employees[idx] = employee;
        } else {
            employee.id = this._generateId();
            employee.createdAt = new Date().toISOString();
            employee.allowedTabs = employee.allowedTabs || ['all'];
            employees.push(employee);
        }
        this._set(this.KEYS.EMPLOYEES, employees);

        const current = this.getLoggedInUser();
        if (current && (current.id === employee.id || current.username === employee.username)) {
            this.setLoggedInUser(employee);
        }
        return employee;
    },
    deleteEmployee(id) {
        let employees = this.getEmployees().filter(e => e.id !== id && e.username !== 'Ahmed.admin');
        this._set(this.KEYS.EMPLOYEES, employees);
    },

    // --- Departments ---
    getDepartments() {
        let depts = this._get(this.KEYS.DEPARTMENTS);
        if (!depts || depts.length === 0) {
            depts = [
                { id: "dept_kitchen", name: "قسم المطبخ والإنتاج", icon: "🍳", headId: "", description: "مسؤول عن تحضير الوصفات، إدارة مقادير الإنتاج وتنفيذ طلبات المطبخ." },
                { id: "dept_purchases", name: "قسم المشتريات والتوريد", icon: "🛒", headId: "", description: "مسؤول عن شراء المواد الخام، الفواتير الاستهلاكية ومتابعة الموردين." },
                { id: "dept_warehouse", name: "قسم إدارة المخازن", icon: "🏬", headId: "", description: "مسؤول عن استلام وتخزين المواد، مراقبة حد الطلب والجرد الدوري." },
                { id: "dept_pos", name: "قسم الفروع والكاشير", icon: "☕", headId: "", description: "مسؤول عن تسجيل الاستهلاك اليومي للوجبات وخدمة الزبائن في الفروع." },
                { id: "dept_quality", name: "قسم الجودة والنظافة", icon: "🧼", headId: "", description: "مسؤول عن مراقبة الصلاحيات، تسجيل التالف ومعايير النظافة." }
            ];
            this._set(this.KEYS.DEPARTMENTS, depts);
        }
        return depts;
    },
    saveDepartment(dept) {
        let depts = this.getDepartments();
        if (dept.id) {
            const idx = depts.findIndex(d => d.id === dept.id);
            if (idx !== -1) depts[idx] = dept;
            else depts.push(dept);
        } else {
            dept.id = 'dept_' + this._generateId();
            depts.push(dept);
        }
        this._set(this.KEYS.DEPARTMENTS, depts);
        return dept;
    },
    deleteDepartment(id) {
        let depts = this.getDepartments().filter(d => d.id !== id);
        this._set(this.KEYS.DEPARTMENTS, depts);
    },

    // --- Custom Roles ---
    getCustomRoles() { return this._get(this.KEYS.CUSTOM_ROLES); },
    saveCustomRole(role) {
        let roles = this.getCustomRoles();
        if (!role.id) role.id = this._generateId();
        const idx = roles.findIndex(r => r.id === role.id);
        if (idx !== -1) roles[idx] = role;
        else roles.push(role);
        this._set(this.KEYS.CUSTOM_ROLES, roles);
        return role;
    },
    deleteCustomRole(id) {
        let roles = this.getCustomRoles().filter(r => r.id !== id);
        this._set(this.KEYS.CUSTOM_ROLES, roles);
    },

    // --- Warehouses ---
    getWarehouses() {
        let whs = this._get(this.KEYS.WAREHOUSES);
        if (!whs || whs.length === 0 || whs.some(w => w.name.includes('طحنه') || w.name.includes('كثيب') || w.name.includes('زعفل'))) {
            whs = [
                { id: "wh1_fixed_id", name: "مخزن المشتريات المحلية", categoryIds: ["cat_1", "cat_2", "cat_3", "cat_4", "cat_5", "cat_6", "cat_7", "cat_8", "cat_9", "cat_10"] },
                { id: "wh2_fixed_id", name: "مخزن المشتريات الخارجية", categoryIds: ["cat_wh2_syrup", "cat_wh2_topping", "cat_wh2_drinkware", "cat_wh2_foodpack", "cat_wh2_dry", "cat_wh2_frozen", "cat_wh2_dairy", "cat_wh2_coffee", "cat_wh2_tea"] }
            ];
            this._set(this.KEYS.WAREHOUSES, whs);
        }
        return whs;
    },
    saveWarehouse(warehouse) {
        let warehouses = this.getWarehouses();
        if (warehouse.id) {
            const idx = warehouses.findIndex(w => w.id === warehouse.id);
            if (idx !== -1) warehouses[idx] = warehouse;
        } else {
            warehouse.id = this._generateId();
            warehouse.categoryIds = warehouse.categoryIds || [];
            warehouses.push(warehouse);
        }
        this._set(this.KEYS.WAREHOUSES, warehouses);
        return warehouse;
    },
    deleteWarehouse(id) {
        let warehouses = this.getWarehouses().filter(w => w.id !== id);
        this._set(this.KEYS.WAREHOUSES, warehouses);
    },

    // --- Categories ---
    getCategories() {
        let cats = this._get(this.KEYS.CATEGORIES);
        if (!cats || cats.length === 0) {
            this.initDefaultData();
            cats = this._get(this.KEYS.CATEGORIES);
        }
        return cats;
    },
    saveCategory(category, targetWarehouseId = null) {
        let categories = this.getCategories();
        if (!category.id) {
            category.id = 'cat_' + this._generateId();
            categories.push(category);
        } else {
            const idx = categories.findIndex(c => c.id === category.id);
            if (idx !== -1) categories[idx] = category;
            else categories.push(category);
        }
        this._set(this.KEYS.CATEGORIES, categories);

        if (targetWarehouseId) {
            let warehouses = this.getWarehouses();
            warehouses.forEach(w => {
                w.categoryIds = (w.categoryIds || []).filter(cid => cid !== category.id);
                if (w.id === targetWarehouseId) {
                    w.categoryIds.push(category.id);
                }
            });
            this._set(this.KEYS.WAREHOUSES, warehouses);
        }

        return category;
    },
    addCategoryToWarehouse(name, warehouseId) {
        const cat = {
            id: 'cat_' + this._generateId(),
            name: name.trim()
        };
        return this.saveCategory(cat, warehouseId);
    },
    moveCategoryToWarehouse(categoryId, targetWarehouseId) {
        let warehouses = this.getWarehouses();
        warehouses.forEach(w => {
            w.categoryIds = (w.categoryIds || []).filter(cid => cid !== categoryId);
            if (w.id === targetWarehouseId) {
                w.categoryIds.push(categoryId);
            }
        });
        this._set(this.KEYS.WAREHOUSES, warehouses);
    },
    deleteCategory(id) {
        let categories = this.getCategories().filter(c => c.id !== id);
        this._set(this.KEYS.CATEGORIES, categories);

        // Also clean up from all warehouses
        let warehouses = this.getWarehouses();
        warehouses.forEach(w => {
            if (w.categoryIds) {
                w.categoryIds = w.categoryIds.filter(cid => cid !== id);
            }
        });
        this._set(this.KEYS.WAREHOUSES, warehouses);
    },

    // --- Raw Materials (Ingredients) ---
    getIngredients() {
        let items = this._get(this.KEYS.INGREDIENTS);
        if (!items) {
            items = [];
            this._set(this.KEYS.INGREDIENTS, items);
        }
        return items;
    },
    clearAllIngredients() {
        this._set(this.KEYS.INGREDIENTS, []);
        this._set(this.KEYS.RECIPES, []);
    },
    saveIngredient(ingredient) {
        let ingredients = this.getIngredients();
        if (ingredient.id) {
            const idx = ingredients.findIndex(i => i.id === ingredient.id);
            if (idx !== -1) ingredients[idx] = ingredient;
        } else {
            ingredient.id = this._generateId();
            ingredient.minThreshold = parseFloat(ingredient.minThreshold) || 5;
            ingredient.createdAt = new Date().toISOString();
            ingredients.push(ingredient);
        }
        this._set(this.KEYS.INGREDIENTS, ingredients);
        return ingredient;
    },
    archiveIngredient(id) {
        let ingredients = this.getIngredients();
        const ing = ingredients.find(i => i.id === id);
        if (ing) {
            ing.archived = true;
            ing.archivedAt = new Date().toISOString();
            ing.archivedBy = this.getLoggedInUser()?.name || 'المشرف';
            this._set(this.KEYS.INGREDIENTS, ingredients);
        }
        return ing;
    },
    unarchiveIngredient(id) {
        let ingredients = this.getIngredients();
        const ing = ingredients.find(i => i.id === id);
        if (ing) {
            ing.archived = false;
            delete ing.archivedAt;
            delete ing.archivedBy;
            this._set(this.KEYS.INGREDIENTS, ingredients);
        }
        return ing;
    },
    deleteIngredient(id) {
        let ingredients = this.getIngredients().filter(i => i.id !== id);
        this._set(this.KEYS.INGREDIENTS, ingredients);
    },

    // --- Products & Packaging ---
    getProducts() {
        let items = this._get(this.KEYS.PRODUCTS);
        if (!items) {
            items = [];
            this._set(this.KEYS.PRODUCTS, items);
        }
        return items;
    },
    saveProduct(product) {
        let products = this.getProducts();
        if (product.id) {
            const idx = products.findIndex(p => p.id === product.id);
            if (idx !== -1) products[idx] = product;
        } else {
            product.id = 'prod_' + this._generateId();
            product.minThreshold = parseFloat(product.minThreshold) || 10;
            product.createdAt = new Date().toISOString();
            products.push(product);
        }
        this._set(this.KEYS.PRODUCTS, products);
        return product;
    },
    archiveProduct(id) {
        let products = this.getProducts();
        const prod = products.find(p => p.id === id);
        if (prod) {
            prod.archived = true;
            prod.archivedAt = new Date().toISOString();
            prod.archivedBy = this.getLoggedInUser()?.name || 'المشرف';
            this._set(this.KEYS.PRODUCTS, products);
        }
        return prod;
    },
    unarchiveProduct(id) {
        let products = this.getProducts();
        const prod = products.find(p => p.id === id);
        if (prod) {
            prod.archived = false;
            delete prod.archivedAt;
            delete prod.archivedBy;
            this._set(this.KEYS.PRODUCTS, products);
        }
        return prod;
    },
    deleteProduct(id) {
        let products = this.getProducts().filter(p => p.id !== id);
        this._set(this.KEYS.PRODUCTS, products);
    },

    // --- Purchases ---
    getPurchases() { return this._get(this.KEYS.PURCHASES); },
    savePurchase(purchase) {
        let purchases = this.getPurchases();
        if (purchase.id) {
            const idx = purchases.findIndex(p => p.id === purchase.id);
            if (idx !== -1) purchases[idx] = purchase;
        } else {
            purchase.id = this._generateId();
            purchase.dateAdded = purchase.dateAdded || new Date().toISOString();
            purchase.isApproved = purchase.isApproved || false;
            purchases.push(purchase);
        }
        this._set(this.KEYS.PURCHASES, purchases);
        return purchase;
    },
    togglePurchaseApproval(id, managerName) {
        let purchases = this.getPurchases();
        const p = purchases.find(item => item.id === id);
        if (p) {
            p.isApproved = !p.isApproved;
            p.approvedBy = p.isApproved ? (managerName || 'المدير العام') : null;
            p.approvedAt = p.isApproved ? new Date().toISOString() : null;
            this._set(this.KEYS.PURCHASES, purchases);
        }
        return p;
    },
    deletePurchase(id) {
        let purchases = this.getPurchases().filter(p => p.id !== id);
        this._set(this.KEYS.PURCHASES, purchases);
    },

    // --- Recipes ---
    getRecipes() { return this._get(this.KEYS.RECIPES); },
    saveRecipe(recipe) {
        let recipes = this.getRecipes();
        if (recipe.id) {
            const idx = recipes.findIndex(r => r.id === recipe.id);
            if (idx !== -1) recipes[idx] = recipe;
        } else {
            recipe.id = this._generateId();
            recipe.yield = parseInt(recipe.yield) || 1;
            recipes.push(recipe);
        }
        this._set(this.KEYS.RECIPES, recipes);
        return recipe;
    },
    deleteRecipe(id) {
        let recipes = this.getRecipes().filter(r => r.id !== id);
        this._set(this.KEYS.RECIPES, recipes);
    },

    // --- POS Usage Logs ---
    getUsageLogs() { return this._get(this.KEYS.USAGE_LOGS); },
    saveUsageLog(log) {
        const logs = this.getUsageLogs();
        if (!log.id) log.id = this._generateId();
        log.date = log.date || new Date().toISOString();
        logs.push(log);
        this._set(this.KEYS.USAGE_LOGS, logs);
        return log;
    },
    deleteUsageLog(id) {
        let logs = this.getUsageLogs().filter(l => l.id !== id);
        this._set(this.KEYS.USAGE_LOGS, logs);
    },

    // --- Raw Waste Logs ---
    getWasteLogs() { return this._get(this.KEYS.WASTE_LOGS); },
    saveWasteLog(log) {
        let logs = this.getWasteLogs();
        if (log.id) {
            const idx = logs.findIndex(l => l.id === log.id);
            if (idx !== -1) logs[idx] = log;
        } else {
            log.id = this._generateId();
            log.date = log.date || new Date().toISOString();
            logs.push(log);
        }
        this._set(this.KEYS.WASTE_LOGS, logs);
        return log;
    },
    deleteWasteLog(id) {
        let logs = this.getWasteLogs().filter(l => l.id !== id);
        this._set(this.KEYS.WASTE_LOGS, logs);
    },

    // --- Recipe Waste Logs ---
    getRecipeWasteLogs() { return this._get(this.KEYS.RECIPE_WASTE_LOGS); },
    saveRecipeWasteLog(log) {
        let logs = this.getRecipeWasteLogs();
        if (log.id) {
            const idx = logs.findIndex(l => l.id === log.id);
            if (idx !== -1) logs[idx] = log;
        } else {
            log.id = this._generateId();
            log.date = log.date || new Date().toISOString();
            logs.push(log);
        }
        this._set(this.KEYS.RECIPE_WASTE_LOGS, logs);
        return log;
    },
    deleteRecipeWasteLog(id) {
        let logs = this.getRecipeWasteLogs().filter(l => l.id !== id);
        this._set(this.KEYS.RECIPE_WASTE_LOGS, logs);
    },

    // --- Production Orders ---
    getProductionOrders() { return this._get(this.KEYS.PRODUCTION_ORDERS); },
    saveProductionOrder(order) {
        let orders = this.getProductionOrders();
        if (order.id) {
            const idx = orders.findIndex(o => o.id === order.id);
            if (idx !== -1) orders[idx] = order;
        } else {
            order.id = this._generateId();
            order.createdAt = new Date().toISOString();
            order.status = order.status || 'pending';
            orders.push(order);
        }
        this._set(this.KEYS.PRODUCTION_ORDERS, orders);
        return order;
    },
    deleteProductionOrder(id) {
        let orders = this.getProductionOrders().filter(o => o.id !== id);
        this._set(this.KEYS.PRODUCTION_ORDERS, orders);
    },

    // --- Shelf Transfers (سحب من المخزن إلى رفوف المحلات) ---
    getShelfTransfers() { return this._get(this.KEYS.SHELF_TRANSFERS); },
    saveShelfTransfer(transfer) {
        let transfers = this.getShelfTransfers();
        if (transfer.id) {
            const idx = transfers.findIndex(t => t.id === transfer.id);
            if (idx !== -1) transfers[idx] = transfer;
        } else {
            transfer.id = 'trf_' + this._generateId();
            transfer.date = transfer.date || new Date().toISOString();
            transfers.push(transfer);
        }
        this._set(this.KEYS.SHELF_TRANSFERS, transfers);
        return transfer;
    },
    deleteShelfTransfer(id) {
        let transfers = this.getShelfTransfers().filter(t => t.id !== id);
        this._set(this.KEYS.SHELF_TRANSFERS, transfers);
    },

    // --- Tasks ---
    getTasks() { return this._get(this.KEYS.TASKS); },
    saveTask(task) {
        let tasks = this.getTasks();
        if (task.id) {
            const idx = tasks.findIndex(t => t.id === task.id);
            if (idx !== -1) tasks[idx] = task;
        } else {
            task.id = this._generateId();
            task.createdAt = new Date().toISOString();
            task.status = task.status || 'pending';
            tasks.push(task);
        }
        this._set(this.KEYS.TASKS, tasks);
        return task;
    },
    deleteTask(id) {
        let tasks = this.getTasks().filter(t => t.id !== id);
        this._set(this.KEYS.TASKS, tasks);
    },

    // --- Monthly Stocktaking ---
    getStocktakes() { return this._get(this.KEYS.STOCKTAKES); },
    saveStocktake(stocktake) {
        let stocktakes = this.getStocktakes();
        const monthKey = stocktake.monthKey;
        const idx = stocktakes.findIndex(s => s.monthKey === monthKey);
        if (idx !== -1) stocktakes[idx] = stocktake;
        else {
            stocktake.id = this._generateId();
            stocktakes.push(stocktake);
        }
        this._set(this.KEYS.STOCKTAKES, stocktakes);
        return stocktake;
    },
    deleteStocktake(idOrMonthKey) {
        let stocktakes = this.getStocktakes().filter(s => s.id !== idOrMonthKey && s.monthKey !== idOrMonthKey);
        this._set(this.KEYS.STOCKTAKES, stocktakes);
    },
    getMonthlyRollovers() { return this._get(this.KEYS.MONTHLY_ROLLOVERS); },
    saveMonthlyRollover(record) {
        let history = this.getMonthlyRollovers();
        record.id = this._generateId();
        record.date = new Date().toISOString();
        history.push(record);
        this._set(this.KEYS.MONTHLY_ROLLOVERS, history);
        return record;
    },
    deleteMonthlyRollover(id) {
        let history = this.getMonthlyRollovers().filter(r => r.id !== id);
        this._set(this.KEYS.MONTHLY_ROLLOVERS, history);
    },

    // --- Opening Balances (Forwarded Shelf Surplus) ---
    getOpeningBalances(monthKey) {
        const raw = localStorage.getItem(this.KEYS.OPENING_BALANCES);
        const all = raw ? JSON.parse(raw) : {};
        if (monthKey) return all[monthKey] || {};
        return all;
    },
    saveOpeningBalances(monthKey, balances) {
        const raw = localStorage.getItem(this.KEYS.OPENING_BALANCES);
        let all = raw ? JSON.parse(raw) : {};
        if (typeof all !== 'object' || Array.isArray(all)) all = {};
        all[monthKey] = balances;
        localStorage.setItem(this.KEYS.OPENING_BALANCES, JSON.stringify(all));
        this._syncToServer();
        return all;
    },

    // --- External Purchases (مشتريات خارجية من أماكن بعيدة وموردين) ---
    getExternalPurchases() {
        let list = this._get(this.KEYS.EXTERNAL_PURCHASES);
        if (!list || !Array.isArray(list)) {
            list = [];
            this._set(this.KEYS.EXTERNAL_PURCHASES, list);
        }
        return list;
    },
    saveExternalPurchase(purchase) {
        let list = this.getExternalPurchases();
        if (purchase.id) {
            const idx = list.findIndex(p => p.id === purchase.id);
            if (idx !== -1) {
                list[idx] = { ...list[idx], ...purchase, updatedAt: new Date().toISOString() };
            } else {
                list.push(purchase);
            }
        } else {
            purchase.id = 'ext_' + this._generateId();
            purchase.createdAt = new Date().toISOString();
            purchase.orderDate = purchase.orderDate || new Date().toISOString().split('T')[0];
            purchase.status = purchase.status || 'pending';
            purchase.quantityRequested = parseFloat(purchase.quantityRequested) || 0;
            purchase.quantityReceived = parseFloat(purchase.quantityReceived) || 0;
            purchase.unitPrice = parseFloat(purchase.unitPrice) || 0;
            purchase.totalCost = purchase.totalCost || (purchase.quantityRequested * purchase.unitPrice);
            purchase.addedToStock = false;
            list.unshift(purchase);
        }
        this._set(this.KEYS.EXTERNAL_PURCHASES, list);
        return purchase;
    },
    receiveExternalPurchase(id, receiveQty, creditToStock = false, targetWarehouse = 'wh1', receiptDate = null, notes = '') {
        let list = this.getExternalPurchases();
        const purchase = list.find(p => p.id === id);
        if (!purchase) return null;

        const additionalQty = parseFloat(receiveQty) || 0;
        purchase.quantityReceived = (parseFloat(purchase.quantityReceived) || 0) + additionalQty;
        purchase.lastReceivedDate = receiptDate || new Date().toISOString().split('T')[0];
        if (notes) {
            purchase.receiptNotes = (purchase.receiptNotes ? purchase.receiptNotes + ' | ' : '') + notes;
        }

        const req = parseFloat(purchase.quantityRequested) || 0;
        if (purchase.quantityReceived >= req) {
            purchase.status = 'completed';
        } else if (purchase.quantityReceived > 0) {
            purchase.status = 'partial';
        }

        if (creditToStock && additionalQty > 0) {
            const purchases = this.getPurchases();
            const newPur = {
                id: this._generateId(),
                ingredientId: purchase.ingredientId || null,
                ingredientName: purchase.itemName,
                branch: targetWarehouse || purchase.targetWarehouseId || 'wh1',
                warehouseId: targetWarehouse || purchase.targetWarehouseId || 'wh1',
                quantity: additionalQty,
                unitPrice: parseFloat(purchase.unitPrice) || 0,
                totalPrice: additionalQty * (parseFloat(purchase.unitPrice) || 0),
                invoiceNumber: purchase.orderNumber || ('EXT-' + id.slice(-6)),
                supplier: purchase.storeName + (purchase.storePhone ? ` (${purchase.storePhone})` : ''),
                expiryDate: purchase.expiryDate || null,
                dateAdded: receiptDate ? (new Date(receiptDate).toISOString()) : new Date().toISOString(),
                unit: purchase.unit || 'حبة',
                notes: `توريد واستلام مشتريات خارجية من: ${purchase.storeName} (هاتف: ${purchase.storePhone || 'غير مسجل'})`,
                isApproved: true
            };
            purchases.push(newPur);
            this._set(this.KEYS.PURCHASES, purchases);
            purchase.addedToStock = true;
        }

        this._set(this.KEYS.EXTERNAL_PURCHASES, list);
        return purchase;
    },
    deleteExternalPurchase(id) {
        let list = this.getExternalPurchases().filter(p => p.id !== id);
        this._set(this.KEYS.EXTERNAL_PURCHASES, list);
    },

    clearAll() {
        Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
    }
};
