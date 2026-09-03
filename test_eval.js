
const fs = require('fs');

// Mock browser environment
const localStorageData = {};
global.localStorage = {
    getItem: (k) => localStorageData[k] || null,
    setItem: (k, v) => { localStorageData[k] = v; },
    removeItem: (k) => { delete localStorageData[k]; }
};
global.window = {
    whCategoryFilters: {},
    whSearchQueries: {},
    location: { hostname: 'localhost' },
    addEventListener: () => {},
    scrollTo: () => {}
};
global.document = {
    getElementById: (id) => ({
        innerHTML: '',
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        style: {},
        value: '',
        addEventListener: () => {}
    }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
};

// Load database.json into localStorage
const db = JSON.parse(fs.readFileSync('C:/Users/ahmed/.gemini/antigravity/scratch/inventory-system/database.json', 'utf8'));
Object.keys(db).forEach(k => {
    localStorageData[k] = JSON.stringify(db[k]);
});

// Load store.js
eval(fs.readFileSync('C:/Users/ahmed/.gemini/antigravity/scratch/inventory-system/js/store.js', 'utf8'));
global.Store = Store;

console.log('Warehouses in Store:', Store.getWarehouses().map(w => w.id));
console.log('Categories in Store:', Store.getCategories().length);
console.log('Ingredients in Store:', Store.getIngredients().length);

// Read app.js
const appCode = fs.readFileSync('C:/Users/ahmed/.gemini/antigravity/scratch/inventory-system/js/app.js', 'utf8');

// Try executing app.js inside function
try {
    eval(appCode);
    console.log('app.js evaluated successfully without syntax error!');
} catch(e) {
    console.error('app.js evaluation error:', e);
}
