
global.window = { location: { hostname: 'localhost' } };
global.localStorage = {
    getItem: () => null,
    setItem: () => null,
    removeItem: () => null
};
global.document = {
    getElementById: () => null
};
require('./js/store.js');
console.log('Store loaded successfully in Node! Store methods count:', Object.keys(global.Store || Store).length);
