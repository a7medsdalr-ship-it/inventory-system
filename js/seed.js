/**
 * seed.js - Database Initializer with Clean Slate & Admin Account
 */

function seedDatabase() {
    let employees = Store.getEmployees();
    let admin = employees.find(e => e.username?.toLowerCase() === 'ahmed.admin');
    
    if (!admin || !admin.password) {
        if (!admin) {
            Store.saveEmployee({
                name: "أحمد بن سعيد",
                username: "Ahmed.admin",
                password: "aaaaaaaa",
                role: "admin",
                phone: "91234567",
                allowedTabs: ["all"]
            });
        } else {
            admin.password = "aaaaaaaa";
            Store.saveEmployee(admin);
        }
    }

    let extPurchases = Store.getExternalPurchases();
    if (!extPurchases || extPurchases.length === 0) {
        Store.saveExternalPurchase({
            itemName: "بيوريه مانجو طبيعي مركز",
            storeName: "متجر الفواكه الطبيعية - دبي",
            storePhone: "+971508899112",
            storeLocation: "دبي - سوق العوير المركزي",
            quantityRequested: 30,
            quantityReceived: 15,
            unit: "Liter",
            unitPrice: 2.800,
            totalCost: 84.000,
            targetWarehouseId: "wh2",
            status: "partial",
            orderDate: new Date(Date.now() - 3*86400000).toISOString().split('T')[0],
            expectedDate: new Date(Date.now() + 2*86400000).toISOString().split('T')[0],
            notes: "شحن مبرد عبر شركة النقل السريع - بوليصة رقم DXB-9921"
        });
        Store.saveExternalPurchase({
            itemName: "سيرب فانيليا فرنسي فاخر",
            storeName: "مؤسسة التوريد الدولي",
            storePhone: "+96894567890",
            storeLocation: "مسقط - منطقة الرسيل الصناعية",
            quantityRequested: 50,
            quantityReceived: 0,
            unit: "Liter",
            unitPrice: 3.200,
            totalCost: 160.000,
            targetWarehouseId: "wh2",
            status: "pending",
            orderDate: new Date(Date.now() - 1*86400000).toISOString().split('T')[0],
            expectedDate: new Date(Date.now() + 4*86400000).toISOString().split('T')[0],
            notes: "شحنة طلبيات خاصة لمشروبات الصيف"
        });
    }
}

// Execute database seeding
seedDatabase();
