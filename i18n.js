/**
 * i18n.js - Complete Arabic / English localization with Omani Rial (ر.ع) and Enterprise Terminology
 */

const translations = {
    ar: {
        appTitle: "نظام إدارة المخزون والمطاعم",
        currency: "ر.ع",
        userRoleLabel: "المستخدم الحالي:",
        btnLogout: "تسجيل الخروج",
        btnLogin: "تسجيل الدخول",
        
        // Navigation Tabs
        tabDashboard: "لوحة التحكم",
        tabPurchasesDropdown: "إدارة المشتريات",
        tabPurchases: "المشتريات المحلية",
        tabExternalPurchases: "المشتريات الخارجية",
        tabProducts: "إضافة منتج",
        tabWarehouse1: "مخزن المشتريات المحلية",
        tabWarehouse2: "مخزن المشتريات الخارجية",
        tabRecipes: "الوصفات",
        tabOrders: "تقديم طلب (المطبخ)",
        tabUsage: "الكاشير (الاستهلاك)",
        tabWaste: "تسجيل التالف",
        tabStocktake: "الجرد الشهري",
        tabProfits: "الأرباح (قريباً)",
        tabStaffTasks: "إدارة الموظفين",

        // Branches (3 Exclusive Branches)
        branch_tahnah: "طحنه",
        branch_katheeb: "كثيب",
        branch_zafal: "زعفل",

        // Warehouses
        warehouse_1: "مخزن المشتريات المحلية",
        warehouse_2: "مخزن المشتريات الخارجية",

        // Dashboard
        dashboardTitle: "نظرة شاملة على المخزون",
        filterBranchAll: "جميع الفروع",
        filterCategoryAll: "جميع الفئات",
        filterWarehouseAll: "جميع المخازن",
        sortByQuantityAsc: "الكمية (الأقل أولاً ⚠️)",
        sortByQuantityDesc: "الكمية (الأكثر أولاً)",
        sortByExpiry: "تاريخ الصلاحية (الأقرب ⏳)",
        sortDefault: "الترتيب الافتراضي",
        colIngredient: "المكون",
        colCategory: "الفئة",
        colPurchased: "إجمالي المشتريات",
        colUsed: "الاستهلاك والإنتاج",
        colWasted: "التالف",
        colRemaining: "الرصيد المتبقي",
        colExpiry: "أقرب انتهاء صلاحية",
        colStatus: "الحالة",
        statusLowStock: "تنبيه: شراء المزيد ⚠️",
        statusGoodStock: "متوفر جيداً ✅",
        statusExpired: "منتهي الصلاحية ⛔",

        // Purchases
        purchasesTitle: "سجل وإدارة المشتريات والفواتير",
        btnStockIn: "+ تسجيل فاتورة جديدة",
        colDate: "التاريخ",
        colBranch: "الفرع",
        colLocation: "مكان التخزين",
        colQuantity: "الكمية",
        colUnitCost: "سعر الوحدة (ر.ع)",
        colTotalCost: "الإجمالي (ر.ع)",
        colInvoiceImage: "الفاتورة",
        colApproval: "موافقة المسؤول",
        colLoggedBy: "سجل بواسطة",
        colActions: "الإجراءات",
        btnApprove: "اعتماد ✅",
        btnApproved: "معتمد ✅",
        btnPendingApproval: "بانتظار الاعتماد ⏳",
        viewInvoice: "عرض الفاتورة 📄",
        noInvoice: "لا توجد صورة",

        // Multi-item Invoice Validation
        invoiceTotalRequired: "يرجى تحديد المبلغ الإجمالي للفاتورة (ر.ع)",
        invoiceItemsCountRequired: "يرجى تحديد عدد المكونات المتوقعة في الفاتورة",
        invoiceBalancedSuccess: "الفاتورة متطابقة ومتوازنة بالكامل ✅",
        invoiceUnbalancedWarning: "تنبيه: عدد المكونات المضافة أو مجموع الأسعار لا يتطابق مع إجمالي الفاتورة ⚠️",

        // Ingredients (Raw Products)
        ingredientsTitle: "دليل إضافة وتتبع المنتجات والمواد الخام",
        btnAddIngredient: "+ إضافة منتج خام",
        btnManageCategories: "إدارة الفئات",
        colIngredientName: "اسم المادة الخام",
        colProductType: "نوع المنتج",
        colUnit: "وحدة القياس",
        colMinThreshold: "حد إعادة الطلب (التنبيه)",
        colWarehouse: "المخزن التابع له",

        // Products & Packaging Management
        productsTitle: "دليل وإدارة المنتجات ومستلزمات التغليف",
        btnAddProduct: "+ إضافة منتج جديد",
        colProductName: "اسم المنتج / التغليف",

        // Warehouses Management
        warehousesTitle: "إدارة المخازن والفئات المرتبطة",
        btnAddWarehouse: "+ إضافة مخزن جديد",

        // Recipes
        recipesTitle: "دليل الوصفات والمنتجات النهائية",
        btnCreateRecipe: "+ إنشاء وصفة جديدة",
        lblRecipeYield: "إنتاجية المقدار الواحد:",
        lblPieces: "قطعة / حصة",
        lblAvailablePieces: "القطع المتاحة حالياً:",
        lblRecipeIngredients: "المكونات المطلوبة للمقدار الواحد:",

        // Production Orders
        ordersTitle: "طلبات تجهيز وإنتاج الوصفات (المطبخ / المعمل)",
        btnCreateOrder: "+ إنشاء طلب إنتاج جديد",
        colOrderNo: "رقم الطلب",
        colRecipe: "الوصفة / المنتج",
        colRequiredYield: "الكمية المطلوبة (قطع)",
        colOrderStatus: "حالة الطلب",
        orderStatusPending: "قيد الانتظار ⏳",
        orderStatusInProgress: "جاري التحضير 👨‍🍳",
        orderStatusReady: "جاهز للتسليم 📦",
        orderStatusDelivered: "تم التسليم واكتمال الإنتاج ✅",

        // POS Quick Usage
        usageTitle: "نقطة البيع السريعة (الكاشير)",
        clickToDeduct: "اضغط لخصم 1 حبة من المستودع",
        usageLogTitle: "سجل حركات البيع والاستهلاك",
        colProduct: "المنتج",

        // Waste
        wasteTitle: "تسجيل التالف والمهدر",
        wasteIngredientsTab: "تالف المواد الخام",
        wasteRecipesTab: "تالف الوصفات والمنتجات الجاهزة (إداري)",
        lblWasteReason: "سبب التالف (إجباري) *",
        wasteReasonRequiredAlert: "يرجى كتابة سبب التالف، الحقل إجباري!",
        wasteLogTitle: "سجل التالف للمواد الخام",
        recipeWasteLogTitle: "سجل التالف للوصفات والمنتجات الجاهزة",
        colReason: "سبب التالف",
        colWastedYield: "القطع التالفة",

        // Monthly Stocktake
        stocktakeTitle: "الجرد الشهري للمخزون وترحيل الأرصدة",
        stocktakeDesc: "مطابقة الرصيد الدفتري مع الجرد الفعلي، وإثبات أسباب النقص، واعتماد المدير وترحيل الأرصدة للشهر الجديد.",
        colTheoreticalQty: "الكمية بالنظام",
        colPhysicalQty: "الجرد الفعلي على أرض الواقع",
        colDifference: "الفارق (العجز / الزيادة)",
        colDifferenceReason: "سبب النقص / الفارق",
        colManagerAudit: "تشييك واعتماد المدير",
        btnSaveStocktakeDraft: "حفظ مسودة الجرد",
        btnCloseAndRollover: "إغلاق الجرد وترحيل للشهر التالي 🚀",
        rolloverHistoryTitle: "سجل الأرشيف والجرد للأشهر السابقة",
        colMonth: "الشهر",
        colRolloverDate: "تاريخ الترحيل",
        colNetCost: "تكلفة المواد المستهلكة (ر.ع)",

        // Profits
        profitsTitle: "لوحة الأرباح والمؤشرات المالية",
        profitsComingSoonTitle: "قسم الأرباح قيد التطوير والإعداد 📊",
        profitsComingSoonDesc: "يتم حالياً تجهيز خوارزميات حساب صافي الأرباح، التكاليف التشغيلية، وهامش الربح لكل فرع ومنتج وسيتم تفعيلها قريباً.",

        // Staff & Roles
        staffTitle: "إدارة الموظفين والصلاحيات",
        btnAddEmployee: "+ إضافة موظف جديد",
        btnAddRole: "+ إضافة رتبة مخصصة",
        colEmployeeName: "اسم الموظف",
        colUsername: "اسم المستخدم",
        colRole: "الرتبة / الدور",
        colPermissions: "الأقسام المصرح بها",
        tasksTitle: "إسناد ومتابعة المهام اليومية",
        btnAddTask: "+ إسناد مهمة جديدة",
        colTaskTitle: "عنوان المهمة",
        colAssignedTo: "المسؤول عن التنفيذ",
        colDueDate: "تاريخ الإنجاز المطلوب",
        colTaskStatus: "حالة المهمة",
        taskPending: "قيد التنفيذ ⏳",
        taskDone: "تم الإنجاز ✅",

        // Locations
        loc_fridge: "ثلاجة",
        loc_shelf: "رف المحل",
        loc_shop_store: "مخزن المحلات",
        loc_big_warehouse: "مخزن الكبير",

        // Roles
        role_admin: "مدير عام",
        role_purchasing_manager: "مدير مشتريات",
        role_warehouse_manager: "مسؤول مخازن",
        role_cashier: "كاشير",

        // Units
        unit_g: "جرام (g)",
        unit_kg: "كيلوجرام (kg)",
        unit_ml: "مل (ml)",
        unit_l: "لتر (L)",
        unit_piece: "حبة (piece)",
        unit_package: "عبوة (package)",

        // General
        btnSave: "حفظ",
        btnUpdate: "تحديث",
        btnCancel: "إلغاء",
        btnDelete: "حذف",
        btnEdit: "تعديل",
        btnUndo: "تراجع",
        confirmDelete: "هل أنت متأكد من الحذف؟",
        savedSuccessfully: "تم الحفظ بنجاح!",
        permissionDenied: "عفواً، ليس لديك صلاحية للوصول إلى هذا القسم!"
    },
    en: {
        appTitle: "Inventory & Restaurant POS System",
        currency: "OMR",
        userRoleLabel: "Logged in as:",
        btnLogout: "Logout",
        btnLogin: "Login",
        
        // Navigation Tabs
        tabDashboard: "Dashboard",
        tabPurchases: "Purchases",
        tabExternalPurchases: "External Orders",
        tabIngredients: "Raw Materials",
        tabProducts: "Add Product",
        tabWarehouses: "Warehouses",
        tabRecipes: "Recipes",
        tabOrders: "Kitchen Orders",
        tabUsage: "POS (Usage)",
        tabWaste: "Log Waste",
        tabStocktake: "Monthly Stocktake",
        tabProfits: "Profits (Coming Soon)",
        tabStaffTasks: "Staff Management",

        // Branches
        branch_tahnah: "Tahnah",
        branch_katheeb: "Katheeb",
        branch_zafal: "Zafal",

        // Warehouses
        warehouse_1: "Warehouse 1",
        warehouse_2: "Warehouse 2",

        // Dashboard
        dashboardTitle: "Comprehensive Inventory Overview",
        filterBranchAll: "All Branches",
        filterCategoryAll: "All Categories",
        filterWarehouseAll: "All Warehouses",
        sortByQuantityAsc: "Stock: Low to High ⚠️",
        sortByQuantityDesc: "Stock: High to Low",
        sortByExpiry: "Expiry: Nearest First ⏳",
        sortDefault: "Default Sorting",
        colIngredient: "Ingredient",
        colCategory: "Category",
        colPurchased: "Total Purchased",
        colUsed: "Usage & Production",
        colWasted: "Wasted",
        colRemaining: "Remaining Stock",
        colExpiry: "Nearest Expiry",
        colStatus: "Status",
        statusLowStock: "Reorder Alert ⚠️",
        statusGoodStock: "In Stock ✅",
        statusExpired: "Expired ⛔",

        // Purchases
        purchasesTitle: "Purchases & Invoices Management",
        btnStockIn: "+ Log New Invoice",
        colDate: "Date",
        colBranch: "Branch",
        colLocation: "Storage Location",
        colQuantity: "Quantity",
        colUnitCost: "Unit Cost (OMR)",
        colTotalCost: "Total Cost (OMR)",
        colInvoiceImage: "Invoice",
        colApproval: "Manager Approval",
        colLoggedBy: "Logged By",
        colActions: "Actions",
        btnApprove: "Approve ✅",
        btnApproved: "Approved ✅",
        btnPendingApproval: "Pending Approval ⏳",
        viewInvoice: "View Invoice 📄",
        noInvoice: "No Image",

        // Multi-item Invoice Validation
        invoiceTotalRequired: "Please enter total invoice amount (OMR)",
        invoiceItemsCountRequired: "Please specify number of items in invoice",
        invoiceBalancedSuccess: "Invoice items & total are fully balanced ✅",
        invoiceUnbalancedWarning: "Warning: Added items count or sum does not match invoice total ⚠️",

        // Ingredients
        ingredientsTitle: "Raw Materials & Categories",
        btnAddIngredient: "+ Add Raw Product",
        btnManageCategories: "Manage Categories",
        colIngredientName: "Material Name",
        colProductType: "Product Type",
        colUnit: "Unit",
        colMinThreshold: "Reorder Alert Threshold",
        colWarehouse: "Assigned Warehouse",

        // Products & Packaging Management
        productsTitle: "Packaging & Products Directory",
        btnAddProduct: "+ Add New Product",
        colProductName: "Product / Packaging Name",

        // Warehouses
        warehousesTitle: "Warehouse & Category Assignments",
        btnAddWarehouse: "+ Add New Warehouse",

        // Recipes
        recipesTitle: "Recipes & Finished Products",
        btnCreateRecipe: "+ Create Recipe",
        lblRecipeYield: "Batch Yield / Count:",
        lblPieces: "pieces / portions",
        lblAvailablePieces: "Currently Available Pieces:",
        lblRecipeIngredients: "Ingredients per batch:",

        // Production Orders
        ordersTitle: "Production & Kitchen Orders",
        btnCreateOrder: "+ New Production Order",
        colOrderNo: "Order #",
        colRecipe: "Recipe / Product",
        colRequiredYield: "Required Pieces",
        colOrderStatus: "Status",
        orderStatusPending: "Pending ⏳",
        orderStatusInProgress: "In Preparation 👨‍🍳",
        orderStatusReady: "Ready for Delivery 📦",
        orderStatusDelivered: "Delivered & Complete ✅",

        // POS Quick Usage
        usageTitle: "Quick Point of Sale (POS)",
        clickToDeduct: "Click to deduct 1 unit from stock",
        usageLogTitle: "Recent Sales Log",
        colProduct: "Product",

        // Waste
        wasteTitle: "Waste & Spoilage Management",
        wasteIngredientsTab: "Raw Materials Waste",
        wasteRecipesTab: "Finished Recipe Waste (Audit)",
        lblWasteReason: "Waste Reason (Mandatory) *",
        wasteReasonRequiredAlert: "Please provide a waste reason, it is required!",
        wasteLogTitle: "Raw Materials Waste Log",
        recipeWasteLogTitle: "Finished Product Waste Log",
        colReason: "Waste Reason",
        colWastedYield: "Wasted Pieces",

        // Monthly Stocktake
        stocktakeTitle: "Monthly Stocktake & Rollover",
        stocktakeDesc: "Reconcile theoretical system inventory with physical count, document discrepancies, obtain manager approval, and rollover to the next month.",
        colTheoreticalQty: "Theoretical Qty",
        colPhysicalQty: "Physical Count",
        colDifference: "Difference",
        colDifferenceReason: "Shortage / Difference Reason",
        colManagerAudit: "Manager Audit",
        btnSaveStocktakeDraft: "Save Draft",
        btnCloseAndRollover: "Close Month & Rollover 🚀",
        rolloverHistoryTitle: "Monthly Audit Archives",
        colMonth: "Month",
        colRolloverDate: "Rollover Date",
        colNetCost: "Total Consumed Cost (OMR)",

        // Profits
        profitsTitle: "Profits & Financial Metrics",
        profitsComingSoonTitle: "Profits Section Coming Soon 📊",
        profitsComingSoonDesc: "Net profit calculations, operational costs, and profit margins per branch and item are being finalized and will be active soon.",

        // Staff & Roles
        staffTitle: "Staff & Permissions Management",
        btnAddEmployee: "+ Add New Employee",
        btnAddRole: "+ Add Custom Role",
        colEmployeeName: "Employee Name",
        colUsername: "Username",
        colRole: "Role / Position",
        colPermissions: "Allowed Tabs",
        tasksTitle: "Task Assignment & Tracking",
        btnAddTask: "+ Assign New Task",
        colTaskTitle: "Task Title",
        colAssignedTo: "Assigned To",
        colDueDate: "Due Date",
        colTaskStatus: "Status",
        taskPending: "In Progress ⏳",
        taskDone: "Done ✅",

        // Locations
        loc_fridge: "Refrigerator",
        loc_shelf: "Shop Shelf",
        loc_shop_store: "Shop Store",
        loc_big_warehouse: "Main Big Warehouse",

        // Roles
        role_admin: "General Manager",
        role_purchasing_manager: "Purchasing Manager",
        role_warehouse_manager: "Warehouse Supervisor",
        role_cashier: "Cashier",

        // Units
        unit_g: "g",
        unit_kg: "kg",
        unit_ml: "ml",
        unit_l: "L",
        unit_piece: "piece",
        unit_package: "package",

        // General
        btnSave: "Save",
        btnUpdate: "Update",
        btnCancel: "Cancel",
        btnDelete: "Delete",
        btnEdit: "Edit",
        btnUndo: "Undo",
        confirmDelete: "Are you sure you want to delete this item?",
        savedSuccessfully: "Saved successfully!",
        permissionDenied: "Sorry, you do not have permission to access this section!"
    }
};

let currentLang = 'ar';

function toggleLanguage() {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) toggleBtn.textContent = currentLang === 'ar' ? 'English' : 'عربي';

    applyTranslations();
}

function applyTranslations() {
    const dict = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'number' || el.type === 'password') && el.placeholder) {
                el.placeholder = dict[key];
            } else {
                el.textContent = dict[key];
            }
        }
    });
    
    if (window.renderAll) {
        window.renderAll();
    }
}

function getI18nText(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.addEventListener('click', toggleLanguage);
    applyTranslations();
});
