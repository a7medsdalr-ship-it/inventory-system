/**
 * seed.js - Database Initializer with Clean Slate & Admin Account Only
 */

function seedDatabase() {
    let employees = Store.getEmployees();
    let admin = employees.find(e => e.username?.toLowerCase() === 'ahmed.admin');
    
    if (!admin || !admin.password) {
        if (!admin) {
            Store.saveEmployee({
                id: "admin-ahmed-master",
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
}

// Execute database seeding
seedDatabase();
