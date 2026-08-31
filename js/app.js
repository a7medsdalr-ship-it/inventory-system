/**
 * app.js - Full Enterprise Application Logic with Auth, Balanced Invoices, Permissions, and Warehouses
 */

document.addEventListener('DOMContentLoaded', async () => {

    // ================= 1. DIRECT ACCESS & INITIALIZATION =================
    async function checkAuth() {
        try {
            // Immediately sync latest data from server
            await Store._syncFromServer();
        } catch(e) { console.error('checkAuth init error:', e); }

        const user = Store.getLoggedInUser();
        try { renderActiveUserHeader(); } catch (e) { console.error(e); }
        try { applyTabPermissions(user); } catch (e) { console.error(e); }
        try { renderAll(); } catch (e) { console.error(e); }
    }

    // Live Auto-Sync Background Loop (every 3.5s)
    setInterval(async () => {
        const activeEl = document.activeElement;
        const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
        if (!isTyping) {
            const hasChanges = await Store._syncFromServer();
            if (hasChanges) {
                renderAll();
                renderActiveUserHeader();
            }
        }
    }, 3500);

    // Sync on page focus / visibility change
    window.addEventListener('focus', async () => {
        const changed = await Store._syncFromServer();
        if (changed) renderAll();
    });
    document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
            const changed = await Store._syncFromServer();
            if (changed) renderAll();
        }
    });

    window.handleLogout = function() {
        Store.logout();
        const admin = Store.getEmployees().find(e => e.role === 'admin' || e.username === 'Ahmed.admin');
        if (admin) {
            Store.setLoggedInUser(admin);
            renderActiveUserHeader();
            applyTabPermissions(admin);
            renderAll();
            closeModal('login-switch-modal');
            showToast('تم تسجيل الخروج والعودة للوضع العام 🚪');
        }
    };

    function getUserAllowedBranches() {
        const user = Store.getLoggedInUser();
        if (!user || user.role === 'admin' || (user.allowedBranches && user.allowedBranches.includes('all'))) {
            return ['all', 'tahnah', 'katheeb', 'zafal'];
        }
        return (user.allowedBranches && user.allowedBranches.length > 0) ? user.allowedBranches : ['tahnah'];
    }

    function renderActiveUserHeader() {
        const user = Store.getLoggedInUser();
        const headerName = document.getElementById('header-user-name');
        const branchMap = { tahnah: 'محل طحنه', katheeb: 'محل كثيب', zafal: 'محل زعفل' };

        if (headerName && user) {
            const roleTitle = user.customRoleTitle || getI18nText('role_' + user.role) || user.role || 'موظف';
            let branchDisplay = '';
            if (user.role === 'admin' || (user.allowedBranches && user.allowedBranches.includes('all'))) {
                branchDisplay = '🌟 جميع المحلات';
            } else if (user.allowedBranches && user.allowedBranches.length > 0) {
                branchDisplay = user.allowedBranches.map(b => branchMap[b] || b).join(' • ');
            }
            headerName.textContent = branchDisplay ? `${user.name} (${branchDisplay})` : `${user.name} (${roleTitle})`;
        }
        const switchUserEl = document.getElementById('switch-modal-active-user');
        const switchRoleEl = document.getElementById('switch-modal-active-role');
        if (switchUserEl && user) switchUserEl.textContent = user.name;
        if (switchRoleEl && user) {
            let branchDisplay = '';
            if (user.role === 'admin' || (user.allowedBranches && user.allowedBranches.includes('all'))) {
                branchDisplay = '🌟 جميع المحلات';
            } else if (user.allowedBranches && user.allowedBranches.length > 0) {
                branchDisplay = user.allowedBranches.map(b => branchMap[b] || b).join(' • ');
            }
            const roleTitle = user.customRoleTitle || getI18nText('role_' + user.role) || user.role || 'موظف';
            switchRoleEl.textContent = branchDisplay ? `${roleTitle} • ${branchDisplay}` : roleTitle;
        }
    }

    // ================= 2. PERMISSIONS & TAB SWITCHING =================
    function applyTabPermissions(user) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item[data-mobile-tab]');
        const mobileDrawerTabs = document.querySelectorAll('.mobile-drawer-tab');
        const isFullAdmin = !user || user.role === 'admin' || (user.allowedTabs && user.allowedTabs.includes('all'));
        let firstAllowedTabId = null;

        // 1. Desktop Tab Buttons
        tabBtns.forEach(btn => {
            const tabId = btn.getAttribute('data-tab-id');
            if (!tabId) return;
            if (isFullAdmin || (user && user.allowedTabs && user.allowedTabs.includes(tabId))) {
                btn.classList.remove('hidden');
                if (!firstAllowedTabId) firstAllowedTabId = tabId;
            } else {
                btn.classList.add('hidden');
            }
        });

        // 2. Mobile Bottom Bar Items
        mobileNavItems.forEach(item => {
            const tabId = item.getAttribute('data-mobile-tab');
            if (!tabId) return;
            if (isFullAdmin || (user && user.allowedTabs && user.allowedTabs.includes(tabId))) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });

        // 3. Mobile Drawer Tabs
        mobileDrawerTabs.forEach(tab => {
            const tabId = tab.getAttribute('data-tab-target');
            if (!tabId) return;
            if (isFullAdmin || (user && user.allowedTabs && user.allowedTabs.includes(tabId))) {
                tab.style.display = 'flex';
            } else {
                tab.style.display = 'none';
            }
        });

        // Activate first allowed tab
        if (firstAllowedTabId) {
            switchTab(firstAllowedTabId);
        } else {
            switchTab('dashboard-tab');
        }
    }

    window.switchTab = function(targetTabId) {
        if (!targetTabId) return;
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

        // Update Desktop Tabs
        tabBtns.forEach(b => {
            if (b.getAttribute('data-tab-id') === targetTabId) {
                b.classList.add('bg-indigo-600', 'text-white');
                b.classList.remove('text-slate-600');
            } else {
                b.classList.remove('bg-indigo-600', 'text-white');
                b.classList.add('text-slate-600');
            }
        });

        // Close inventory dropdown menu when switching any tab
        const menu = document.getElementById('inventory-dropdown-menu');
        const chevron = document.getElementById('inventory-dropdown-chevron');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.add('hidden');
        }
        if (chevron) chevron.style.transform = 'rotate(0deg)';

        // Highlight parent "إدارة المخزون" dropdown button if current tab is one of the inventory sub-tabs
        const isInventorySubTab = (targetTabId === 'warehouse-1-tab' || targetTabId === 'warehouse-2-tab' || targetTabId === 'shelves-tab' || targetTabId === 'products-tab' || targetTabId === 'archive-tab' || targetTabId === 'product-report-tab');
        const invDropdownBtn = document.getElementById('inventory-dropdown-btn');
        if (invDropdownBtn) {
            if (isInventorySubTab) {
                invDropdownBtn.classList.add('bg-indigo-600', 'text-white');
                invDropdownBtn.classList.remove('text-slate-600');
            } else {
                invDropdownBtn.classList.remove('bg-indigo-600', 'text-white');
                invDropdownBtn.classList.add('text-slate-600');
            }
        }

        // Update Mobile Bottom Nav Items
        mobileNavItems.forEach(item => {
            if (item.getAttribute('data-mobile-tab') === targetTabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle Panes
        tabPanes.forEach(pane => {
            if (pane.id === targetTabId) {
                pane.classList.remove('hidden');
                pane.style.display = 'block';
            } else {
                pane.classList.add('hidden');
                pane.style.display = 'none';
            }
        });

        // Immediate tab specific rendering
        if (targetTabId === 'warehouse-1-tab' || targetTabId === 'warehouse-2-tab') {
            try { renderWarehousesTab(); } catch(e){ console.error("renderWarehousesTab error", e); }
        } else if (targetTabId === 'shelves-tab') {
            try { renderShelvesTab(); } catch(e){ console.error("renderShelvesTab error", e); }
        } else if (targetTabId === 'archive-tab') {
            try { renderArchiveTab(); } catch(e){ console.error("renderArchiveTab error", e); }
        } else if (targetTabId === 'product-report-tab') {
            try { renderProductReportTab(); } catch(e){ console.error("renderProductReportTab error", e); }
        } else if (targetTabId === 'products-tab') {
            try { renderProductsTab(); } catch(e){ console.error("renderProductsTab error", e); }
        } else if (targetTabId === 'stocktake-tab') {
            try { renderStocktakeTab(); } catch(e){ console.error("renderStocktakeTab error", e); }
            if (typeof window.switchStocktakeSection === 'function') {
                window.switchStocktakeSection(window.activeStocktakeSection || 'wh1');
            }
        } else if (targetTabId === 'dashboard-tab') {
            try { renderDashboard(); } catch(e){ console.error("renderDashboard error", e); }
        } else if (targetTabId === 'purchases-tab') {
            try { renderPurchasesTab(); } catch(e){ console.error("renderPurchasesTab error", e); }
        } else if (targetTabId === 'external-purchases-tab') {
            try { renderExternalPurchasesTab(); } catch(e){ console.error("renderExternalPurchasesTab error", e); }
        } else if (targetTabId === 'recipes-tab') {
            try { renderRecipesTab(); } catch(e){ console.error("renderRecipesTab error", e); }
        } else if (targetTabId === 'orders-tab') {
            try { renderOrdersTab(); } catch(e){ console.error("renderOrdersTab error", e); }
        } else if (targetTabId === 'usage-tab') {
            try { renderUsagePOS(); } catch(e){ console.error("renderUsagePOS error", e); }
        } else if (targetTabId === 'waste-tab') {
            try { renderWasteTab(); } catch(e){ console.error("renderWasteTab error", e); }
        } else if (targetTabId === 'staff-tasks-tab') {
            try { renderStaffAndTasks(); } catch(e){ console.error("renderStaffAndTasks error", e); }
        }

        // Smooth scroll to top of page on mobile
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
    };
    const switchTab = window.switchTab;

    document.querySelectorAll('.tab-btn[data-tab-id]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tabId = btn.getAttribute('data-tab-id');
            if (tabId) {
                switchTab(tabId);
                await Store._syncFromServer();
                renderAll();
            }
        });
    });

    // Mobile Bottom Nav Click Handlers
    document.querySelectorAll('.mobile-nav-item[data-mobile-tab]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const tabId = btn.getAttribute('data-mobile-tab');
            switchTab(tabId);
            await Store._syncFromServer();
            renderAll();
        });
    });

    // Mobile Drawer Open / Close Handlers
    window.openMobileDrawer = function() {
        const drawer = document.getElementById('mobile-drawer');
        const overlay = document.getElementById('mobile-drawer-overlay');
        if (drawer && overlay) {
            overlay.classList.remove('hidden');
            drawer.classList.remove('drawer-closed');
            drawer.classList.add('drawer-open');
        }
    };

    window.closeMobileDrawer = function() {
        const drawer = document.getElementById('mobile-drawer');
        const overlay = document.getElementById('mobile-drawer-overlay');
        if (drawer && overlay) {
            drawer.classList.remove('drawer-open');
            drawer.classList.add('drawer-closed');
            setTimeout(() => overlay.classList.add('hidden'), 250);
        }
    };

    document.getElementById('mobile-more-btn')?.addEventListener('click', openMobileDrawer);
    document.getElementById('close-mobile-drawer-btn')?.addEventListener('click', closeMobileDrawer);
    document.getElementById('mobile-drawer-overlay')?.addEventListener('click', closeMobileDrawer);

    // Mobile Drawer Tabs Click
    document.querySelectorAll('.mobile-drawer-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab-target');
            closeMobileDrawer();
            switchTab(tabId);
            renderAll();
        });
    });

    // PWA Installation Prompt Handler
    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.classList.remove('hidden');
    });

    document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
                showToast('✅ تم تثبيت التطبيق بنجاح على شاشة الجوال!');
            }
            deferredInstallPrompt = null;
        } else {
            alert('لتثبيت التطبيق على الجوال:\n- في الآيفون (Safari): اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية".\n- في الأندرويد (Chrome): اضغط على القائمة (⋮) ثم "تثبيت التطبيق".');
        }
    });

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.log('ServiceWorker registration skipped in local mode', err);
        });
    }

    // ================= 3. CORE INVENTORY CALCULATIONS =================
    function getCurrentMonthKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function calculateInventory(filterBranch = 'all', filterWarehouse = 'all', targetMonthKey = null) {
        const ingredients = Store.getIngredients();
        const purchases = Store.getPurchases();
        const recipes = Store.getRecipes();
        const usageLogs = Store.getUsageLogs();
        const rawWasteLogs = Store.getWasteLogs();
        const orders = Store.getProductionOrders();

        const monthKey = targetMonthKey || getCurrentMonthKey();
        const openingBalances = Store.getOpeningBalances(monthKey) || {};

        const inventory = {};
        ingredients.forEach(ing => {
            let openQty = 0;
            if (filterBranch === 'tahnah') openQty = openingBalances['shelf-tahnah']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else if (filterBranch === 'katheeb') openQty = openingBalances['shelf-katheeb']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else if (filterBranch === 'zafal') openQty = openingBalances['shelf-zafal']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else if (filterWarehouse === 'wh-1' || filterWarehouse === '6a3dfi5flmsvn4x9q') openQty = openingBalances['wh-1']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else if (filterWarehouse === 'wh-2' || filterWarehouse === 'n8825cuynmsvn4x9q') openQty = openingBalances['wh-2']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else {
                if (openingBalances['wh-1'] || openingBalances['shelf-tahnah']) {
                    openQty = (openingBalances['wh-1']?.[ing.id] || 0) +
                              (openingBalances['wh-2']?.[ing.id] || 0) +
                              (openingBalances['shelf-tahnah']?.[ing.id] || 0) +
                              (openingBalances['shelf-katheeb']?.[ing.id] || 0) +
                              (openingBalances['shelf-zafal']?.[ing.id] || 0);
                } else {
                    openQty = parseFloat(openingBalances[ing.id]) || 0;
                }
            }

            openQty = parseFloat(openQty) || 0;

            inventory[ing.id] = {
                ...ing,
                openingBalance: openQty,
                totalPurchased: 0,
                totalAvailable: openQty,
                totalUsed: 0,
                totalWasted: 0,
                remaining: openQty,
                nearestExpiry: null,
                totalCostValue: 0
            };
        });

        // 1. Process Purchases (supports both structured invoice.items and flat purchases)
        purchases.forEach(p => {
            if (p.items && Array.isArray(p.items)) {
                p.items.forEach(item => {
                    const itemBranch = item.branch || p.branch;
                    if (filterBranch !== 'all' && itemBranch !== filterBranch) return;
                    if (inventory[item.ingredientId]) {
                        const qty = parseFloat(item.quantity) || 0;
                        inventory[item.ingredientId].totalPurchased += qty;
                        inventory[item.ingredientId].totalCostValue += (parseFloat(item.totalCost) || (qty * (parseFloat(item.unitCost) || 0)));

                        if (item.expiryDate) {
                            const pDate = new Date(item.expiryDate);
                            if (!inventory[item.ingredientId].nearestExpiry || pDate < new Date(inventory[item.ingredientId].nearestExpiry)) {
                                inventory[item.ingredientId].nearestExpiry = item.expiryDate;
                            }
                        }
                    }
                });
            } else {
                if (filterBranch !== 'all' && p.branch !== filterBranch) return;
                if (inventory[p.ingredientId]) {
                    const qty = parseFloat(p.quantity) || 0;
                    inventory[p.ingredientId].totalPurchased += qty;
                    inventory[p.ingredientId].totalCostValue += (parseFloat(p.totalCost) || (qty * (parseFloat(p.unitCost) || 0)));

                    if (p.expiryDate) {
                        const pDate = new Date(p.expiryDate);
                        if (!inventory[p.ingredientId].nearestExpiry || pDate < new Date(inventory[p.ingredientId].nearestExpiry)) {
                            inventory[p.ingredientId].nearestExpiry = p.expiryDate;
                        }
                    }
                }
            }
        });

        // 2. Process Raw Waste (only raw waste deducts from materials)
        rawWasteLogs.forEach(w => {
            if (inventory[w.ingredientId]) {
                inventory[w.ingredientId].totalWasted += (parseFloat(w.quantity) || 0);
            }
        });

        // 3. Process POS Usage
        usageLogs.forEach(log => {
            const recipe = recipes.find(r => r.id === log.recipeId);
            if (recipe) {
                const batchYield = parseFloat(recipe.yield) || 1;
                const piecesProduced = parseFloat(log.quantityProduced) || 1;
                const batchesCount = piecesProduced / batchYield;

                recipe.ingredients.forEach(ri => {
                    if (inventory[ri.ingredientId]) {
                        inventory[ri.ingredientId].totalUsed += ((parseFloat(ri.quantityPerUnit) || 0) * batchesCount);
                    }
                });
            }
        });

        // 4. Process Completed Kitchen Orders
        orders.forEach(order => {
            if (order.status === 'delivered') {
                const recipe = recipes.find(r => r.id === order.recipeId);
                if (recipe) {
                    const batchYield = parseFloat(recipe.yield) || 1;
                    const pieces = parseFloat(order.quantity) || 0;
                    const batchesCount = pieces / batchYield;

                    recipe.ingredients.forEach(ri => {
                        if (inventory[ri.ingredientId]) {
                            inventory[ri.ingredientId].totalUsed += ((parseFloat(ri.quantityPerUnit) || 0) * batchesCount);
                        }
                    });
                }
            }
        });

        // 5. Calculate Remaining Stock
        Object.values(inventory).forEach(inv => {
            inv.totalAvailable = Math.round((inv.openingBalance + inv.totalPurchased) * 1000) / 1000;
            inv.remaining = Math.max(0, inv.totalAvailable - inv.totalUsed - inv.totalWasted);
            inv.remaining = Math.round(inv.remaining * 1000) / 1000;
        });

        return inventory;
    }

    // ================= 4. DASHBOARD RENDERING =================
    function renderDashboard() {
        const tbody = document.getElementById('dashboard-table-body');
        if (!tbody) return;

        const branchFilter = document.getElementById('dash-filter-branch')?.value || 'all';
        const categoryFilter = document.getElementById('dash-filter-category')?.value || 'all';
        const warehouseFilter = document.getElementById('dash-filter-warehouse')?.value || 'all';
        const sortBy = document.getElementById('dash-sort-by')?.value || 'default';

        const rawInventory = calculateInventory(branchFilter, warehouseFilter);
        const categories = Store.getCategories();
        let items = Object.values(rawInventory);

        // Filter Category
        if (categoryFilter !== 'all') {
            items = items.filter(i => i.categoryId === categoryFilter);
        }
        // Filter Warehouse
        if (warehouseFilter !== 'all') {
            items = items.filter(i => i.warehouseId === warehouseFilter);
        }

        // Sorting
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (sortBy === 'qty-asc') {
            items.sort((a, b) => a.remaining - b.remaining);
        } else if (sortBy === 'qty-desc') {
            items.sort((a, b) => b.remaining - a.remaining);
        } else if (sortBy === 'expiry') {
            items.sort((a, b) => {
                if (!a.nearestExpiry) return 1;
                if (!b.nearestExpiry) return -1;
                return new Date(a.nearestExpiry) - new Date(b.nearestExpiry);
            });
        }

        // Reorder Alert Threshold Verification
        const lowStockItems = items.filter(inv => inv.remaining <= (parseFloat(inv.minThreshold) || 5));
        const alertBox = document.getElementById('dash-reorder-alert-box');
        const alertText = document.getElementById('dash-reorder-alert-text');

        if (lowStockItems.length > 0) {
            alertBox.classList.remove('hidden');
            alertText.textContent = `المواد التي تحتاج إعادة طلب فوراً: ${lowStockItems.map(i => i.name).join(' ، ')}`;
        } else {
            alertBox.classList.add('hidden');
        }

        // Metrics
        let expiringSoonCount = 0;
        items.forEach(inv => {
            if (inv.nearestExpiry) {
                const exp = new Date(inv.nearestExpiry);
                const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                if (diffDays >= 0 && diffDays <= 7) expiringSoonCount++;
            }
        });

        document.getElementById('stat-total-items').textContent = items.length;
        document.getElementById('stat-expiring-soon').textContent = expiringSoonCount;
        document.getElementById('stat-pending-approvals').textContent = Store.getPurchases().filter(p => !p.isApproved).length;
        document.getElementById('stat-pending-orders').textContent = Store.getProductionOrders().filter(o => o.status !== 'delivered').length;

        tbody.innerHTML = items.map(inv => {
            const cat = categories.find(c => c.id === inv.categoryId);
            const catName = cat ? cat.name : 'عام';
            const unit = getI18nText('unit_' + inv.unit);
            const minThreshold = parseFloat(inv.minThreshold) || 5;

            // Status Badge
            let statusBadge = '<span class="badge-pill bg-emerald-100 text-emerald-800">متوفر جيداً ✅</span>';
            if (inv.remaining <= minThreshold) {
                statusBadge = '<span class="badge-pill bg-rose-100 text-rose-800 pulse-alert">تنبيه: شراء المزيد ⚠️</span>';
            }

            // Expiry Badge
            let expiryHtml = '<span class="text-slate-400">-</span>';
            if (inv.nearestExpiry) {
                const expDate = new Date(inv.nearestExpiry);
                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    expiryHtml = `<span class="badge-pill bg-rose-100 text-rose-800" dir="ltr">${inv.nearestExpiry} (منتهي ⛔)</span>`;
                    statusBadge = '<span class="badge-pill bg-rose-100 text-rose-800">منتهي الصلاحية ⛔</span>';
                } else if (diffDays <= 7) {
                    expiryHtml = `<span class="badge-pill bg-amber-100 text-amber-800" dir="ltr">${inv.nearestExpiry} (متبقي ${diffDays} يوم)</span>`;
                } else {
                    expiryHtml = `<span class="badge-pill bg-slate-100 text-slate-700" dir="ltr">${inv.nearestExpiry}</span>`;
                }
            }

            return `
                <tr class="hover:bg-slate-50 transition ${inv.remaining <= minThreshold ? 'bg-rose-50/20' : ''}">
                    <td class="px-4 py-3 font-bold text-slate-900">${inv.name}</td>
                    <td class="px-4 py-3"><span class="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700">${catName}</span></td>
                    <td class="px-4 py-3 text-slate-600" dir="ltr">${inv.totalPurchased} ${unit}</td>
                    <td class="px-4 py-3 text-slate-600" dir="ltr">${inv.totalUsed} ${unit}</td>
                    <td class="px-4 py-3 text-rose-600 font-medium" dir="ltr">${inv.totalWasted} ${unit}</td>
                    <td class="px-4 py-3 font-black ${inv.remaining <= minThreshold ? 'text-rose-600 text-base' : 'text-slate-900'}" dir="ltr">${inv.remaining} ${unit}</td>
                    <td class="px-4 py-3 text-xs font-bold text-slate-500" dir="ltr">${minThreshold} ${unit}</td>
                    <td class="px-4 py-3">${expiryHtml}</td>
                    <td class="px-4 py-3">${statusBadge}</td>
                </tr>
            `;
        }).join('');
    }

    // ================= 5. PURCHASES & BALANCED INVOICE MODAL =================
    function getBranchBadgeHtml(branchCode) {
        if (branchCode === 'tahnah') return '<span class="badge-pill badge-branch-tahnah">طحنه</span>';
        if (branchCode === 'katheeb') return '<span class="badge-pill badge-branch-katheeb">كثيب</span>';
        if (branchCode === 'zafal') return '<span class="badge-pill badge-branch-zafal">زعفل</span>';
        return `<span class="badge-pill bg-slate-100 text-slate-800">${branchCode}</span>`;
    }

    function getInvoiceBranchesBadgesHtml(p) {
        if ((p.isConsumable || p.type === 'consumable') && p.branchBreakdown && p.branchBreakdown.length > 0) {
            const activeBranches = p.branchBreakdown.filter(b => parseFloat(b.amount || 0) > 0);
            if (activeBranches.length > 0) {
                return `<div class="flex flex-wrap items-center gap-1.5">
                    ${activeBranches.map(b => getBranchBadgeHtml(b.branch)).join('')}
                </div>`;
            }
        }

        const items = (p.items && Array.isArray(p.items) && p.items.length > 0) ? p.items : [p];
        const branches = Array.from(new Set(items.map(item => item.branch || p.branch || 'tahnah')));
        
        return `<div class="flex flex-wrap items-center gap-1.5">
            ${branches.map(b => getBranchBadgeHtml(b)).join('')}
        </div>`;
    }

    function getBranchName(code) {
        if (code === 'tahnah') return 'طحنه';
        if (code === 'katheeb') return 'كثيب';
        if (code === 'zafal') return 'زعفل';
        return code || 'الفرع';
    }

    // --- Daily Grouping & Date Filter State ---
    window.currentPurchasesFilterDate = 'all';
    window.dailyExpandedState = {};

    window.filterPurchasesByDate = function(dateStr) {
        window.currentPurchasesFilterDate = dateStr ? dateStr.trim() : 'all';
        highlightDateFilterButton(dateStr ? 'custom' : 'all');
        renderPurchasesTab();
    };

    window.setPurchasesDateFilter = function(type) {
        const dateInput = document.getElementById('pur-search-date');
        const now = new Date();

        if (type === 'today') {
            const todayStr = now.toISOString().split('T')[0];
            window.currentPurchasesFilterDate = todayStr;
            if (dateInput) dateInput.value = todayStr;
            highlightDateFilterButton('today');
        } else if (type === 'yesterday') {
            const yest = new Date(Date.now() - 86400000);
            const yestStr = yest.toISOString().split('T')[0];
            window.currentPurchasesFilterDate = yestStr;
            if (dateInput) dateInput.value = yestStr;
            highlightDateFilterButton('yesterday');
        } else if (type === 'month') {
            const monthStr = now.toISOString().slice(0, 7);
            window.currentPurchasesFilterDate = 'month:' + monthStr;
            if (dateInput) dateInput.value = '';
            highlightDateFilterButton('month');
        } else {
            window.currentPurchasesFilterDate = 'all';
            if (dateInput) dateInput.value = '';
            highlightDateFilterButton('all');
        }

        renderPurchasesTab();
    };

    function highlightDateFilterButton(activeType) {
        const btnToday = document.getElementById('pur-btn-today');
        const btnYest = document.getElementById('pur-btn-yesterday');
        const btnMonth = document.getElementById('pur-btn-month');
        const btnAll = document.getElementById('pur-btn-all');

        const activeClass = 'bg-indigo-600 text-white shadow-xs';
        const inactiveClass = 'bg-slate-100 hover:bg-slate-200 text-slate-700';

        [btnToday, btnYest, btnMonth, btnAll].forEach(btn => {
            if (btn) {
                btn.className = `font-bold px-3 py-1.5 rounded-xl text-xs transition ${inactiveClass}`;
            }
        });

        if (activeType === 'today' && btnToday) btnToday.className = `font-bold px-3 py-1.5 rounded-xl text-xs transition ${activeClass}`;
        if (activeType === 'yesterday' && btnYest) btnYest.className = `font-bold px-3 py-1.5 rounded-xl text-xs transition ${activeClass}`;
        if (activeType === 'month' && btnMonth) btnMonth.className = `font-bold px-3 py-1.5 rounded-xl text-xs transition ${activeClass}`;
        if (activeType === 'all' && btnAll) btnAll.className = `font-bold px-3 py-1.5 rounded-xl text-xs transition ${activeClass}`;
    }

    window.toggleDailyGroup = function(dayKey) {
        const bodyEl = document.getElementById(`daily-body-${dayKey}`);
        const arrowEl = document.getElementById(`daily-arrow-${dayKey}`);
        if (!bodyEl) return;

        const isCurrentlyHidden = bodyEl.classList.contains('hidden');
        if (isCurrentlyHidden) {
            bodyEl.classList.remove('hidden');
            if (arrowEl) arrowEl.classList.add('rotate-180');
            window.dailyExpandedState[dayKey] = true;
        } else {
            bodyEl.classList.add('hidden');
            if (arrowEl) arrowEl.classList.remove('rotate-180');
            window.dailyExpandedState[dayKey] = false;
        }
    };

    function renderPurchasesTab() {
        const container = document.getElementById('purchases-daily-container');
        if (!container) return;

        const allPurchases = Store.getPurchases();
        const user = Store.getLoggedInUser();
        const todayStr = new Date().toISOString().split('T')[0];
        const yestStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Filter purchases based on selected date
        let filteredPurchases = allPurchases;
        const filter = window.currentPurchasesFilterDate || 'all';

        if (filter !== 'all') {
            if (filter.startsWith('month:')) {
                const monthPrefix = filter.replace('month:', '');
                filteredPurchases = allPurchases.filter(p => (p.dateAdded || '').startsWith(monthPrefix));
            } else {
                filteredPurchases = allPurchases.filter(p => (p.dateAdded || '').startsWith(filter));
            }
        }

        // Calculate overall filtered summary
        let overallTotal = 0;
        filteredPurchases.forEach(p => { overallTotal += parseFloat(p.totalCost || 0); });
        overallTotal = Math.round(overallTotal * 1000) / 1000;

        const summaryTotalEl = document.getElementById('pur-summary-total');
        const summaryCountEl = document.getElementById('pur-summary-count');
        const summaryLabelEl = document.getElementById('pur-summary-label');

        if (summaryTotalEl) summaryTotalEl.textContent = `${overallTotal.toFixed(3)} ر.ع`;
        if (summaryCountEl) summaryCountEl.textContent = `${filteredPurchases.length} ${filteredPurchases.length > 1 ? 'فواتير' : 'فاتورة'}`;
        if (summaryLabelEl) {
            if (filter === 'all') {
                summaryLabelEl.textContent = 'إجمالي مبالغ كافة الفواتير:';
            } else if (filter === todayStr) {
                summaryLabelEl.textContent = 'إجمالي مبالغ فواتير اليوم:';
            } else if (filter === yestStr) {
                summaryLabelEl.textContent = 'إجمالي مبالغ فواتير أمس:';
            } else if (filter.startsWith('month:')) {
                summaryLabelEl.textContent = 'إجمالي فواتير هذا الشهر:';
            } else {
                summaryLabelEl.textContent = `إجمالي فواتير تاريخ (${filter}):`;
            }
        }

        if (filteredPurchases.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs">
                    <span class="text-4xl block mb-3">📅</span>
                    <h3 class="font-black text-slate-800 text-base mb-1">لا توجد فواتير مسجلة ${filter !== 'all' ? `في هذا التاريخ (${filter})` : 'حتى الآن'}</h3>
                    <p class="text-xs text-slate-500 mb-4">اضغط على زر "+ تسجيل فاتورة جديدة" لإضافة أول فاتورة أو اختر "عرض الكل" لمشاهدة جميع الأيام.</p>
                    ${filter !== 'all' ? `<button onclick="setPurchasesDateFilter('all')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-xl text-xs transition">عرض كافة الأيام ↺</button>` : ''}
                </div>
            `;
            return;
        }

        // Group filtered purchases by day (YYYY-MM-DD)
        const groups = {};
        filteredPurchases.forEach(p => {
            const dayKey = (p.dateAdded || new Date().toISOString()).split('T')[0];
            if (!groups[dayKey]) groups[dayKey] = [];
            groups[dayKey].push(p);
        });

        // Sort days descending (most recent day first)
        const sortedDays = Object.keys(groups).sort((a, b) => b.localeCompare(a));

        container.innerHTML = sortedDays.map((dayKey, index) => {
            const dayPurchases = groups[dayKey];
            let dayTotal = 0;
            dayPurchases.forEach(p => { dayTotal += parseFloat(p.totalCost || 0); });
            dayTotal = Math.round(dayTotal * 1000) / 1000;

            const isToday = (dayKey === todayStr);
            const isYesterday = (dayKey === yestStr);

            // Format date nicely in Arabic
            const dateObj = new Date(dayKey + 'T12:00:00');
            const dayFormatted = dateObj.toLocaleDateString('ar-OM', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            // Expanded state: first day or searched day is open by default, unless user collapsed it
            let isExpanded = (window.dailyExpandedState[dayKey] !== undefined) 
                ? window.dailyExpandedState[dayKey] 
                : (index === 0 || filter !== 'all');

            const rowsHtml = dayPurchases.slice().reverse().map(p => {
                const items = (p.items && Array.isArray(p.items)) ? p.items : [p];
                const itemCount = items.length;

                // Approval Status Badge
                let approvalHtml = '';
                if (p.isApproved) {
                    approvalHtml = `
                        <div class="flex flex-col items-start gap-0.5">
                            <span class="badge-pill bg-emerald-100 text-emerald-800 font-bold">معتمد ✅</span>
                            <span class="text-[10px] text-slate-400">${p.approvedBy || 'المدير العام'}</span>
                        </div>
                    `;
                } else {
                    if (user && user.role === 'admin') {
                        approvalHtml = `
                            <button onclick="event.stopPropagation(); togglePurchaseApproval('${p.id}')" class="badge-pill bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold transition" title="انقر للاعتماد الفوري">
                                بانتظار الاعتماد ⏳ (اعتماد)
                            </button>
                        `;
                    } else {
                        approvalHtml = `<span class="badge-pill bg-amber-50 text-amber-700 font-bold">بانتظار اعتماد المدير ⏳</span>`;
                    }
                }

                const invoiceTotal = parseFloat(p.totalCost || 0).toFixed(3);
                const timeStr = new Date(p.dateAdded || Date.now()).toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' });

                const isConsumable = p.isConsumable || p.type === 'consumable';
                const editFunctionCall = isConsumable ? `editConsumablePurchase('${p.id}')` : `editPurchaseInvoice('${p.id}')`;

                let productsColumnHtml = '';
                if (isConsumable) {
                    productsColumnHtml = `
                        <span class="badge-pill bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs inline-flex items-center gap-1 shadow-2xs">
                            <span>🛍️</span> <span>${p.productName || 'مادة استهلاكية'}</span>
                        </span>
                    `;
                } else {
                    productsColumnHtml = `
                        <span class="badge-pill bg-slate-100 text-slate-800 font-bold text-xs inline-flex items-center gap-1">
                            <span>📦</span> <span>${itemCount} ${itemCount > 1 ? 'منتجات' : 'منتج'}</span>
                        </span>
                    `;
                }

                return `
                    <tr class="hover:bg-indigo-50/40 transition group">
                        <!-- 1. رقم الفاتورة والوقت -->
                        <td class="px-4 py-3">
                            <span class="font-mono font-bold text-indigo-900 text-xs sm:text-sm block">${p.invoiceNo || 'INV-000'}</span>
                            <span class="text-[11px] text-slate-500 font-medium block mt-0.5">${timeStr}</span>
                        </td>
                        <!-- 2. اسم المحل أو الفرع -->
                        <td class="px-4 py-3">${getInvoiceBranchesBadgesHtml(p)}</td>
                        <!-- 3. عدد المنتجات أو البيان -->
                        <td class="px-4 py-3">
                            ${productsColumnHtml}
                        </td>
                        <!-- 4. السعر الإجمالي (ر.ع) -->
                        <td class="px-4 py-3">
                            <span class="font-black ${isConsumable ? 'text-amber-800' : 'text-indigo-700'} font-mono text-sm sm:text-base">${invoiceTotal} ر.ع</span>
                        </td>
                        <!-- 5. التفاصيل -->
                        <td class="px-4 py-3">
                            <button onclick="event.stopPropagation(); viewInvoiceDetails('${p.id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-2xs">
                                <span>عرض التفاصيل</span> <span>🔍</span>
                            </button>
                        </td>
                        <!-- 6. حالة الاعتماد -->
                        <td class="px-4 py-3">${approvalHtml}</td>
                        <!-- 7. سجل بواسطة -->
                        <td class="px-4 py-3 text-xs text-slate-500 font-medium">${p.loggedBy || '-'}</td>
                        <!-- 8. الإجراءات (تعديل وحذف) -->
                        <td class="px-4 py-3" onclick="event.stopPropagation()">
                            <div class="flex items-center gap-1.5">
                                <button onclick="${editFunctionCall}" class="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-2.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-2xs" title="تعديل الفاتورة">
                                    <span>تعديل</span> <span>✏️</span>
                                </button>
                                <button onclick="deletePurchase('${p.id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-2xs" title="حذف الفاتورة">
                                    <span>حذف</span> <span>🗑️</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden transition hover:border-indigo-200">
                    <!-- Daily Header (Click to Open / Close this Day's Box) -->
                    <div onclick="toggleDailyGroup('${dayKey}')" class="p-3.5 sm:p-4 bg-slate-50/90 hover:bg-indigo-50/50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 transition">
                        <div class="flex items-center gap-3">
                            <span class="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base shadow-2xs">📅</span>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="font-black text-slate-900 text-sm sm:text-base">${dayFormatted}</h3>
                                    ${isToday ? '<span class="badge-pill bg-emerald-600 text-white text-[10px] font-bold">اليوم</span>' : ''}
                                    ${isYesterday ? '<span class="badge-pill bg-amber-500 text-white text-[10px] font-bold">أمس</span>' : ''}
                                </div>
                                <span class="text-[11px] text-slate-500 font-bold">عدد فواتير هذا اليوم: <span class="text-slate-800 font-mono">${dayPurchases.length}</span></span>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                            <div class="text-start sm:text-end">
                                <span class="text-[11px] text-slate-500 font-bold block">إجمالي مبالغ هذا اليوم:</span>
                                <span class="text-base sm:text-lg font-black text-emerald-700 font-mono">${dayTotal.toFixed(3)} ر.ع</span>
                            </div>
                            <span id="daily-arrow-${dayKey}" class="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold transition transform shadow-2xs ${isExpanded ? 'rotate-180' : ''}">
                                ▼
                            </span>
                        </div>
                    </div>

                    <!-- Daily Table Body (Collapsible) -->
                    <div id="daily-body-${dayKey}" class="${isExpanded ? '' : 'hidden'} overflow-x-auto">
                        <table class="min-w-full divide-y divide-slate-200 text-xs sm:text-sm">
                            <thead class="bg-slate-50">
                                <tr>
                                    <th class="px-4 py-2.5 text-start font-bold text-slate-700">رقم الفاتورة والوقت</th>
                                    <th class="px-4 py-2.5 text-start font-bold text-slate-700">اسم المحل أو الفرع</th>
                                    <th class="px-4 py-2.5 text-start font-bold text-slate-700">عدد المنتجات</th>
                                    <th class="px-4 py-2.5 text-start font-bold text-slate-700">السعر الإجمالي (ر.ع)</th>
                                    <th class="px-4 py-2.5 text-start font-bold text-slate-700">التفاصيل</th>
                                    <th class="px-4 py-2.5 text-start font-bold text-slate-700">حالة الاعتماد</th>
                                    <th class="px-4 py-2.5 text-start font-bold text-slate-700">سجل بواسطة</th>
                                    <th class="px-4 py-2.5 text-start font-bold text-slate-700">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.togglePurchaseApproval = function(id) {
        const user = Store.getLoggedInUser();
        if (user && user.role !== 'admin') {
            alert(getI18nText('permissionDenied'));
            return;
        }
        Store.togglePurchaseApproval(id, `${user.name} (المدير العام)`);
        renderPurchasesTab();
        renderDashboard();
    };

    window.deletePurchase = function(id) {
        if (confirm(getI18nText('confirmDelete'))) {
            Store.deletePurchase(id);
            renderAll();
        }
    };

    // Modal: Detailed Invoice Breakdown
    window.viewInvoiceDetails = function(purchaseId) {
        const p = Store.getPurchases().find(item => item.id === purchaseId);
        if (!p) return;

        const ingredients = Store.getIngredients();
        const categories = Store.getCategories();
        const user = Store.getLoggedInUser();
        const items = (p.items && Array.isArray(p.items)) ? p.items : [p];

        document.getElementById('detail-invoice-no').textContent = p.invoiceNo || 'INV-000';
        document.getElementById('detail-invoice-branch').innerHTML = getInvoiceBranchesBadgesHtml(p);
        document.getElementById('detail-invoice-total').textContent = `${parseFloat(p.totalCost || 0).toFixed(3)} ر.ع`;
        document.getElementById('detail-invoice-date').textContent = new Date(p.dateAdded || Date.now()).toLocaleString('ar-OM');
        
        // Status
        if (p.isApproved) {
            document.getElementById('detail-invoice-status').innerHTML = `<span class="badge-pill bg-emerald-100 text-emerald-800 font-bold">معتمد ✅ (${p.approvedBy || 'المدير العام'})</span>`;
        } else {
            document.getElementById('detail-invoice-status').innerHTML = `<span class="badge-pill bg-amber-100 text-amber-900 font-bold">بانتظار الاعتماد ⏳</span>`;
        }

        // Image
        const imgContainer = document.getElementById('detail-invoice-image-container');
        const imgEl = document.getElementById('detail-invoice-img');
        if (p.invoiceImage) {
            imgEl.src = p.invoiceImage;
            imgContainer.classList.remove('hidden');
        } else {
            imgContainer.classList.add('hidden');
        }

        // Items count
        document.getElementById('detail-invoice-items-count').textContent = `${items.length} ${items.length > 1 ? 'منتجات ومكونات' : 'منتج'}`;

        // Table Body
        const itemsTbody = document.getElementById('detail-invoice-items-body');
        const isConsumable = p.isConsumable || p.type === 'consumable';

        if (isConsumable) {
            const activeBreakdown = (p.branchBreakdown && p.branchBreakdown.length > 0) 
                ? p.branchBreakdown.filter(b => parseFloat(b.amount || 0) > 0) 
                : [{ branch: p.branch || 'tahnah', amount: p.totalCost }];

            document.getElementById('detail-invoice-items-count').textContent = `${activeBreakdown.length} ${activeBreakdown.length > 1 ? 'فروع مستهلكة' : 'فرع مستهلك'}`;
            
            itemsTbody.innerHTML = activeBreakdown.map((b, idx) => `
                <tr class="hover:bg-amber-50/50">
                    <td class="px-3 py-2.5 font-bold text-amber-700">${idx + 1}</td>
                    <td class="px-3 py-2.5">
                        <span class="font-bold text-slate-900 block">${p.productName || 'مادة استهلاكية عامة'}</span>
                        <span class="badge-pill bg-amber-100 text-amber-800 text-[10px] font-bold">فاتورة استهلاكية 🛍️</span>
                    </td>
                    <td class="px-3 py-2.5 text-slate-600">مواد استهلاكية ومصاريف</td>
                    <td class="px-3 py-2.5 text-slate-600 font-bold">
                        <span class="badge-pill badge-branch-${b.branch}">${getBranchName(b.branch)}</span>
                    </td>
                    <td class="px-3 py-2.5 font-bold text-slate-800" dir="ltr">حصة فرع ${getBranchName(b.branch)}</td>
                    <td class="px-3 py-2.5 font-mono font-bold text-slate-700" dir="ltr">${parseFloat(b.amount || 0).toFixed(3)} ر.ع</td>
                    <td class="px-3 py-2.5 font-mono font-black text-amber-800" dir="ltr">${parseFloat(b.amount || 0).toFixed(3)} ر.ع</td>
                    <td class="px-3 py-2.5 text-slate-400">-</td>
                </tr>
            `).join('');
        } else {
            document.getElementById('detail-invoice-items-count').textContent = `${items.length} ${items.length > 1 ? 'منتجات ومكونات' : 'منتج'}`;
            itemsTbody.innerHTML = items.map((item, idx) => {
                const ing = ingredients.find(i => i.id === item.ingredientId);
                const cat = categories.find(c => c.id === (item.categoryId || (ing ? ing.categoryId : null)));
                const unit = ing ? getI18nText('unit_' + ing.unit) : '';
                const locName = getI18nText(item.location) || item.location;
                const unitCost = parseFloat(item.unitCost || 0);
                const qty = parseFloat(item.quantity || 0);
                const itemTotal = parseFloat(item.totalCost || (qty * unitCost));

                // Expiry alert
                let expiryHtml = item.expiryDate || '-';
                if (item.expiryDate) {
                    const diffDays = Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 7 && diffDays >= 0) {
                        expiryHtml = `<span class="badge-pill bg-rose-100 text-rose-800 font-bold">${item.expiryDate} (قريب!)</span>`;
                    }
                }

                return `
                    <tr class="hover:bg-slate-50">
                        <td class="px-3 py-2.5 font-bold text-slate-400">${idx + 1}</td>
                        <td class="px-3 py-2.5">
                            <span class="font-bold text-slate-900 block">${ing ? ing.name : (item.ingredientName || 'مادة خام')}</span>
                            <span class="text-[10px] text-slate-400">${ing ? (ing.productType || 'مادة خام') : ''}</span>
                        </td>
                        <td class="px-3 py-2.5 text-slate-600">${cat ? cat.name : '-'}</td>
                        <td class="px-3 py-2.5 text-slate-600">${locName}</td>
                        <td class="px-3 py-2.5 font-bold text-slate-800" dir="ltr">${qty} ${unit}</td>
                        <td class="px-3 py-2.5 font-mono font-bold text-slate-700" dir="ltr">${unitCost.toFixed(3)} ر.ع</td>
                        <td class="px-3 py-2.5 font-mono font-black text-indigo-700" dir="ltr">${itemTotal.toFixed(3)} ر.ع</td>
                        <td class="px-3 py-2.5" dir="ltr">${expiryHtml}</td>
                    </tr>
                `;
            }).join('');
        }

        document.getElementById('detail-invoice-logged').textContent = `تم تسجيل الفاتورة بواسطة: ${p.loggedBy || '-'}`;

        // Admin Action
        const adminActionBox = document.getElementById('detail-invoice-admin-action');
        if (user && user.role === 'admin' && !p.isApproved) {
            adminActionBox.innerHTML = `
                <button onclick="togglePurchaseApproval('${p.id}'); viewInvoiceDetails('${p.id}');" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5">
                    <span>اعتماد هذه الفاتورة الآن</span> <span>✅</span>
                </button>
            `;
        } else if (user && user.role === 'admin' && p.isApproved) {
            adminActionBox.innerHTML = `
                <button onclick="togglePurchaseApproval('${p.id}'); viewInvoiceDetails('${p.id}');" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition">
                    إلغاء الاعتماد ↩️
                </button>
            `;
        } else {
            adminActionBox.innerHTML = '';
        }

        openModal('invoice-details-modal');
    };

    window.openInvoiceFullImage = function(src) {
        document.getElementById('modal-invoice-img').src = src;
        openModal('invoice-viewer-modal');
    };

    // --- Dynamic Multi-Item Invoice Row Creator ---
    function addPurchaseItemRow(itemData = null) {
        const categories = Store.getCategories();
        const container = document.getElementById('purchase-items-list');
        const rowId = 'pur-row-' + Date.now() + Math.random().toString(36).substr(2, 4);
        const rowCount = container.children.length + 1;

        const row = document.createElement('div');
        row.className = 'p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs pur-item-row shadow-2xs transition hover:border-slate-300';
        row.id = rowId;

        const defaultBranch = itemData ? itemData.branch : 'tahnah';
        const defaultLoc = itemData ? itemData.location : 'loc_fridge';
        const defaultCat = itemData ? itemData.categoryId : '';
        const defaultQty = itemData ? itemData.quantity : '';
        const defaultPrice = itemData ? (itemData.totalCost || itemData.price || '') : '';
        const defaultExpiry = itemData ? (itemData.expiryDate || '') : '';
        
        // Initial state: only show if editing an item that is explicitly mandatory
        let initialShowExpiry = false;
        if (itemData && itemData.ingredientId) {
            const existingIng = Store.getIngredients().find(i => i.id === itemData.ingredientId);
            if (existingIng && (existingIng.hasExpiry === 'yes' || (existingIng.hasExpiry !== 'no' && existingIng.hasExpiry !== false))) {
                initialShowExpiry = true;
            }
        }

        row.innerHTML = `
            <div class="flex justify-between items-center pb-1.5 border-b border-slate-200">
                <span class="font-black text-slate-800 flex items-center gap-1.5">
                    <span class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">${rowCount}</span>
                    <span>عنصر فاتورة جديد</span>
                </span>
                <button type="button" class="text-rose-600 hover:text-rose-800 font-bold text-xs px-2 py-0.5 rounded-lg hover:bg-rose-50 transition" onclick="this.closest('.pur-item-row').remove(); updateInvoiceAutoSummary();">
                    ✕ حذف العنصر
                </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                    <label class="block font-bold text-slate-600 mb-0.5">الفرع *</label>
                    <select class="row-branch w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-indigo-900" required>
                        <option value="tahnah" ${defaultBranch === 'tahnah' ? 'selected' : ''}>طحنه</option>
                        <option value="katheeb" ${defaultBranch === 'katheeb' ? 'selected' : ''}>كثيب</option>
                        <option value="zafal" ${defaultBranch === 'zafal' ? 'selected' : ''}>زعفل</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-600 mb-0.5">مكان التخزين *</label>
                    <select class="row-location w-full bg-white border border-slate-300 rounded-lg p-1.5" required>
                        <option value="loc_fridge" ${defaultLoc === 'loc_fridge' ? 'selected' : ''}>ثلاجة</option>
                        <option value="loc_shelf" ${defaultLoc === 'loc_shelf' ? 'selected' : ''}>رف المحل</option>
                        <option value="loc_shop_store" ${defaultLoc === 'loc_shop_store' ? 'selected' : ''}>مخزن المحلات</option>
                        <option value="loc_big_warehouse" ${defaultLoc === 'loc_big_warehouse' ? 'selected' : ''}>مخزن الكبير</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-600 mb-0.5">الفئة أولاً *</label>
                    <select class="row-category w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold" onchange="filterRowIngredients(this)" required>
                        <option value="">-- اختر الفئة أولاً --</option>
                        ${categories.map(c => `<option value="${c.id}" ${defaultCat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                <div class="sm:col-span-2">
                    <label class="block font-bold text-slate-600 mb-0.5">المكون (من الفئة المحددة) *</label>
                    <select class="row-ingredient w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-800" onchange="handleRowIngredientChange(this)" required disabled>
                        <option value="">اختر الفئة أولاً</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-600 mb-0.5">الكمية *</label>
                    <input type="number" step="0.01" min="0.01" value="${defaultQty}" class="row-qty w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold" placeholder="الكمية" oninput="updateInvoiceAutoSummary()" required>
                </div>
                <div>
                    <label class="block font-bold text-slate-600 mb-0.5">سعر (ر.ع) *</label>
                    <input type="number" step="0.001" min="0" value="${defaultPrice}" class="row-price w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-indigo-700" placeholder="0.000" oninput="updateInvoiceAutoSummary()" required>
                </div>
            </div>
            <div class="row-expiry-container pt-1 ${initialShowExpiry ? '' : 'hidden'}">
                <label class="block font-bold text-slate-600 mb-0.5">تاريخ انتهاء الصلاحية *</label>
                <input type="date" value="${defaultExpiry}" class="row-expiry w-full bg-white border border-slate-300 rounded-lg p-1.5 font-medium" ${initialShowExpiry ? 'required' : ''}>
            </div>
        `;
        container.appendChild(row);

        if (defaultCat) {
            const catSelect = row.querySelector('.row-category');
            filterRowIngredients(catSelect);
            if (itemData && itemData.ingredientId) {
                row.querySelector('.row-ingredient').value = itemData.ingredientId;
                handleRowIngredientChange(row.querySelector('.row-ingredient'));
            }
        }

        updateInvoiceAutoSummary();
    }

    document.getElementById('add-purchase-item-btn')?.addEventListener('click', () => addPurchaseItemRow());

    // Auto-detect ingredient expiry configuration from Raw Materials catalog
    window.handleRowIngredientChange = function(selectEl) {
        const row = selectEl.closest('.pur-item-row');
        if (!row) return;
        const ingId = selectEl.value;
        const expiryContainer = row.querySelector('.row-expiry-container');
        const expiryInput = row.querySelector('.row-expiry');

        if (!ingId) {
            if (expiryContainer) expiryContainer.classList.add('hidden');
            if (expiryInput) {
                expiryInput.removeAttribute('required');
                expiryInput.value = '';
                expiryInput.disabled = true;
            }
            return;
        }

        const ing = Store.getIngredients().find(i => i.id === ingId);
        if (ing) {
            const isMandatory = (ing.hasExpiry === 'no' || ing.hasExpiry === false) ? false : true;
            if (isMandatory) {
                // Show date input and make it required
                if (expiryContainer) expiryContainer.classList.remove('hidden');
                if (expiryInput) {
                    expiryInput.setAttribute('required', 'required');
                    expiryInput.disabled = false;
                }
            } else {
                // Completely hide date input and remove required
                if (expiryContainer) expiryContainer.classList.add('hidden');
                if (expiryInput) {
                    expiryInput.removeAttribute('required');
                    expiryInput.value = '';
                    expiryInput.disabled = true;
                }
            }
        }
    };

    // Filter ingredients per category inside purchase item row
    window.filterRowIngredients = function(categorySelectEl) {
        const row = categorySelectEl.closest('.pur-item-row');
        const ingredientSelect = row.querySelector('.row-ingredient');
        const catId = categorySelectEl.value;

        if (!catId) {
            ingredientSelect.innerHTML = '<option value="">اختر الفئة أولاً</option>';
            ingredientSelect.disabled = true;
            handleRowIngredientChange(ingredientSelect);
            return;
        }

        const ingredients = Store.getIngredients().filter(i => i.categoryId === catId);
        if (ingredients.length === 0) {
            ingredientSelect.innerHTML = '<option value="">لا توجد مواد مسجلة في هذه الفئة</option>';
            ingredientSelect.disabled = true;
            handleRowIngredientChange(ingredientSelect);
        } else {
            ingredientSelect.innerHTML = '<option value="">-- اختر المادة الخام --</option>' + 
                ingredients.map(i => `<option value="${i.id}">${i.name} (${getI18nText('unit_' + i.unit)})</option>`).join('');
            ingredientSelect.disabled = false;
            handleRowIngredientChange(ingredientSelect);
        }
    };

    // Real-time Automatic Invoice Total & Items Count Calculator
    window.updateInvoiceAutoSummary = function() {
        const rows = document.querySelectorAll('.pur-item-row');
        let grandTotal = 0;

        rows.forEach(r => {
            const price = parseFloat(r.querySelector('.row-price').value) || 0;
            grandTotal += price;
        });

        grandTotal = Math.round(grandTotal * 1000) / 1000;
        const totalCount = rows.length;

        const totalDisplay = document.getElementById('pur-auto-total-display');
        const countDisplay = document.getElementById('pur-auto-count-display');

        if (totalDisplay) totalDisplay.textContent = `${grandTotal.toFixed(3)} ر.ع`;
        if (countDisplay) countDisplay.textContent = `${totalCount} ${totalCount > 1 ? 'عناصر' : 'عنصر'}`;
    };

    // Edit Purchase Invoice Handler
    window.editPurchaseInvoice = function(purchaseId) {
        const p = Store.getPurchases().find(item => item.id === purchaseId);
        if (!p) return;

        document.getElementById('pur-edit-id').value = p.id;
        document.getElementById('pur-modal-title').textContent = `تعديل فاتورة المشتريات (${p.invoiceNo || 'INV-000'})`;

        const invBase64 = document.getElementById('pur-invoice-base64');
        const previewBox = document.getElementById('pur-image-preview-box');
        const previewThumb = document.getElementById('pur-image-preview-thumb');

        if (p.invoiceImage) {
            invBase64.value = p.invoiceImage;
            previewThumb.src = p.invoiceImage;
            previewBox.classList.remove('hidden');
        } else {
            invBase64.value = '';
            previewBox.classList.add('hidden');
        }

        const container = document.getElementById('purchase-items-list');
        container.innerHTML = '';

        const items = (p.items && Array.isArray(p.items)) ? p.items : [p];
        items.forEach(item => {
            addPurchaseItemRow(item);
        });

        updateInvoiceAutoSummary();
        openModal('add-purchase-modal');
    };

    // Purchase Invoice Capture
    document.getElementById('pur-invoice-file')?.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            const base64 = await getBase64(e.target.files[0]);
            document.getElementById('pur-invoice-base64').value = base64;
            document.getElementById('pur-image-preview-thumb').src = base64;
            document.getElementById('pur-image-preview-box').classList.remove('hidden');
        }
    });

    // Submit Multi-Item Purchase with Automatic Total Calculation & Validation
    document.getElementById('purchase-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const rows = document.querySelectorAll('.pur-item-row');

        if (rows.length === 0) {
            alert('⚠️ يرجى إضافة عنصر واحد على الأقل للفاتورة عبر الضغط على "+ إضافة عنصر"');
            return;
        }

        const invoiceImg = document.getElementById('pur-invoice-base64').value || null;
        if (!invoiceImg) {
            alert('⚠️ صورة الفاتورة إلزامية! يرجى إرفاق أو التقاط صورة الفاتورة قبل الحفظ.');
            return;
        }

        const user = Store.getLoggedInUser();
        const editId = document.getElementById('pur-edit-id').value;
        const existing = editId ? Store.getPurchases().find(p => p.id === editId) : null;
        const invoiceNo = existing ? existing.invoiceNo : ('INV-' + Date.now().toString().slice(-6));

        const items = [];
        let primaryBranch = null;
        let grandTotal = 0;

        // Collect and calculate all items inside this invoice
        for (const r of rows) {
            const branch = r.querySelector('.row-branch').value;
            if (!primaryBranch) primaryBranch = branch;
            const location = r.querySelector('.row-location').value;
            const categoryId = r.querySelector('.row-category').value;
            const ingredientId = r.querySelector('.row-ingredient').value;
            const quantity = parseFloat(r.querySelector('.row-qty').value);
            const totalCost = parseFloat(r.querySelector('.row-price').value);
            const expiryDate = r.querySelector('.row-expiry')?.value || '';

            if (!categoryId || !ingredientId) {
                alert('⚠️ يرجى اختيار الفئة والمادة الخام لجميع العناصر المضافة!');
                return;
            }

            const ing = Store.getIngredients().find(i => i.id === ingredientId);
            const isMandatory = ing ? (ing.hasExpiry !== 'no' && ing.hasExpiry !== false) : true;

            if (isNaN(quantity) || quantity <= 0) {
                alert(`⚠️ يرجى إدخال كمية صحيحة أكبر من صفر لمادة (${ing ? ing.name : 'المحددة'})!`);
                return;
            }

            if (isNaN(totalCost) || totalCost < 0) {
                alert(`⚠️ يرجى إدخال سعر صحيح لمادة (${ing ? ing.name : 'المحددة'})!`);
                return;
            }

            if (isMandatory && !expiryDate) {
                alert(`⚠️ تاريخ انتهاء الصلاحية إلزامي لمادة (${ing ? ing.name : 'المحددة'})!`);
                return;
            }

            const unitCost = quantity > 0 ? (totalCost / quantity) : 0;
            grandTotal += totalCost;

            items.push({
                branch,
                location,
                categoryId,
                ingredientId,
                quantity,
                unitCost,
                totalCost,
                hasExpiry: isMandatory ? 'yes' : 'no',
                expiryDate: isMandatory ? expiryDate : '-'
            });
        }

        grandTotal = Math.round(grandTotal * 1000) / 1000;

        // Save single structured invoice
        Store.savePurchase({
            id: editId || undefined,
            invoiceNo,
            branch: primaryBranch || 'tahnah',
            totalCost: grandTotal,
            itemCount: items.length,
            invoiceImage: invoiceImg,
            isApproved: existing ? existing.isApproved : false,
            approvedBy: existing ? existing.approvedBy : undefined,
            loggedBy: existing ? existing.loggedBy : (user ? `${user.name} (${getI18nText('role_' + user.role) || user.role})` : 'أحمد بن سعيد (المدير العام)'),
            items: items,
            dateAdded: existing ? existing.dateAdded : new Date().toISOString()
        });

        // Reset form & list
        document.getElementById('purchase-items-list').innerHTML = '';
        document.getElementById('pur-edit-id').value = '';
        document.getElementById('pur-invoice-base64').value = '';
        document.getElementById('pur-modal-title').textContent = 'تسجيل فاتورة مشتريات جديدة (بالريال العماني ر.ع)';
        document.getElementById('pur-image-preview-box')?.classList.add('hidden');
        document.getElementById('purchase-form').reset();
        updateInvoiceAutoSummary();

        closeModal('add-purchase-modal');
        renderAll();
        showToast(`✅ تم حفظ الفاتورة بنجاح وحساب إجمالي ${grandTotal.toFixed(3)} ر.ع لعدد ${items.length} عناصر!`);
    });

    // --- Consumable Purchase Invoices Handlers ---
    window.toggleConsumableBranchMode = function(mode) {
        const singleBox = document.getElementById('cons-single-branch-box');
        const multiBox = document.getElementById('cons-multi-branch-box');

        if (mode === 'multi') {
            singleBox?.classList.add('hidden');
            multiBox?.classList.remove('hidden');
            updateConsumableAutoTotal();
        } else {
            singleBox?.classList.remove('hidden');
            multiBox?.classList.add('hidden');
        }
    };

    window.updateConsumableAutoTotal = function() {
        const tahnah = parseFloat(document.getElementById('cons-amount-tahnah')?.value) || 0;
        const katheeb = parseFloat(document.getElementById('cons-amount-katheeb')?.value) || 0;
        const zafal = parseFloat(document.getElementById('cons-amount-zafal')?.value) || 0;

        const total = Math.round((tahnah + katheeb + zafal) * 1000) / 1000;
        const displayEl = document.getElementById('cons-multi-total-display');
        if (displayEl) displayEl.textContent = `${total.toFixed(3)} ر.ع`;

        return total;
    };

    window.editConsumablePurchase = function(purchaseId) {
        const p = Store.getPurchases().find(item => item.id === purchaseId);
        if (!p) return;

        document.getElementById('cons-edit-id').value = p.id;
        document.getElementById('cons-modal-title').textContent = `تعديل الفاتورة الاستهلاكية (${p.invoiceNo || 'INV-000'})`;
        document.getElementById('cons-product-name').value = p.productName || '';

        const isMulti = p.branchBreakdown && p.branchBreakdown.filter(b => parseFloat(b.amount || 0) > 0).length > 1;

        if (isMulti) {
            const radioMulti = document.getElementById('cons-mode-multi');
            if (radioMulti) radioMulti.checked = true;
            toggleConsumableBranchMode('multi');

            const tahnahVal = p.branchBreakdown.find(b => b.branch === 'tahnah')?.amount || '';
            const katheebVal = p.branchBreakdown.find(b => b.branch === 'katheeb')?.amount || '';
            const zafalVal = p.branchBreakdown.find(b => b.branch === 'zafal')?.amount || '';

            document.getElementById('cons-amount-tahnah').value = tahnahVal;
            document.getElementById('cons-amount-katheeb').value = katheebVal;
            document.getElementById('cons-amount-zafal').value = zafalVal;
            updateConsumableAutoTotal();
        } else {
            const radioSingle = document.getElementById('cons-mode-single');
            if (radioSingle) radioSingle.checked = true;
            toggleConsumableBranchMode('single');

            document.getElementById('cons-branch').value = p.branch || 'tahnah';
            document.getElementById('cons-price').value = parseFloat(p.totalCost || 0).toFixed(3);
        }

        const invBase64 = document.getElementById('cons-invoice-base64');
        const previewBox = document.getElementById('cons-image-preview-box');
        const previewThumb = document.getElementById('cons-image-preview-thumb');

        if (p.invoiceImage) {
            invBase64.value = p.invoiceImage;
            previewThumb.src = p.invoiceImage;
            previewBox.classList.remove('hidden');
        } else {
            invBase64.value = '';
            previewBox.classList.add('hidden');
        }

        openModal('add-consumable-purchase-modal');
    };

    document.getElementById('cons-invoice-file')?.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            const base64 = await getBase64(e.target.files[0]);
            document.getElementById('cons-invoice-base64').value = base64;
            document.getElementById('cons-image-preview-thumb').src = base64;
            document.getElementById('cons-image-preview-box').classList.remove('hidden');
        }
    });

    document.getElementById('consumable-purchase-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = Store.getLoggedInUser();
        const editId = document.getElementById('cons-edit-id').value;
        const invoiceImg = document.getElementById('cons-invoice-base64').value || null;

        if (!invoiceImg) {
            alert('⚠️ صورة الفاتورة إلزامية! يرجى إرفاق أو التقاط صورة الفاتورة الاستهلاكية قبل الحفظ.');
            return;
        }

        const productName = document.getElementById('cons-product-name').value.trim();
        if (!productName) {
            alert('⚠️ يرجى كتابة اسم المنتج أو البيان!');
            return;
        }

        const isMulti = document.getElementById('cons-mode-multi')?.checked;
        let totalCost = 0;
        let primaryBranch = 'tahnah';
        let branchBreakdown = [];

        if (isMulti) {
            const tahnah = parseFloat(document.getElementById('cons-amount-tahnah').value) || 0;
            const katheeb = parseFloat(document.getElementById('cons-amount-katheeb').value) || 0;
            const zafal = parseFloat(document.getElementById('cons-amount-zafal').value) || 0;

            totalCost = Math.round((tahnah + katheeb + zafal) * 1000) / 1000;

            if (totalCost <= 0) {
                alert('⚠️ يرجى تحديد المبلغ المستهلك لفرع واحد على الأقل!');
                return;
            }

            branchBreakdown = [
                { branch: 'tahnah', amount: tahnah },
                { branch: 'katheeb', amount: katheeb },
                { branch: 'zafal', amount: zafal }
            ].filter(b => b.amount > 0);

            primaryBranch = branchBreakdown[0].branch;
        } else {
            primaryBranch = document.getElementById('cons-branch').value;
            totalCost = parseFloat(document.getElementById('cons-price').value);

            if (isNaN(totalCost) || totalCost <= 0) {
                alert('⚠️ يرجى إدخال سعر صحيح أكبر من صفر!');
                return;
            }

            totalCost = Math.round(totalCost * 1000) / 1000;
            branchBreakdown = [{ branch: primaryBranch, amount: totalCost }];
        }

        const existing = editId ? Store.getPurchases().find(p => p.id === editId) : null;
        const invoiceNo = existing ? existing.invoiceNo : ('INV-' + Date.now().toString().slice(-6));

        Store.savePurchase({
            id: editId || undefined,
            invoiceNo,
            branch: primaryBranch || 'tahnah',
            totalCost: totalCost,
            itemCount: branchBreakdown.length,
            isConsumable: true,
            type: 'consumable',
            productName: productName,
            branchBreakdown: branchBreakdown,
            invoiceImage: invoiceImg,
            isApproved: existing ? existing.isApproved : false,
            approvedBy: existing ? existing.approvedBy : undefined,
            loggedBy: existing ? existing.loggedBy : (user ? `${user.name} (${getI18nText('role_' + user.role) || user.role})` : 'أحمد بن سعيد (المدير العام)'),
            dateAdded: existing ? existing.dateAdded : new Date().toISOString()
        });

        // Reset
        document.getElementById('cons-edit-id').value = '';
        document.getElementById('cons-invoice-base64').value = '';
        document.getElementById('cons-modal-title').textContent = 'تسجيل فاتورة استهلاكية جديدة (بالريال العماني ر.ع)';
        document.getElementById('cons-image-preview-box')?.classList.add('hidden');
        document.getElementById('consumable-purchase-form').reset();
        document.getElementById('cons-mode-single').checked = true;
        toggleConsumableBranchMode('single');

        closeModal('add-consumable-purchase-modal');
        renderAll();
        showToast(`✅ تم حفظ الفاتورة الاستهلاكية (${productName}) بمبلغ إجمالي ${totalCost.toFixed(3)} ر.ع بنجاح!`);
    });

    // ================= 5b. EXTERNAL PURCHASES (مشتريات خارجية من أماكن بعيدة وموردين) =================
    window.renderExternalPurchasesTab = function() {
        const tableBody = document.getElementById('external-purchases-table-body');
        if (!tableBody) return;

        const allPurchases = Store.getExternalPurchases();
        const statusFilter = document.getElementById('ext-filter-status')?.value || 'all';
        const whFilter = document.getElementById('ext-filter-warehouse')?.value || 'all';
        const searchQuery = (document.getElementById('ext-search-input')?.value || '').trim().toLowerCase();

        // 1. Calculate Summary Stats
        const totalCount = allPurchases.length;
        const totalAmount = allPurchases.reduce((sum, p) => sum + (parseFloat(p.totalCost) || ((parseFloat(p.quantityRequested) || 0) * (parseFloat(p.unitPrice) || 0))), 0);
        const pendingCount = allPurchases.filter(p => p.status === 'pending' || !p.status).length;
        const partialCount = allPurchases.filter(p => p.status === 'partial').length;
        const completedCount = allPurchases.filter(p => p.status === 'completed').length;

        // Populate KPI cards
        const statTotal = document.getElementById('stat-ext-total-count');
        const statAmount = document.getElementById('stat-ext-total-amount');
        const statPending = document.getElementById('stat-ext-pending-count');
        const statPartial = document.getElementById('stat-ext-partial-count');
        const statCompleted = document.getElementById('stat-ext-completed-count');

        if (statTotal) statTotal.textContent = totalCount;
        if (statAmount) statAmount.textContent = `${totalAmount.toFixed(3)} ر.ع`;
        if (statPending) statPending.textContent = pendingCount;
        if (statPartial) statPartial.textContent = partialCount;
        if (statCompleted) statCompleted.textContent = completedCount;

        // 2. Filter Table Items
        let filtered = allPurchases;
        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => (p.status || 'pending') === statusFilter);
        }
        if (whFilter !== 'all') {
            filtered = filtered.filter(p => (p.targetWarehouseId || 'wh1') === whFilter);
        }
        if (searchQuery) {
            filtered = filtered.filter(p => {
                const name = (p.itemName || '').toLowerCase();
                const store = (p.storeName || '').toLowerCase();
                const phone = (p.storePhone || '').toLowerCase();
                const loc = (p.storeLocation || '').toLowerCase();
                const notes = (p.notes || '').toLowerCase();
                return name.includes(searchQuery) || store.includes(searchQuery) || phone.includes(searchQuery) || loc.includes(searchQuery) || notes.includes(searchQuery);
            });
        }

        // 3. Render Table
        if (filtered.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center py-12 text-slate-400">
                        <div class="text-4xl mb-2">🚚</div>
                        <p class="font-bold text-slate-600 text-sm">لا توجد طلبات شراء خارجية مسجلة تطابق البحث أو الفلاتر.</p>
                        <button type="button" onclick="openAddExternalPurchaseModal()" class="mt-3 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl hover:bg-indigo-100 transition cursor-pointer">
                            + تسجيل طلب شراء خارجي جديد الآن
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        const whNameMap = {
            'wh1': '🏬 مخزن 1',
            'wh2': '🏢 مخزن 2',
            'tahnah': '🏪 طحنه',
            'katheeb': '🏪 كثيب',
            'zafal': '🏪 زعفل'
        };

        tableBody.innerHTML = filtered.map(p => {
            const reqQty = parseFloat(p.quantityRequested) || 0;
            const recQty = parseFloat(p.quantityReceived) || 0;
            const unitPrice = parseFloat(p.unitPrice) || 0;
            const totalCost = parseFloat(p.totalCost) || (reqQty * unitPrice);
            const unitName = (typeof getI18nText === 'function' ? getI18nText('unit_' + p.unit) : p.unit) || p.unit || 'حبة';

            // Progress bar
            const percent = reqQty > 0 ? Math.min(100, Math.round((recQty / reqQty) * 100)) : 0;

            // Status Badge
            let statusBadge = '';
            const st = p.status || 'pending';
            if (st === 'completed') {
                statusBadge = '<span class="badge-pill bg-emerald-100 text-emerald-800 font-black text-xs">✅ تم الاستلام بالكامل</span>';
            } else if (st === 'partial') {
                statusBadge = `<span class="badge-pill bg-blue-100 text-blue-800 font-black text-xs">⏳ مستلم جزئياً (${recQty}/${reqQty})</span>`;
            } else if (st === 'cancelled') {
                statusBadge = '<span class="badge-pill bg-rose-100 text-rose-800 font-black text-xs">❌ ملغي</span>';
            } else {
                statusBadge = '<span class="badge-pill bg-amber-100 text-amber-800 font-black text-xs">🚚 قيد الطلب والشحن</span>';
            }

            // WhatsApp link cleaner
            const cleanPhone = (p.storePhone || '').replace(/[^0-9+]/g, '');
            const waPhone = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : (cleanPhone.startsWith('9') && cleanPhone.length === 8 ? '968' + cleanPhone : cleanPhone);

            return `
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="px-4 py-3.5">
                        <div class="font-black text-slate-900 text-sm">${p.itemName}</div>
                        ${p.notes ? `<div class="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate" title="${p.notes}">📝 ${p.notes}</div>` : ''}
                    </td>
                    <td class="px-4 py-3.5">
                        <div class="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <span>🏪</span> <span>${p.storeName}</span>
                        </div>
                        ${p.storeLocation ? `<div class="text-[10px] text-slate-400 font-medium">📍 ${p.storeLocation}</div>` : ''}
                    </td>
                    <td class="px-4 py-3.5">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-mono font-bold text-xs text-slate-700 dir-ltr" dir="ltr">${p.storePhone || '-'}</span>
                            ${p.storePhone ? `
                                <a href="tel:${cleanPhone}" class="text-xs p-1 bg-slate-100 hover:bg-indigo-50 text-indigo-600 rounded-lg transition" title="اتصال مباشر">📞</a>
                                <a href="https://wa.me/${waPhone}" target="_blank" class="text-xs p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition" title="محادثة واتساب">💬</a>
                            ` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3.5 font-bold text-slate-900 text-xs">
                        ${reqQty} ${unitName}
                    </td>
                    <td class="px-4 py-3.5 text-xs">
                        <div class="font-black text-indigo-700 font-mono">${totalCost.toFixed(3)} ر.ع</div>
                        <div class="text-[10px] text-slate-400 font-mono">(${unitPrice.toFixed(3)} ر.ع / ${unitName})</div>
                    </td>
                    <td class="px-4 py-3.5 text-xs">
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <span class="font-black ${recQty >= reqQty ? 'text-emerald-700' : (recQty > 0 ? 'text-blue-700' : 'text-slate-500')}">${recQty} ${unitName}</span>
                            <span class="text-[10px] font-bold text-slate-400">${percent}%</span>
                        </div>
                        <div class="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div class="h-full ${percent >= 100 ? 'bg-emerald-500' : (percent > 0 ? 'bg-blue-500' : 'bg-slate-300')}" style="width: ${percent}%"></div>
                        </div>
                    </td>
                    <td class="px-4 py-3.5">
                        <span class="badge-pill bg-slate-100 text-slate-800 font-bold text-[11px]">${whNameMap[p.targetWarehouseId] || p.targetWarehouseId || '🏬 مخزن 1'}</span>
                    </td>
                    <td class="px-4 py-3.5">${statusBadge}</td>
                    <td class="px-4 py-3.5 text-xs text-slate-500 font-medium">
                        <div>📅 ${p.orderDate || '-'}</div>
                        ${p.expectedDate ? `<div class="text-[10px] text-amber-700 font-bold">⏳ وصول: ${p.expectedDate}</div>` : ''}
                    </td>
                    <td class="px-4 py-3.5 text-center">
                        <div class="flex items-center justify-center gap-1.5 flex-wrap">
                            ${st !== 'completed' ? `
                                <button onclick="openReceiveExternalPurchaseModal('${p.id}')" class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer" title="تسجيل استلام وتوريد كمية">
                                    <span>📦</span> <span>استلام</span>
                                </button>
                            ` : ''}
                            <button onclick="openEditExternalPurchaseModal('${p.id}')" class="text-indigo-600 hover:text-indigo-900 font-bold text-xs cursor-pointer px-2 py-1 hover:bg-indigo-50 rounded" title="تعديل بيانات الطلب">✏️ تعديل</button>
                            <button onclick="deleteExternalPurchaseItem('${p.id}')" class="text-rose-600 hover:text-rose-900 font-bold text-xs cursor-pointer px-2 py-1 hover:bg-rose-50 rounded" title="حذف الطلب">🗑️ حذف</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // Helper: populate Warehouse 2 Categories and Products for External Purchases
    window.populateExternalPurchaseCategoriesAndProducts = function(selectedCatId = 'all', selectedProdId = null) {
        const catSelect = document.getElementById('ext-pur-category-select');
        const prodSelect = document.getElementById('ext-pur-item-select');
        if (!catSelect || !prodSelect) return;

        const warehouses = Store.getWarehouses();
        const categories = Store.getCategories() || [];
        const ingredients = (Store.getIngredients() || []).filter(i => !i.archived);

        let targetWh = warehouses.find(w => w.id === 'wh2' || w.id === 'wh2_fixed_id' || w.id === 'n8825cuynmsvn4x9q') || warehouses[1] || { id: 'wh2_fixed_id', name: 'مخزن 2', categoryIds: ["cat_wh2_syrup", "cat_wh2_topping", "cat_wh2_drinkware", "cat_wh2_foodpack", "cat_wh2_dry", "cat_wh2_frozen", "cat_wh2_dairy", "cat_wh2_coffee", "cat_wh2_tea"] };

        // 1. Get all ingredients belonging specifically to Warehouse 2
        let allWh2Ingredients = ingredients.filter(i => {
            return (
                i.warehouseId === 'wh2_fixed_id' ||
                i.warehouseId === 'wh2' ||
                i.warehouseId === 'n8825cuynmsvn4x9q' ||
                (targetWh.categoryIds && targetWh.categoryIds.includes(i.categoryId))
            );
        });
        if (allWh2Ingredients.length === 0) {
            allWh2Ingredients = ingredients;
        }

        // 2. Get all categories belonging specifically to Warehouse 2
        const wh2CategoryIds = new Set(targetWh.categoryIds || []);
        allWh2Ingredients.forEach(i => {
            if (i.categoryId) wh2CategoryIds.add(i.categoryId);
        });

        let wh2Categories = categories.filter(c => wh2CategoryIds.has(c.id));
        if (wh2Categories.length === 0) {
            wh2Categories = categories;
        }

        // 3. Populate Category dropdown for Warehouse 2
        catSelect.innerHTML = `
            <option value="all" ${selectedCatId === 'all' ? 'selected' : ''}>📂 جميع فئات مخزن 2 (${wh2Categories.length} فئة)</option>
            ${wh2Categories.map(c => `<option value="${c.id}" ${c.id === selectedCatId ? 'selected' : ''}>📁 ${c.name}</option>`).join('')}
        `;

        // 4. Filter products for Warehouse 2 by selected category
        let filteredItems = allWh2Ingredients;
        if (selectedCatId && selectedCatId !== 'all') {
            filteredItems = filteredItems.filter(i => i.categoryId === selectedCatId);
        }

        // 5. Populate Product dropdown for Warehouse 2
        if (filteredItems.length === 0) {
            prodSelect.innerHTML = `
                <option value="">-- لا توجد منتجات في هذه الفئة لمخزن 2 --</option>
            `;
        } else {
            prodSelect.innerHTML = `
                <option value="">-- اضغط لاختيار منتج من مخزن 2 (${filteredItems.length} منتج متوفر) --</option>
                ${filteredItems.map(i => {
                    const catObj = categories.find(c => c.id === i.categoryId);
                    const catLabel = (selectedCatId === 'all' && catObj) ? `[${catObj.name}] ` : '';
                    return `<option value="${i.id}" data-name="${i.name}" data-unit="${i.unit || 'Liter'}" data-cost="${i.costPerUnit || i.cost || ''}" ${i.id === selectedProdId ? 'selected' : ''}>📦 ${catLabel}${i.name} (${i.unit || 'وحدة'})</option>`;
                }).join('')}
            `;
        }

        if (selectedProdId) {
            prodSelect.value = selectedProdId;
            onExternalPurchaseProductSelectChange(selectedProdId);
        } else {
            updateExtSelectedProductFeedback();
        }
    };

    window.onExternalPurchaseCategoryChange = function(catId) {
        populateExternalPurchaseCategoriesAndProducts(catId);
    };

    window.onExternalPurchaseProductSelectChange = function(prodId) {
        const nameInput = document.getElementById('ext-pur-item-name');
        const unitSelect = document.getElementById('ext-pur-unit');
        const priceInput = document.getElementById('ext-pur-unit-price');

        if (!prodId) {
            if (nameInput) nameInput.value = '';
            updateExtSelectedProductFeedback();
            return;
        }

        const prodSelect = document.getElementById('ext-pur-item-select');
        const selectedOpt = prodSelect?.options[prodSelect.selectedIndex];
        if (selectedOpt) {
            const name = selectedOpt.getAttribute('data-name') || selectedOpt.textContent.replace(/^📦\s*(\[.*?\]\s*)?/, '').replace(/\s*\(.*?\)$/, '').trim();
            const unit = selectedOpt.getAttribute('data-unit');
            const cost = selectedOpt.getAttribute('data-cost');

            if (nameInput) nameInput.value = name;
            if (unitSelect && unit) unitSelect.value = unit;
            if (priceInput && cost) {
                priceInput.value = parseFloat(cost).toFixed(3);
                calculateExternalPurchaseTotal();
            }

            updateExtSelectedProductFeedback(name, unit);
        }
    };

    function updateExtSelectedProductFeedback(name, unit) {
        const pill = document.getElementById('ext-selected-prod-pill');
        const label = document.getElementById('ext-selected-prod-label');
        const unitLabel = document.getElementById('ext-selected-prod-unit-label');

        const curName = name || document.getElementById('ext-pur-item-name')?.value;
        const curUnit = unit || document.getElementById('ext-pur-unit')?.value;

        if (curName && pill && label) {
            label.textContent = curName;
            if (unitLabel) unitLabel.textContent = curUnit || '';
            pill.classList.remove('hidden');
        } else if (pill) {
            pill.classList.add('hidden');
        }
    }

    window.toggleExtQuickCategoryAdd = function() {
        const box = document.getElementById('ext-quick-cat-box');
        if (!box) return;
        const isHidden = box.classList.contains('hidden');
        if (isHidden) {
            box.classList.remove('hidden');
            document.getElementById('ext-new-cat-name')?.focus();
        } else {
            box.classList.add('hidden');
        }
    };

    window.saveExtQuickCategory = function() {
        const nameInput = document.getElementById('ext-new-cat-name');
        const catName = nameInput?.value.trim();
        if (!catName) {
            alert('يرجى كتابة اسم الفئة الجديدة');
            return;
        }

        const newCat = Store.saveCategory({
            name: catName,
            warehouseId: 'wh2'
        });

        if (nameInput) nameInput.value = '';
        toggleExtQuickCategoryAdd();
        populateExternalPurchaseCategoriesAndProducts(newCat.id);
        showToast(`تمت إضافة الفئة (${catName}) بنجاح! 🏷️✨`);
    };

    window.toggleExtQuickProductAdd = function() {
        const box = document.getElementById('ext-quick-prod-box');
        if (!box) return;
        const isHidden = box.classList.contains('hidden');
        if (isHidden) {
            box.classList.remove('hidden');
            document.getElementById('ext-new-prod-name')?.focus();
        } else {
            box.classList.add('hidden');
        }
    };

    window.saveExtQuickProduct = function() {
        const nameInput = document.getElementById('ext-new-prod-name');
        const unitSelect = document.getElementById('ext-new-prod-unit');
        const costInput = document.getElementById('ext-new-prod-cost');
        const catSelect = document.getElementById('ext-pur-category-select');

        const prodName = nameInput?.value.trim();
        if (!prodName) {
            alert('يرجى كتابة اسم المنتج الجديد');
            return;
        }

        const unit = unitSelect?.value || 'Liter';
        const cost = parseFloat(costInput?.value) || 0;
        let categoryId = catSelect?.value;
        if (!categoryId || categoryId === 'all') {
            const firstCat = Store.getCategories()[0];
            categoryId = firstCat ? firstCat.id : 'cat_1';
        }

        const newIng = Store.saveIngredient({
            name: prodName,
            categoryId: categoryId,
            unit: unit,
            costPerUnit: cost,
            warehouseId: 'wh2'
        });

        if (nameInput) nameInput.value = '';
        if (costInput) costInput.value = '';
        toggleExtQuickProductAdd();
        populateExternalPurchaseCategoriesAndProducts(categoryId, newIng.id);
        showToast(`تمت إضافة المنتج (${prodName}) لمخزن 2 بنجاح! 📦✨`);
    };

    window.openAddExternalPurchaseModal = function() {
        try {
            const form = document.getElementById('add-external-purchase-form');
            if (form) form.reset();
            const idEl = document.getElementById('ext-pur-id');
            if (idEl) idEl.value = '';
            const whEl = document.getElementById('ext-pur-target-wh');
            if (whEl) whEl.value = 'wh2';
            const nameEl = document.getElementById('ext-pur-item-name');
            if (nameEl) nameEl.value = '';
            const titleEl = document.getElementById('ext-modal-title');
            if (titleEl) titleEl.textContent = 'طلب شراء خارجي جديد (مخزن 2)';
            const dateEl = document.getElementById('ext-pur-order-date');
            if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
            const costEl = document.getElementById('ext-pur-total-cost');
            if (costEl) costEl.value = '0.000';

            populateExternalPurchaseCategoriesAndProducts('all', null);
        } catch(e) {
            console.error('openAddExternalPurchaseModal error:', e);
        }

        openModal('add-external-purchase-modal');
        const modal = document.getElementById('add-external-purchase-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    };

    window.calculateExternalPurchaseTotal = function() {
        const qty = parseFloat(document.getElementById('ext-pur-qty-req')?.value) || 0;
        const price = parseFloat(document.getElementById('ext-pur-unit-price')?.value) || 0;
        const totalEl = document.getElementById('ext-pur-total-cost');
        if (totalEl) {
            totalEl.value = (qty * price).toFixed(3);
        }
    };

    window.openEditExternalPurchaseModal = function(id) {
        try {
            const purchases = Store.getExternalPurchases();
            const p = purchases.find(item => item.id === id);
            if (!p) return;

            const matchedIng = Store.getIngredients().find(i => (p.ingredientId && i.id === p.ingredientId) || (i.name && p.itemName && i.name.toLowerCase() === p.itemName.toLowerCase()));

            populateExternalPurchaseCategoriesAndProducts(matchedIng ? matchedIng.categoryId : 'all', matchedIng ? matchedIng.id : null);

            document.getElementById('ext-pur-id').value = p.id;
            document.getElementById('ext-modal-title').textContent = 'تعديل طلب شراء خارجي (مخزن 2)';
            document.getElementById('ext-pur-item-name').value = p.itemName || '';
            document.getElementById('ext-pur-store-name').value = p.storeName || '';
            document.getElementById('ext-pur-store-phone').value = p.storePhone || '';
            document.getElementById('ext-pur-store-location').value = p.storeLocation || '';
            document.getElementById('ext-pur-qty-req').value = p.quantityRequested || '';
            document.getElementById('ext-pur-unit').value = p.unit || 'Liter';
            document.getElementById('ext-pur-unit-price').value = p.unitPrice || '';
            document.getElementById('ext-pur-target-wh').value = 'wh2';
            document.getElementById('ext-pur-order-date').value = p.orderDate || new Date().toISOString().split('T')[0];
            document.getElementById('ext-pur-expected-date').value = p.expectedDate || '';
            document.getElementById('ext-pur-notes').value = p.notes || '';

            calculateExternalPurchaseTotal();
            updateExtSelectedProductFeedback(p.itemName, p.unit);
        } catch(e) {
            console.error('openEditExternalPurchaseModal error:', e);
        }

        openModal('add-external-purchase-modal');
        const modal = document.getElementById('add-external-purchase-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    };

    document.getElementById('add-external-purchase-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('ext-pur-id')?.value;
        let itemName = document.getElementById('ext-pur-item-name')?.value.trim();
        
        if (!itemName) {
            const prodSelect = document.getElementById('ext-pur-item-select');
            const selectedOpt = prodSelect?.options[prodSelect.selectedIndex];
            if (selectedOpt && prodSelect.value) {
                itemName = selectedOpt.getAttribute('data-name') || selectedOpt.textContent.replace(/^📦\s*(\[.*?\]\s*)?/, '').replace(/\s*\(.*?\)$/, '').trim();
            }
        }

        const storeName = document.getElementById('ext-pur-store-name')?.value.trim();
        const storePhone = document.getElementById('ext-pur-store-phone')?.value.trim();
        const storeLocation = document.getElementById('ext-pur-store-location')?.value.trim() || '';
        const quantityRequested = parseFloat(document.getElementById('ext-pur-qty-req')?.value) || 0;
        const unit = document.getElementById('ext-pur-unit')?.value || 'Liter';
        const unitPrice = parseFloat(document.getElementById('ext-pur-unit-price')?.value) || 0;
        const targetWarehouseId = 'wh2'; // Locked specifically to Warehouse 2
        const orderDate = document.getElementById('ext-pur-order-date')?.value || new Date().toISOString().split('T')[0];
        const expectedDate = document.getElementById('ext-pur-expected-date')?.value || '';
        const notes = document.getElementById('ext-pur-notes')?.value.trim() || '';

        if (!itemName) {
            alert('⚠️ يرجى اختيار المنتج أو المادة من القائمة، أو الضغط على "+ إضافة منتج" لإضافة منتج جديد.');
            return;
        }

        if (!storeName || !storePhone || quantityRequested <= 0) {
            alert('⚠️ يرجى ملء جميع الحقول الإلزامية (اسم المحل، رقم الهاتف، والكمية المطلوبة).');
            return;
        }

        const matchedIng = Store.getIngredients().find(i => i.name.toLowerCase() === itemName.toLowerCase());

        Store.saveExternalPurchase({
            id: id ? id : undefined,
            itemName,
            ingredientId: matchedIng ? matchedIng.id : null,
            storeName,
            storePhone,
            storeLocation,
            quantityRequested,
            unit,
            unitPrice,
            totalCost: quantityRequested * unitPrice,
            targetWarehouseId,
            orderDate,
            expectedDate,
            notes
        });

        closeModal('add-external-purchase-modal');
        renderExternalPurchasesTab();
        showToast(`تم حفظ طلب الشراء الخارجي لمخزن 2 للمنتج (${itemName}) بنجاح! 🚚✅`);
    });

    window.openReceiveExternalPurchaseModal = function(id) {
        try {
            const purchases = Store.getExternalPurchases();
            const p = purchases.find(item => item.id === id);
            if (!p) return;

            const reqQty = parseFloat(p.quantityRequested) || 0;
            const recQty = parseFloat(p.quantityReceived) || 0;
            const remainingToReceive = Math.max(0, reqQty - recQty);

            document.getElementById('ext-rec-id').value = p.id;
            document.getElementById('ext-rec-qty').value = remainingToReceive > 0 ? remainingToReceive : reqQty;
            document.getElementById('ext-rec-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('ext-rec-target-wh').value = p.targetWarehouseId || 'wh1';
            document.getElementById('ext-rec-notes').value = '';

            const summaryBox = document.getElementById('ext-receive-summary-box');
            if (summaryBox) {
                summaryBox.innerHTML = `
                    <div class="flex justify-between items-center font-bold text-slate-800">
                        <span>📦 المنتج: ${p.itemName}</span>
                        <span>🏪 المحل: ${p.storeName} (${p.storePhone || 'بدون هاتف'})</span>
                    </div>
                    <div class="flex justify-between items-center text-slate-600 text-[11px] mt-1">
                        <span>الكمية المطلوبة: <b class="text-slate-900">${reqQty} ${p.unit}</b></span>
                        <span>المستلم سابقاً: <b class="text-emerald-700">${recQty} ${p.unit}</b></span>
                        <span>المتبقي للاستلام: <b class="text-amber-800">${remainingToReceive} ${p.unit}</b></span>
                    </div>
                `;
            }
        } catch(e) {
            console.error('openReceiveExternalPurchaseModal error:', e);
        }

        openModal('receive-external-purchase-modal');
        const modal = document.getElementById('receive-external-purchase-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    };

    document.getElementById('receive-external-purchase-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('ext-rec-id').value;
        const receiveQty = parseFloat(document.getElementById('ext-rec-qty').value) || 0;
        const receiptDate = document.getElementById('ext-rec-date').value;
        const targetWarehouse = document.getElementById('ext-rec-target-wh').value;
        const creditToStock = document.getElementById('ext-rec-credit-stock').checked;
        const notes = document.getElementById('ext-rec-notes').value.trim();

        if (receiveQty <= 0) {
            alert('يرجى إدخال كمية مستلمة صحيحة أكبر من صفر.');
            return;
        }

        Store.receiveExternalPurchase(id, receiveQty, creditToStock, targetWarehouse, receiptDate, notes);
        closeModal('receive-external-purchase-modal');
        renderAll();

        if (creditToStock) {
            showToast(`تم تأكيد استلام (${receiveQty}) وتوريدها لمخزون المستودع بنجاح! 📦✅`);
        } else {
            showToast(`تم تسجيل استلام (${receiveQty}) وتحديث السجل بنجاح! 📦✅`);
        }
    });

    window.deleteExternalPurchaseItem = function(id) {
        if (confirm('هل أنت متأكد من حذف هذا الطلب الخارجي؟')) {
            Store.deleteExternalPurchase(id);
            renderExternalPurchasesTab();
            showToast('تم حذف الطلب الخارجي بنجاح 🗑️');
        }
    };

    // ================= 6. UNIFIED PRODUCTS & RAW MATERIALS MANAGEMENT =================
    window.activeProductTypeTab = 'all'; // 'all' | 'raw' | 'pkg'

    window.setProductTypeTab = function(type) {
        window.activeProductTypeTab = type;
        const btnAll = document.getElementById('btn-type-all');
        const btnRaw = document.getElementById('btn-type-raw');
        const btnPkg = document.getElementById('btn-type-pkg');

        [btnAll, btnRaw, btnPkg].forEach(b => {
            if (b) {
                b.className = 'px-3.5 py-1.5 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
            }
        });

        if (type === 'all' && btnAll) btnAll.className = 'px-3.5 py-1.5 rounded-xl font-bold text-xs bg-indigo-600 text-white shadow-xs transition';
        if (type === 'raw' && btnRaw) btnRaw.className = 'px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 text-white shadow-xs transition';
        if (type === 'pkg' && btnPkg) btnPkg.className = 'px-3.5 py-1.5 rounded-xl font-bold text-xs bg-purple-600 text-white shadow-xs transition';

        renderProductsTab();
    };

    window.switchProductNatureType = function(type) {
        const entityField = document.getElementById('prod-entity-type');
        if (entityField) entityField.value = type;

        const rawFields = document.getElementById('raw-specific-fields');
        const pkgFields = document.getElementById('pkg-specific-fields');
        const lblRaw = document.getElementById('lbl-type-raw');
        const lblPkg = document.getElementById('lbl-type-pkg');
        const nameInput = document.getElementById('prod-name');
        const nameLabel = document.getElementById('prod-name-label');

        if (type === 'raw') {
            if (rawFields) rawFields.classList.remove('hidden');
            if (pkgFields) pkgFields.classList.add('hidden');
            if (lblRaw) lblRaw.className = 'flex items-center gap-2.5 p-3 border-2 border-indigo-600 rounded-2xl bg-indigo-50/70 cursor-pointer transition';
            if (lblPkg) lblPkg.className = 'flex items-center gap-2.5 p-3 border-2 border-slate-200 rounded-2xl bg-slate-50 cursor-pointer transition';
            if (nameLabel) nameLabel.textContent = 'اسم المادة / المنتج الخام *';
            if (nameInput) nameInput.placeholder = 'مثال: طحين رقم 1، سكر أبيض، زيت زيتون...';
            const rRadio = document.querySelector('input[name="prod_nature_radio"][value="raw"]');
            if (rRadio) rRadio.checked = true;
        } else {
            if (rawFields) rawFields.classList.add('hidden');
            if (pkgFields) pkgFields.classList.remove('hidden');
            if (lblRaw) lblRaw.className = 'flex items-center gap-2.5 p-3 border-2 border-slate-200 rounded-2xl bg-slate-50 cursor-pointer transition';
            if (lblPkg) lblPkg.className = 'flex items-center gap-2.5 p-3 border-2 border-purple-600 rounded-2xl bg-purple-50/70 cursor-pointer transition';
            if (nameLabel) nameLabel.textContent = 'اسم منتج / مستلزم التغليف *';
            if (nameInput) nameInput.placeholder = 'مثال: علب برجر كرتون، أكياس ورقية، أكواب عصير...';
            const pRadio = document.querySelector('input[name="prod_nature_radio"][value="pkg"]');
            if (pRadio) pRadio.checked = true;
        }
    };

    function getProductLocationName(loc) {
        if (!loc) return 'غير محدد';
        if (loc === 'wh1' || loc === 'wh-1' || loc === 'wh1_fixed_id') return '🏢 مخزن 1';
        if (loc === 'wh2' || loc === 'wh-2' || loc === 'wh2_fixed_id') return '🏢 مخزن 2';
        if (loc === 'tahnah') return '🏪 فرع طحنه';
        if (loc === 'katheeb') return '🏪 فرع كثيب';
        if (loc === 'zafal') return '🏪 فرع زعفل';
        return loc;
    }

    function renderProductsTab() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        const rawIngredients = Store.getIngredients().filter(i => !i.archived);
        const pkgProducts = Store.getProducts().filter(p => !p.archived);
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();

        // Update Location Filter Dropdown
        const locFilter = document.getElementById('prod-filter-location');
        if (locFilter && locFilter.children.length <= 1) {
            locFilter.innerHTML = `
                <option value="all">جميع المواقع والمخازن</option>
                ${warehouses.map(w => `<option value="${w.id}">🏢 ${w.name}</option>`).join('')}
                <option value="tahnah">🏪 فرع طحنه</option>
                <option value="katheeb">🏪 فرع كثيب</option>
                <option value="zafal">🏪 فرع زعفل</option>
            `;
        }

        // Update Category Filter Dropdown
        const catFilter = document.getElementById('prod-filter-category');
        if (catFilter && catFilter.children.length <= 1) {
            catFilter.innerHTML = `
                <option value="all">جميع الفئات والتصنيفات</option>
                <optgroup label="🌾 فئات المواد الخام">
                    ${categories.map(c => `<option value="raw_${c.id}">${c.name}</option>`).join('')}
                </optgroup>
                <optgroup label="📦 فئات مستلزمات التغليف">
                    <option value="pkg_علب وبوكسات">علب وبوكسات</option>
                    <option value="pkg_أكياس وتغليف">أكياس وتغليف</option>
                    <option value="pkg_أكواب وأغطية">أكواب وأغطية</option>
                    <option value="pkg_استيكرات ومطبوعات">استيكرات ومطبوعات</option>
                    <option value="pkg_أدوات وملاعق">أدوات وملاعق</option>
                    <option value="pkg_مستلزمات عامة">مستلزمات عامة</option>
                    <option value="pkg_أخرى">أخرى</option>
                </optgroup>
            `;
        }

        // Update Modal Dropdowns for Raw Material
        const rawCatSelect = document.getElementById('prod-raw-category-select');
        if (rawCatSelect && rawCatSelect.children.length === 0) {
            rawCatSelect.innerHTML = categories.map(c => `<option value="${c.id}" data-wh="${c.warehouseId || 'wh1'}">${c.name}</option>`).join('');
        }
        const rawWhSelect = document.getElementById('prod-raw-warehouse-select');
        if (rawWhSelect && rawWhSelect.children.length === 0) {
            rawWhSelect.innerHTML = warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        }

        // Update Modal Dropdowns for Packaging
        const pkgLocSelect = document.getElementById('prod-pkg-location-select');
        if (pkgLocSelect && pkgLocSelect.children.length <= 5) {
            pkgLocSelect.innerHTML = `
                ${warehouses.map(w => `<option value="${w.id}">🏢 ${w.name}</option>`).join('')}
                <option value="tahnah">🏪 فرع طحنه</option>
                <option value="katheeb">🏪 فرع كثيب</option>
                <option value="zafal">🏪 فرع زعفل</option>
            `;
        }

        // Update KPIs
        const totalCountEl = document.getElementById('stat-products-total');
        const rawCountEl = document.getElementById('stat-products-raw');
        const pkgCountEl = document.getElementById('stat-products-pkg');
        const lowCountEl = document.getElementById('stat-products-low');

        if (totalCountEl) totalCountEl.textContent = rawIngredients.length + pkgProducts.length;
        if (rawCountEl) rawCountEl.textContent = rawIngredients.length;
        if (pkgCountEl) pkgCountEl.textContent = pkgProducts.length;
        if (lowCountEl) lowCountEl.textContent = '0';

        // Prepare unified items list
        let unifiedList = [];
        rawIngredients.forEach(ing => {
            const cat = categories.find(c => c.id === ing.categoryId);
            const wh = warehouses.find(w => w.id === ing.warehouseId);
            unifiedList.push({
                entityType: 'raw',
                id: ing.id,
                name: ing.name,
                categoryName: cat ? cat.name : 'عام',
                categoryId: ing.categoryId,
                locationCode: ing.warehouseId || 'wh1',
                locationName: wh ? wh.name : 'مخزن 1',
                unit: getI18nText('unit_' + ing.unit) || ing.unit,
                rawUnit: ing.unit,
                minThreshold: ing.minThreshold || 5,
                hasExpiry: (ing.hasExpiry === 'no' || ing.hasExpiry === false) ? 'no' : 'yes',
                notes: ''
            });
        });

        pkgProducts.forEach(prod => {
            unifiedList.push({
                entityType: 'pkg',
                id: prod.id,
                name: prod.name,
                categoryName: prod.category || 'عام',
                categoryId: prod.category,
                locationCode: prod.location || 'wh1',
                locationName: getProductLocationName(prod.location),
                unit: prod.unit || 'حبة',
                rawUnit: prod.unit,
                minThreshold: prod.minThreshold || 20,
                hasExpiry: 'no',
                notes: prod.notes || ''
            });
        });

        // Filter by Type Tab
        if (window.activeProductTypeTab === 'raw') {
            unifiedList = unifiedList.filter(item => item.entityType === 'raw');
        } else if (window.activeProductTypeTab === 'pkg') {
            unifiedList = unifiedList.filter(item => item.entityType === 'pkg');
        }

        // Filter by Location
        const locFilterVal = document.getElementById('prod-filter-location')?.value || 'all';
        if (locFilterVal !== 'all') {
            unifiedList = unifiedList.filter(item => item.locationCode === locFilterVal);
        }

        // Filter by Category
        const catFilterVal = document.getElementById('prod-filter-category')?.value || 'all';
        if (catFilterVal !== 'all') {
            if (catFilterVal.startsWith('raw_')) {
                const targetCatId = catFilterVal.replace('raw_', '');
                unifiedList = unifiedList.filter(item => item.entityType === 'raw' && item.categoryId === targetCatId);
            } else if (catFilterVal.startsWith('pkg_')) {
                const targetPkgCat = catFilterVal.replace('pkg_', '');
                unifiedList = unifiedList.filter(item => item.entityType === 'pkg' && item.categoryName === targetPkgCat);
            }
        }

        // Filter by Search Query
        const searchVal = (document.getElementById('prod-search-input')?.value || '').trim().toLowerCase();
        if (searchVal) {
            unifiedList = unifiedList.filter(item => 
                (item.name || '').toLowerCase().includes(searchVal) ||
                (item.categoryName || '').toLowerCase().includes(searchVal) ||
                (item.locationName || '').toLowerCase().includes(searchVal) ||
                (item.notes || '').toLowerCase().includes(searchVal)
            );
        }

        if (unifiedList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-10 text-slate-400 font-bold">
                        <div class="text-3xl mb-1.5">📦</div>
                        <p class="text-sm font-bold text-slate-600">لا توجد منتجات أو مواد مطابقة للبحث أو التصفية.</p>
                        <button type="button" onclick="openAddProductModal('all')" class="mt-2.5 text-indigo-600 hover:underline font-bold text-xs cursor-pointer">
                            + إضافة منتج جديد الآن
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = unifiedList.map(item => {
            const isRaw = item.entityType === 'raw';
            const typeBadge = isRaw
                ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">🌾 منتج خام</span>'
                : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-purple-50 text-purple-800 border border-purple-200">📦 مستلزم تغليف</span>';

            const expiryOrNotes = isRaw
                ? (item.hasExpiry === 'yes'
                    ? '<span class="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">إلزامي ⏳</span>'
                    : '<span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">بدون انتهاء ♾️</span>')
                : (item.notes
                    ? `<span class="text-[11px] text-slate-600 font-normal truncate block max-w-xs" title="${item.notes}">${item.notes}</span>`
                    : '<span class="text-[11px] text-slate-400">-</span>');

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="px-4 py-3 font-bold text-slate-900 text-xs sm:text-sm">
                        <div class="flex items-center gap-1.5">
                            <span>${isRaw ? '🌾' : '📦'}</span>
                            <span>${item.name}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">${typeBadge}</td>
                    <td class="px-4 py-3 font-medium text-slate-700 text-xs">
                        <span class="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">${item.categoryName}</span>
                    </td>
                    <td class="px-4 py-3 font-bold text-indigo-900 text-xs">${item.locationName}</td>
                    <td class="px-4 py-3 font-bold text-slate-800 text-xs">${item.unit}</td>
                    <td class="px-4 py-3 font-black text-rose-700 text-xs">${item.minThreshold} ${item.unit}</td>
                    <td class="px-4 py-3">${expiryOrNotes}</td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-1.5 flex-wrap">
                            <button type="button" onclick="openProductMovementReport('${item.id}', '${item.entityType === 'raw' ? 'ingredient' : 'product'}')" class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" title="عرض تقرير حركة وتتبع المنتج">📊 تقرير</button>
                            <button type="button" onclick="archiveProductItem('${item.id}', '${item.entityType === 'raw' ? 'ingredient' : 'product'}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" title="أرشفة المنتج">🗄️ أرشفة</button>
                            <button type="button" onclick="openEditUnifiedProductModal('${item.entityType}', '${item.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer" title="تعديل">✏️</button>
                            <button type="button" onclick="deleteUnifiedProduct('${item.entityType}', '${item.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer" title="حذف">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.updateProductModalCategories = function(selectedWhId, selectedCatId) {
        const catSelect = document.getElementById('prod-raw-category-select');
        const whSelect = document.getElementById('prod-raw-warehouse-select');
        if (!catSelect || !whSelect) return;

        const currentWhId = selectedWhId || whSelect.value || 'wh1_fixed_id';
        const warehouses = Store.getWarehouses();
        const categories = Store.getCategories();

        const targetWh = warehouses.find(w => w.id === currentWhId);
        const allowedCatIds = targetWh?.categoryIds || [];
        const filteredCats = categories.filter(c => allowedCatIds.includes(c.id));

        if (filteredCats.length === 0) {
            catSelect.innerHTML = `<option value="">-- لا توجد فئات لهذا المخزن (أضف فئة جديدة من الزر أعلاه) --</option>`;
        } else {
            catSelect.innerHTML = filteredCats.map(c => 
                `<option value="${c.id}" ${selectedCatId === c.id ? 'selected' : ''}>🏷️ ${c.name}</option>`
            ).join('');
        }
    };

    window.toggleInlineAddCategory = function(explicitShow) {
        const box = document.getElementById('inline-add-category-box');
        const input = document.getElementById('inline-category-name');
        if (!box) return;
        const shouldShow = (explicitShow !== undefined) ? explicitShow : box.classList.contains('hidden');
        if (shouldShow) {
            box.classList.remove('hidden');
            if (input) {
                input.value = '';
                input.focus();
            }
        } else {
            box.classList.add('hidden');
        }
    };

    window.saveInlineCategory = function() {
        const input = document.getElementById('inline-category-name');
        const whSelect = document.getElementById('prod-raw-warehouse-select');
        if (!input || !whSelect) return;

        const catName = input.value.trim();
        if (!catName) {
            alert('يرجى كتابة اسم الفئة الجديدة!');
            input.focus();
            return;
        }

        const whId = whSelect.value || 'wh1_fixed_id';
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();

        // Check if category already exists
        let existingCat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        let catId = existingCat ? existingCat.id : null;

        if (!existingCat) {
            const newCat = {
                id: 'cat_' + Date.now(),
                name: catName,
                warehouseId: whId
            };
            categories.push(newCat);
            Store._save(Store.KEYS.CATEGORIES, categories);
            catId = newCat.id;
        }

        // Ensure category is linked to this warehouse
        const targetWh = warehouses.find(w => w.id === whId);
        if (targetWh) {
            if (!targetWh.categoryIds) targetWh.categoryIds = [];
            if (!targetWh.categoryIds.includes(catId)) {
                targetWh.categoryIds.push(catId);
                Store._save(Store.KEYS.WAREHOUSES, warehouses);
            }
        }

        Store._syncToServer();

        // Refresh category dropdown in add product modal and select the new category
        if (window.updateProductModalCategories) {
            window.updateProductModalCategories(whId, catId);
        }
        const catSelect = document.getElementById('prod-raw-category-select');
        if (catSelect) {
            catSelect.value = catId;
        }

        // Hide inline box
        toggleInlineAddCategory(false);

        // Refresh background views
        try { renderWarehousesTab(); } catch(e){}
        try { renderProductsTab(); } catch(e){}
        try { renderDropdowns(); } catch(e){}

        showToast(`✅ تم إنشاء فئة (${catName}) وتحديدها للمنتج بنجاح!`);
    };

    window.openManageCategoriesFromProductModal = function() {
        const whSelect = document.getElementById('prod-raw-warehouse-select');
        const whId = whSelect ? whSelect.value : 'wh1_fixed_id';
        if (window.switchCategoryModalWhTab) {
            window.switchCategoryModalWhTab(whId);
        }
        openModal('manage-categories-modal');
    };

    window.updateRawWarehouseThresholdVisibility = function() {
        const whSelect = document.getElementById('prod-raw-warehouse-select');
        const singleBox = document.getElementById('raw-single-threshold-box');
        const dualBox = document.getElementById('raw-dual-thresholds-wh2');
        if (!whSelect || !singleBox || !dualBox) return;

        if (whSelect.value === 'wh2_fixed_id') {
            singleBox.classList.add('hidden');
            dualBox.classList.remove('hidden');
        } else {
            singleBox.classList.remove('hidden');
            dualBox.classList.add('hidden');
        }
    };

    document.getElementById('prod-raw-warehouse-select')?.addEventListener('change', (e) => {
        if (window.updateRawWarehouseThresholdVisibility) window.updateRawWarehouseThresholdVisibility();
        if (window.updateProductModalCategories) window.updateProductModalCategories(e.target.value);
    });

    window.openAddProductModal = function(defaultType = 'all') {
        const modal = document.getElementById('add-product-modal');
        if (!modal) return;

        // Reset form
        document.getElementById('product-form')?.reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-modal-title').textContent = 'إضافة منتج جديد 📦';
        document.getElementById('prod-submit-btn').textContent = 'حفظ المنتج 💾';

        if (window.toggleInlineAddCategory) toggleInlineAddCategory(false);

        const selectorBox = document.getElementById('prod-nature-selector-box');
        if (selectorBox) selectorBox.classList.remove('hidden');

        // Choose default nature
        const natureToSet = (defaultType === 'pkg' || window.activeProductTypeTab === 'pkg') ? 'pkg' : 'raw';
        switchProductNatureType(natureToSet);

        const rawWhSelect = document.getElementById('prod-raw-warehouse-select');
        if (rawWhSelect) {
            const whIdToUse = (window.activeNavTab === 'warehouse-2-tab' || defaultType === 'wh2') ? 'wh2_fixed_id' : 'wh1_fixed_id';
            rawWhSelect.value = whIdToUse;
            if (window.updateProductModalCategories) window.updateProductModalCategories(whIdToUse);
            if (window.updateRawWarehouseThresholdVisibility) window.updateRawWarehouseThresholdVisibility();
        }

        openModal('add-product-modal');
    };

    window.openEditUnifiedProductModal = function(entityType, id) {
        document.getElementById('product-form')?.reset();
        document.getElementById('prod-id').value = id;
        document.getElementById('prod-entity-type').value = entityType;

        if (window.toggleInlineAddCategory) toggleInlineAddCategory(false);

        const selectorBox = document.getElementById('prod-nature-selector-box');
        if (selectorBox) selectorBox.classList.add('hidden');

        document.getElementById('prod-modal-title').textContent = 'تعديل بيانات المنتج / المادة ✏️';
        document.getElementById('prod-submit-btn').textContent = 'تحديث وحفظ التعديلات ✅';

        if (entityType === 'raw') {
            const ing = Store.getIngredients().find(i => i.id === id);
            if (!ing) return;
            switchProductNatureType('raw');
            document.getElementById('prod-name').value = ing.name || '';
            document.getElementById('prod-raw-warehouse-select').value = ing.warehouseId || 'wh1_fixed_id';
            if (window.updateProductModalCategories) window.updateProductModalCategories(ing.warehouseId || 'wh1_fixed_id', ing.categoryId);
            document.getElementById('prod-raw-category-select').value = ing.categoryId || '';
            document.getElementById('prod-raw-unit').value = ing.unit || 'kg';
            document.getElementById('prod-raw-min-threshold').value = ing.minThreshold || 5;
            document.getElementById('prod-raw-shelf-threshold').value = ing.minShelfThreshold || 5;
            document.getElementById('prod-raw-wh-threshold').value = ing.minWarehouseThreshold || ing.minThreshold || 20;
            document.getElementById('prod-raw-has-expiry').value = (ing.hasExpiry === 'no' || ing.hasExpiry === false) ? 'no' : 'yes';
            if (window.updateRawWarehouseThresholdVisibility) window.updateRawWarehouseThresholdVisibility();
        } else {
            const prod = Store.getProducts().find(p => p.id === id);
            if (!prod) return;
            switchProductNatureType('pkg');
            document.getElementById('prod-name').value = prod.name || '';
            document.getElementById('prod-pkg-category-select').value = prod.category || 'علب وبوكسات';
            document.getElementById('prod-pkg-location-select').value = prod.location || 'wh1';
            document.getElementById('prod-pkg-unit').value = prod.unit || 'حبة';
            document.getElementById('prod-pkg-min-threshold').value = prod.minThreshold || 20;
            document.getElementById('prod-pkg-notes').value = prod.notes || '';
        }

        openModal('add-product-modal');
    };

    window.deleteUnifiedProduct = function(entityType, id) {
        if (entityType === 'raw') {
            const isUsed = Store.getRecipes().some(r => r.ingredients.some(ri => ri.ingredientId === id));
            if (isUsed) {
                alert('لا يمكن حذف هذا المكون لأنه مستخدم في وصفات جاهزة.');
                return;
            }
            if (confirm('هل أنت متأكد من حذف هذه المادة الخام؟')) {
                Store.deleteIngredient(id);
                renderAll();
                showToast('تم حذف المادة الخام بنجاح! 🗑️');
            }
        } else {
            if (confirm('هل أنت متأكد من حذف هذا المنتج / مستلزم التغليف؟')) {
                Store.deleteProduct(id);
                renderAll();
                showToast('تم حذف المنتج بنجاح! 🗑️');
            }
        }
    };

    document.getElementById('product-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const entityType = document.getElementById('prod-entity-type').value || 'raw';
        const name = document.getElementById('prod-name').value.trim();

        if (!name) return;

        if (entityType === 'raw') {
            const categoryId = document.getElementById('prod-raw-category-select').value;
            const warehouseId = document.getElementById('prod-raw-warehouse-select').value;
            const unit = document.getElementById('prod-raw-unit').value;
            const hasExpiry = document.getElementById('prod-raw-has-expiry').value;

            let minThreshold = parseFloat(document.getElementById('prod-raw-min-threshold').value) || 5;
            let minShelfThreshold = undefined;
            let minWarehouseThreshold = undefined;

            if (warehouseId === 'wh2_fixed_id') {
                minShelfThreshold = parseFloat(document.getElementById('prod-raw-shelf-threshold').value) || 5;
                minWarehouseThreshold = parseFloat(document.getElementById('prod-raw-wh-threshold').value) || 20;
                minThreshold = minWarehouseThreshold;
            }

            Store.saveIngredient({
                id: id ? id : undefined,
                name,
                categoryId,
                warehouseId,
                unit,
                minThreshold,
                minShelfThreshold,
                minWarehouseThreshold,
                hasExpiry
            });
            closeModal('add-product-modal');
            renderAll();
            showToast(`تم حفظ المادة الخام (${name}) بنجاح! 🌾✅`);
        } else {
            const category = document.getElementById('prod-pkg-category-select').value;
            const location = document.getElementById('prod-pkg-location-select').value;
            const unit = document.getElementById('prod-pkg-unit').value;
            const minThreshold = parseFloat(document.getElementById('prod-pkg-min-threshold').value) || 20;
            const notes = document.getElementById('prod-pkg-notes').value.trim();

            Store.saveProduct({
                id: id ? id : undefined,
                name,
                category,
                location,
                unit,
                minThreshold,
                notes
            });
            closeModal('add-product-modal');
            renderAll();
            showToast(`تم حفظ منتج التغليف (${name}) بنجاح! 📦✅`);
        }
    });

    document.getElementById('prod-filter-category')?.addEventListener('change', renderProductsTab);
    document.getElementById('prod-filter-location')?.addEventListener('change', renderProductsTab);
    document.getElementById('prod-search-input')?.addEventListener('input', renderProductsTab);

    // ================= MASTER DROPDOWN: إدارة المخزون =================
    window.selectInventoryNavTab = function(tabId) {
        // Hide desktop dropdown menu
        const menu = document.getElementById('inventory-dropdown-menu');
        const chevron = document.getElementById('inventory-dropdown-chevron');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.add('hidden');
        }
        if (chevron) chevron.style.transform = 'rotate(0deg)';

        switchTab(tabId);

        if (tabId === 'warehouse-1-tab' || tabId === 'warehouse-2-tab') {
            renderWarehousesTab();
        } else if (tabId === 'products-tab') {
            renderProductsTab();
        }
    };

    window.toggleInventoryDropdown = function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const menu = document.getElementById('inventory-dropdown-menu');
        const chevron = document.getElementById('inventory-dropdown-chevron');
        if (!menu) return;

        const isVisible = (menu.style.display === 'block' || (!menu.classList.contains('hidden') && menu.style.display !== 'none'));
        if (isVisible) {
            menu.style.display = 'none';
            menu.classList.add('hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        } else {
            menu.style.display = 'block';
            menu.classList.remove('hidden');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        }
    };

    window.toggleMobileInventoryAccordion = function() {
        const content = document.getElementById('mobile-inv-accordion-content');
        const chevron = document.getElementById('mobile-inv-chevron');
        if (!content) return;

        const isHidden = (content.style.display === 'none' || content.classList.contains('hidden'));
        if (isHidden) {
            content.style.display = 'block';
            content.classList.remove('hidden');
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            content.classList.add('hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    };

    // Close desktop dropdown on click outside
    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('inventory-dropdown-wrapper');
        const menu = document.getElementById('inventory-dropdown-menu');
        const chevron = document.getElementById('inventory-dropdown-chevron');
        if (menu && (menu.style.display === 'block' || !menu.classList.contains('hidden'))) {
            if (wrapper && !wrapper.contains(e.target)) {
                menu.style.display = 'none';
                menu.classList.add('hidden');
                if (chevron) chevron.style.transform = 'rotate(0deg)';
            }
        }
    });

    // ================= 7. INDEPENDENT WAREHOUSE SECTIONS (مخزن 1 & مخزن 2) =================
    window.whCategoryFilters = window.whCategoryFilters || {};
    window.whSearchQueries = window.whSearchQueries || {};

    window.setWarehouseCategoryFilter = function(whId, catId) {
        window.whCategoryFilters[whId] = catId;
        renderWarehousesTab();
    };

    window.setWarehouseSearchQuery = function(whId, query) {
        window.whSearchQueries[whId] = query;
        renderWarehousesTab();
    };

    function renderSingleWarehousePanel(targetWhId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const warehouses = Store.getWarehouses();
        const categories = Store.getCategories();
        const ingredients = Store.getIngredients();
        const inventory = calculateInventory('all', 'all');

        let targetWh = warehouses.find(w => w.id === targetWhId);
        if (!targetWh) {
            if (containerId.includes('1')) {
                targetWh = warehouses[0] || { id: 'wh1_fixed_id', name: 'مخزن 1', categoryIds: ["cat_1", "cat_2", "cat_3", "cat_4", "cat_5", "cat_6", "cat_7", "cat_8", "cat_9", "cat_10"] };
            } else {
                targetWh = warehouses[1] || { id: 'wh2_fixed_id', name: 'مخزن 2', categoryIds: ["cat_wh2_syrup", "cat_wh2_topping", "cat_wh2_drinkware", "cat_wh2_foodpack", "cat_wh2_dry", "cat_wh2_frozen", "cat_wh2_dairy", "cat_wh2_coffee", "cat_wh2_tea"] };
            }
        }

        const isFirstWh = (containerId.includes('1') || targetWh.id === 'wh1_fixed_id');
        const isWh2 = (targetWh.id === 'wh2_fixed_id' || containerId.includes('2'));

        // Active Warehouse Details & Items
        const assignedCats = categories.filter(c => targetWh.categoryIds && targetWh.categoryIds.includes(c.id));
        const allWhIngredients = ingredients.filter(i => {
            if (isWh2) {
                return i.warehouseId === 'wh2_fixed_id' || i.warehouseId === 'wh2' || (targetWh.categoryIds && targetWh.categoryIds.includes(i.categoryId));
            } else {
                return i.warehouseId === 'wh1_fixed_id' || i.warehouseId === 'wh1' || !i.warehouseId || (targetWh.categoryIds && targetWh.categoryIds.includes(i.categoryId));
            }
        });
        const whIngredients = allWhIngredients.filter(i => !i.archived);
        const whArchivedCount = allWhIngredients.filter(i => i.archived).length;

        const activeCatFilter = window.whCategoryFilters[targetWh.id] || 'all';
        const searchQuery = (window.whSearchQueries[targetWh.id] || '').trim().toLowerCase();

        // Inventory Stats for active warehouse
        const lowStockItems = whIngredients.filter(i => (inventory[i.id]?.remaining || 0) <= (i.minThreshold || 5));

        // Filter items to display
        let displayItems = whIngredients;
        if (activeCatFilter !== 'all') {
            displayItems = displayItems.filter(i => i.categoryId === activeCatFilter);
        }
        if (searchQuery) {
            displayItems = displayItems.filter(i => (i.name || '').toLowerCase().includes(searchQuery));
        }

        // Safe shelf transfers getter
        const getSafeTransfers = () => {
            try {
                if (typeof Store.getShelfTransfers === 'function') {
                    return Store.getShelfTransfers() || [];
                }
                if (typeof Store._get === 'function') {
                    return Store._get('inv_shelf_transfers') || [];
                }
            } catch(e){}
            return [];
        };
        const allTransfers = getSafeTransfers();

        const generateTableRowsHtml = () => {
            if (displayItems.length === 0) {
                return `
                    <tr>
                        <td colspan="${isWh2 ? '8' : '7'}" class="text-center py-10 text-slate-400 font-bold">
                            <div class="text-3xl mb-1.5">📦</div>
                            <p class="text-sm font-bold text-slate-600">لا توجد مواد مضافة في هذا المخزن حالياً.</p>
                            <button type="button" onclick="openAddProductModal('${targetWh.id}')" class="mt-2.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs">
                                ➕ إضافة مادة جديدة لهذا المخزن
                            </button>
                        </td>
                    </tr>
                `;
            }

            return displayItems.map(ing => {
                const cat = categories.find(c => c.id === ing.categoryId);
                const itemInv = inventory[ing.id] || { remaining: 0, nearestExpiry: null };
                const remaining = parseFloat(itemInv.remaining) || 0;
                const unitName = (typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit || 'حبة';

                const minThresh = parseFloat(ing.minThreshold) || 5;
                const shelfThresh = parseFloat(ing.minShelfThreshold) || minThresh;
                const whThresh = parseFloat(ing.minWarehouseThreshold) || minThresh;

                let statusBadge = '';
                if (isWh2) {
                    if (remaining <= 0) {
                        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800">❌ نافذ</span>';
                    } else if (remaining <= shelfThresh) {
                        statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">⚠️ تعبئة الرف (${remaining}/${shelfThresh})</span>`;
                    } else if (remaining <= whThresh) {
                        statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">🚨 طلب للمخزن (${remaining}/${whThresh})</span>`;
                    } else {
                        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800">✅ متوفر وفير</span>`;
                    }
                } else {
                    if (remaining <= 0) {
                        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-100 text-rose-800">❌ نافذ</span>';
                    } else if (remaining <= minThresh) {
                        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-800">⚠️ تحت الحد (${remaining}/${minThresh})</span>`;
                    } else {
                        statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800">✅ متوفر وفير</span>`;
                    }
                }

                const isMandatory = (ing.hasExpiry === 'no' || ing.hasExpiry === false) ? false : true;
                let expiryBadge = '<span class="text-slate-400 text-[11px]">♾️ غير إجباري</span>';
                if (isMandatory) {
                    if (itemInv.nearestExpiry) {
                        expiryBadge = `<span class="badge-pill bg-slate-100 text-slate-700 font-bold text-[11px]">⏳ ${itemInv.nearestExpiry}</span>`;
                    } else {
                        expiryBadge = '<span class="badge-pill bg-slate-50 text-slate-500 text-[11px]">إلزامي ⏳</span>';
                    }
                }

                return `
                    <tr class="hover:bg-slate-50/80 transition">
                        <td class="px-4 py-3 font-bold text-slate-900 text-sm">${ing.name}</td>
                        <td class="px-4 py-3">
                            <span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold">${cat ? cat.name : 'عام'}</span>
                        </td>
                        <td class="px-4 py-3 font-black text-slate-900 text-sm">${remaining} ${unitName}</td>
                        ${isWh2 ? `
                            <td class="px-4 py-3 font-bold text-amber-800 bg-amber-50/30 text-xs">${shelfThresh} ${unitName}</td>
                            <td class="px-4 py-3 font-bold text-rose-800 bg-rose-50/30 text-xs">${whThresh} ${unitName}</td>
                        ` : `
                            <td class="px-4 py-3 font-bold text-slate-500">${minThresh} ${unitName}</td>
                        `}
                        <td class="px-4 py-3">${statusBadge}</td>
                        <td class="px-4 py-3">${expiryBadge}</td>
                        <td class="px-4 py-3 text-center">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="openProductMovementReport('${ing.id}', 'ingredient')" class="text-blue-700 hover:text-blue-900 font-bold text-xs cursor-pointer px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition flex items-center gap-1" title="تقرير حركة وتتبع استهلاك وتلف المنتج">
                                    <span>📊</span> <span>تقرير</span>
                                </button>
                                <button onclick="archiveProductItem('${ing.id}', 'ingredient')" class="text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center gap-1" title="أرشفة المنتج وإيقاف استخدامه مؤقتاً">
                                    <span>🗄️</span> <span>أرشفة</span>
                                </button>
                                <button onclick="openEditUnifiedProductModal('raw', '${ing.id}')" class="text-indigo-600 hover:text-indigo-900 font-bold text-xs cursor-pointer px-2 py-1 hover:bg-indigo-50 rounded" title="تعديل المادة">✏️ تعديل</button>
                                <button onclick="deleteUnifiedProduct('raw', '${ing.id}')" class="text-rose-600 hover:text-rose-900 font-bold text-xs cursor-pointer px-2 py-1 hover:bg-rose-50 rounded" title="حذف المادة">🗑️ حذف</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        const existingTableBody = document.getElementById(`wh-table-body-${targetWh.id}`);
        const existingCatSelect = document.getElementById(`wh-cat-select-${targetWh.id}`);
        const existingSearchInput = document.getElementById(`wh-search-input-${targetWh.id}`);

        if (container.children.length > 0 && existingTableBody && existingSearchInput && container.contains(existingTableBody)) {
            // Smoothly update rows without rebuilding outer DOM, keeping search input focus active!
            existingTableBody.innerHTML = generateTableRowsHtml();
            if (existingCatSelect && existingCatSelect.value !== activeCatFilter) {
                existingCatSelect.value = activeCatFilter;
            }
            return;
        }

        container.innerHTML = `
            <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 hover:shadow-md transition space-y-6" data-warehouse-id="${targetWh.id}">
                <!-- 1. Header with Name, Status, Badges & Actions -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
                    <div class="flex items-center gap-3.5">
                        <div class="w-14 h-14 rounded-2xl ${isFirstWh ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'} flex items-center justify-center text-3xl shadow-2xs">
                            ${isFirstWh ? '🏬' : '🏢'}
                        </div>
                        <div>
                            <div class="flex items-center gap-2.5">
                                <h3 class="text-xl sm:text-2xl font-black text-slate-900">${targetWh.name}</h3>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> قسم ومخزن مستقل نشط
                                </span>
                            </div>
                            <div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-bold">
                                <span class="badge-pill bg-slate-100 text-slate-700">📦 المواد النشطة: ${whIngredients.length}</span>
                                <span class="badge-pill ${isFirstWh ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}">🏷️ الفئات: ${assignedCats.length}</span>
                                ${whArchivedCount > 0 ? `
                                    <button type="button" onclick="selectInventoryNavTab('archive-tab')" class="badge-pill bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer">
                                        🗄️ ${whArchivedCount} مواد مؤرشفة
                                    </button>
                                ` : ''}
                                ${lowStockItems.length > 0 ? `
                                    <span class="badge-pill bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">⚠️ ${lowStockItems.length} مواد تحت حد الطلب</span>
                                ` : '<span class="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200">✅ حالة المخزون ممتازة</span>'}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
                        ${isWh2 ? `
                            <button onclick="openTransferShelfModal()" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3.5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                                <span>📦</span> <span>سحب إلى رف المحل</span>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- 2. Single Category Selector Dropdown & Live Search Bar inside this Warehouse -->
                <div class="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <!-- Single Category Dropdown -->
                    <div class="flex items-center gap-2">
                        <label class="text-xs font-black text-slate-700 whitespace-nowrap">🏷️ فئات ${targetWh.name}:</label>
                        <select id="wh-cat-select-${targetWh.id}" onchange="setWarehouseCategoryFilter('${targetWh.id}', this.value)" class="bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:border-indigo-600 shadow-2xs transition cursor-pointer min-w-[220px]">
                            <option value="all" ${activeCatFilter === 'all' ? 'selected' : ''}>🌟 جميع الفئات (${whIngredients.length} مادة)</option>
                            ${assignedCats.map(cat => {
                                const count = whIngredients.filter(i => i.categoryId === cat.id).length;
                                return `<option value="${cat.id}" ${activeCatFilter === cat.id ? 'selected' : ''}>🏷️ ${cat.name} (${count})</option>`;
                            }).join('')}
                        </select>
                    </div>

                    <!-- Live Search inside Active Warehouse -->
                    <div class="relative w-full sm:w-72">
                        <input type="text" id="wh-search-input-${targetWh.id}" value="${searchQuery}" oninput="setWarehouseSearchQuery('${targetWh.id}', this.value)" placeholder="🔍 بحث سريع في مواد ${targetWh.name}..." class="w-full bg-white border-2 border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 focus:border-indigo-600 shadow-2xs transition">
                    </div>
                </div>

                <!-- 3. Materials & Products Live Inventory Table -->
                <div class="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                    <table class="w-full text-right text-xs">
                        <thead class="bg-slate-50 text-slate-700 font-black border-b border-slate-200">
                            <tr>
                                <th class="px-4 py-3.5">المادة / المنتج</th>
                                <th class="px-4 py-3.5">الفئة</th>
                                <th class="px-4 py-3.5">الرصيد المتوفر</th>
                                ${isWh2 ? `
                                    <th class="px-4 py-3.5 text-amber-800 bg-amber-50/60">🏷️ حد الرف</th>
                                    <th class="px-4 py-3.5 text-rose-800 bg-rose-50/60">📦 حد المخزن</th>
                                ` : `
                                    <th class="px-4 py-3.5">حد الطلب الأدنى</th>
                                `}
                                <th class="px-4 py-3.5">حالة المخزون</th>
                                <th class="px-4 py-3.5">الصلاحية</th>
                                <th class="px-4 py-3.5 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="wh-table-body-${targetWh.id}" class="divide-y divide-slate-100 font-medium">
                            ${generateTableRowsHtml()}
                        </tbody>
                    </table>
                </div>

                ${isWh2 ? `
                    <!-- 4. Warehouse 2 Specific: Shelf Pull & Transfers Log Section -->
                    <div class="mt-8 pt-6 border-t border-slate-200 space-y-4">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-800">حركات النقل والتعبئة 📦</span>
                                    <h4 class="text-base sm:text-lg font-black text-slate-900">سجل سحب المواد من المخزن إلى رفوف المحلات</h4>
                                </div>
                                <p class="text-xs text-slate-500 mt-0.5">متابعة المواد والكميات المسحوبة من مخزن 2 والموزعة على أرفف الفروع (طحنه، كثيب، زعفل)</p>
                            </div>
                            <button onclick="openTransferShelfModal()" class="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                                <span>➕</span> <span>تسجيل سحب جديد للرف</span>
                            </button>
                        </div>

                        <!-- Branch Filter Chips for Shelf Transfers -->
                        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                            <button onclick="setShelfTransferFilter('all')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${(window.shelfTransferFilter || 'all') === 'all' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                                🌟 جميع الرفوف (${allTransfers.length})
                            </button>
                            <button onclick="setShelfTransferFilter('tahnah')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${(window.shelfTransferFilter || 'all') === 'tahnah' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                                🏪 رف محل طحنه (${allTransfers.filter(t => t.branch === 'tahnah').length})
                            </button>
                            <button onclick="setShelfTransferFilter('katheeb')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${(window.shelfTransferFilter || 'all') === 'katheeb' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                                🏪 رف محل كثيب (${allTransfers.filter(t => t.branch === 'katheeb').length})
                            </button>
                            <button onclick="setShelfTransferFilter('zafal')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${(window.shelfTransferFilter || 'all') === 'zafal' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                                🏪 رف محل زعفل (${allTransfers.filter(t => t.branch === 'zafal').length})
                            </button>
                        </div>

                        <!-- Shelf Transfers History Table -->
                        <div class="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                            <table class="w-full text-right text-xs">
                                <thead class="bg-amber-50/60 text-amber-900 font-black border-b border-amber-200">
                                    <tr>
                                        <th class="px-4 py-3">التاريخ والوقت</th>
                                        <th class="px-4 py-3">المحل / الرف المستهدف</th>
                                        <th class="px-4 py-3">المادة المسحوبة</th>
                                        <th class="px-4 py-3">الكمية المسحوبة</th>
                                        <th class="px-4 py-3">فحص رصيد الستور (فعلي / مسجل)</th>
                                        <th class="px-4 py-3">مطابقة الرصيد / سبب الفرق</th>
                                        <th class="px-4 py-3">المسؤول عن السحب</th>
                                        <th class="px-4 py-3 text-center">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-medium">
                                    ${(() => {
                                        const curFilter = window.shelfTransferFilter || 'all';
                                        const displayTrfs = curFilter === 'all' ? allTransfers.slice().reverse() : allTransfers.filter(t => t.branch === curFilter).reverse();

                                        if (displayTrfs.length === 0) {
                                            return `
                                                <tr>
                                                    <td colspan="8" class="text-center py-8 text-slate-400 font-bold">
                                                        <div class="text-2xl mb-1">📦</div>
                                                        <p class="text-xs font-bold text-slate-500">لا توجد حركات سحب مسجلة لرفوف المحلات حتى الآن.</p>
                                                    </td>
                                                </tr>
                                            `;
                                        }

                                        const branchMap = {
                                            tahnah: { name: 'محل طحنه', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
                                            katheeb: { name: 'محل كثيب', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
                                            zafal: { name: 'محل زعفل', cls: 'bg-indigo-100 text-indigo-900 border-indigo-300' }
                                        };

                                        return displayTrfs.map(trf => {
                                            const ing = ingredients.find(i => i.id === trf.ingredientId);
                                            const unitName = ing ? ((typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit) : '';
                                            const bInfo = branchMap[trf.branch] || { name: trf.branch, cls: 'bg-slate-100 text-slate-800 border-slate-300' };

                                            const actualStock = trf.actualStockBeforePull !== undefined ? trf.actualStockBeforePull : '-';
                                            const sysStock = trf.systemStockBeforePull !== undefined ? trf.systemStockBeforePull : '-';
                                            const hasDiff = trf.discrepancy && Math.abs(trf.discrepancy) >= 0.0001;

                                            let diffBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">✅ مطابق للرصيد</span>';
                                            if (hasDiff) {
                                                const diffSign = trf.discrepancy > 0 ? `+${trf.discrepancy}` : `${trf.discrepancy}`;
                                                diffBadge = `
                                                    <div class="space-y-0.5">
                                                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                                            ⚠️ فرق (${diffSign} ${unitName})
                                                        </span>
                                                        <p class="text-[10px] text-slate-600 font-bold max-w-xs truncate">${trf.discrepancyReason || trf.notes || '-'}</p>
                                                    </div>
                                                `;
                                            } else if (trf.notes) {
                                                diffBadge = `<span class="text-[10px] text-slate-600">${trf.notes}</span>`;
                                            }

                                            return `
                                                <tr class="hover:bg-amber-50/20 transition">
                                                    <td class="px-4 py-3 font-bold text-slate-600" dir="ltr">${new Date(trf.date).toLocaleString('ar-OM', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                    <td class="px-4 py-3">
                                                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${bInfo.cls}">
                                                            <span>🏪</span> <span>${bInfo.name}</span>
                                                        </span>
                                                    </td>
                                                    <td class="px-4 py-3 font-black text-slate-900 text-sm">${ing ? ing.name : '-'}</td>
                                                    <td class="px-4 py-3 font-black text-amber-700 text-sm">${trf.quantity} ${unitName}</td>
                                                    <td class="px-4 py-3 text-xs font-bold text-slate-700">
                                                        <span>فعلي: <strong>${actualStock} ${unitName}</strong></span>
                                                        <span class="text-slate-400 mx-1">/</span>
                                                        <span class="text-slate-500">نظام: ${sysStock}</span>
                                                    </td>
                                                    <td class="px-4 py-3">${diffBadge}</td>
                                                    <td class="px-4 py-3 font-bold text-slate-700">👤 ${trf.transferredBy || '-'}</td>
                                                    <td class="px-4 py-3 text-center">
                                                        <button onclick="deleteShelfTransferRecord('${trf.id}')" class="text-rose-600 hover:text-rose-800 font-bold text-xs px-2 py-1 hover:bg-rose-50 rounded transition cursor-pointer" title="حذف حركة السحب">🗑️ حذف</button>
                                                    </td>
                                                </tr>
                                            `;
                                        }).join('');
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // --- Shelf Transfer Modal Handlers with Category Filter ---
    window.populateTransferItemDropdown = function(filteredCatId = 'all', prefillIngredientId = null) {
        const itemSelect = document.getElementById('transfer-item-select');
        if (!itemSelect) return;

        const ingredients = Store.getIngredients();
        const categories = Store.getCategories();
        const inventory = calculateInventory('all', 'all');
        const warehouses = Store.getWarehouses();
        const wh2 = warehouses.find(w => w.id === 'wh2_fixed_id') || warehouses[1] || { id: 'wh2_fixed_id', categoryIds: [] };

        const wh2Ingredients = ingredients.filter(i => {
            return i.warehouseId === 'wh2_fixed_id' || i.warehouseId === 'wh2' || (wh2.categoryIds && wh2.categoryIds.includes(i.categoryId));
        });

        let targetIngredients = wh2Ingredients;
        if (filteredCatId && filteredCatId !== 'all') {
            targetIngredients = targetIngredients.filter(i => i.categoryId === filteredCatId);
        }

        if (targetIngredients.length === 0) {
            itemSelect.innerHTML = '<option value="">-- لا توجد مواد مسجلة في هذه الفئة --</option>';
            updateTransferItemDetails();
            return;
        }

        if (filteredCatId && filteredCatId !== 'all') {
            itemSelect.innerHTML = targetIngredients.map(ing => {
                const rem = inventory[ing.id]?.remaining || 0;
                const unit = (typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit;
                return `<option value="${ing.id}" ${prefillIngredientId === ing.id ? 'selected' : ''}>${ing.name} (المتوفر: ${rem} ${unit})</option>`;
            }).join('');
        } else {
            // Group by category when viewing all
            const assignedCats = categories.filter(c => wh2.categoryIds && wh2.categoryIds.includes(c.id));
            let html = '';
            assignedCats.forEach(cat => {
                const catIngs = targetIngredients.filter(i => i.categoryId === cat.id);
                if (catIngs.length > 0) {
                    html += `<optgroup label="🏷️ ${cat.name}">`;
                    html += catIngs.map(ing => {
                        const rem = inventory[ing.id]?.remaining || 0;
                        const unit = (typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit;
                        return `<option value="${ing.id}" ${prefillIngredientId === ing.id ? 'selected' : ''}>${ing.name} (المتوفر: ${rem} ${unit})</option>`;
                    }).join('');
                    html += `</optgroup>`;
                }
            });

            // Any remaining without specific category group
            const uncatIngs = targetIngredients.filter(i => !assignedCats.some(c => c.id === i.categoryId));
            if (uncatIngs.length > 0) {
                html += `<optgroup label="🏷️ فئات أخرى">`;
                html += uncatIngs.map(ing => {
                    const rem = inventory[ing.id]?.remaining || 0;
                    const unit = (typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit;
                    return `<option value="${ing.id}" ${prefillIngredientId === ing.id ? 'selected' : ''}>${ing.name} (المتوفر: ${rem} ${unit})</option>`;
                }).join('');
                html += `</optgroup>`;
            }

            itemSelect.innerHTML = html;
        }

        if (prefillIngredientId) {
            itemSelect.value = prefillIngredientId;
        }

        updateTransferItemDetails();
    };

    window.onTransferCategoryChange = function() {
        const catFilter = document.getElementById('transfer-category-filter');
        const selectedCatId = catFilter ? catFilter.value : 'all';
        populateTransferItemDropdown(selectedCatId, null);
    };

    window.openTransferShelfModal = function(prefillIngredientId = null, prefillBranch = 'tahnah') {
        const modal = document.getElementById('transfer-shelf-modal');
        if (!modal) return;

        const form = document.getElementById('transfer-shelf-form');
        if (form) form.reset();
        document.getElementById('transfer-id').value = '';

        const catFilter = document.getElementById('transfer-category-filter');
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();
        const ingredients = Store.getIngredients();
        const wh2 = warehouses.find(w => w.id === 'wh2_fixed_id') || warehouses[1] || { id: 'wh2_fixed_id', categoryIds: [] };
        const wh2Cats = categories.filter(c => wh2.categoryIds && wh2.categoryIds.includes(c.id));

        let initialCatId = 'all';
        if (prefillIngredientId) {
            const prefillIng = ingredients.find(i => i.id === prefillIngredientId);
            if (prefillIng && prefillIng.categoryId) {
                initialCatId = prefillIng.categoryId;
            }
        }

        if (catFilter) {
            catFilter.innerHTML = `<option value="all">🌟 جميع الفئات (${wh2Cats.length} فئة)</option>` + 
                wh2Cats.map(c => `<option value="${c.id}" ${initialCatId === c.id ? 'selected' : ''}>🏷️ ${c.name}</option>`).join('');
            catFilter.value = initialCatId;
        }

        populateTransferItemDropdown(initialCatId, prefillIngredientId);

        if (prefillBranch) {
            const radio = document.querySelector(`input[name="transfer-shelf-branch"][value="${prefillBranch}"]`);
            if (radio) radio.checked = true;
        }

        updateTransferItemDetails();
        openModal('transfer-shelf-modal');
    };

    window.updateTransferItemDetails = function() {
        const itemSelect = document.getElementById('transfer-item-select');
        const unitDisplay = document.getElementById('transfer-unit-display');
        const stockInfo = document.getElementById('transfer-item-stock-info');
        const systemStockBadge = document.getElementById('transfer-system-stock-badge');
        const actualInput = document.getElementById('transfer-actual-warehouse-qty');
        const discrepancyReason = document.getElementById('transfer-discrepancy-reason');
        const discrepancyBox = document.getElementById('transfer-discrepancy-box');
        const diffAlert = document.getElementById('transfer-stock-diff-alert');
        if (!itemSelect || !unitDisplay || !stockInfo) return;

        const ingId = itemSelect.value;
        const ingredients = Store.getIngredients();
        const ing = ingredients.find(i => i.id === ingId);
        const inventory = calculateInventory('all', 'all');

        if (ing) {
            const rem = inventory[ing.id]?.remaining || 0;
            const unit = (typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit;
            unitDisplay.value = unit;
            const shelfThresh = ing.minShelfThreshold || ing.minThreshold || 5;
            const whThresh = ing.minWarehouseThreshold || ing.minThreshold || 20;

            window.currentTransferSystemStock = rem;
            window.currentTransferItemUnit = unit;

            if (systemStockBadge) {
                systemStockBadge.textContent = `المسجل بالنظام: ${rem} ${unit}`;
            }

            stockInfo.innerHTML = `
                <span>📦 الرصيد المسجل بالمخزن 2: <strong class="text-slate-900">${rem} ${unit}</strong></span>
                <span>•</span>
                <span>🏷️ حد الرف: <strong class="text-amber-800">${shelfThresh} ${unit}</strong></span>
                <span>•</span>
                <span>🏢 حد المخزن: <strong class="text-rose-800">${whThresh} ${unit}</strong></span>
            `;

            // Reset verification inputs when item changes
            if (actualInput) actualInput.value = '';
            if (discrepancyReason) discrepancyReason.value = '';
            if (discrepancyBox) discrepancyBox.classList.add('hidden');
            if (diffAlert) {
                diffAlert.classList.add('hidden');
                diffAlert.innerHTML = '';
            }
        } else {
            unitDisplay.value = 'حبة';
            stockInfo.innerHTML = '';
            window.currentTransferSystemStock = 0;
        }
    };

    window.validateTransferStockComparison = function() {
        const actualInput = document.getElementById('transfer-actual-warehouse-qty');
        const discrepancyBox = document.getElementById('transfer-discrepancy-box');
        const discrepancyReason = document.getElementById('transfer-discrepancy-reason');
        const diffAlert = document.getElementById('transfer-stock-diff-alert');
        if (!actualInput || !diffAlert) return;

        const valStr = actualInput.value.trim();
        if (valStr === '') {
            diffAlert.classList.add('hidden');
            if (discrepancyBox) discrepancyBox.classList.add('hidden');
            if (discrepancyReason) discrepancyReason.removeAttribute('required');
            return;
        }

        const actualQty = parseFloat(valStr);
        const sysQty = window.currentTransferSystemStock !== undefined ? window.currentTransferSystemStock : 0;
        const unit = window.currentTransferItemUnit || '';

        diffAlert.classList.remove('hidden');

        if (Math.abs(actualQty - sysQty) < 0.0001) {
            // Exact Match
            diffAlert.className = 'text-xs rounded-xl p-2.5 font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5';
            diffAlert.innerHTML = `<span>✅</span> <span>الكمية الفعلية مطابقة تماماً لرصيد النظام (${sysQty} ${unit}). يمكنك إتمام السحب مباشرة دون الحاجة لمبرر.</span>`;
            if (discrepancyBox) discrepancyBox.classList.add('hidden');
            if (discrepancyReason) {
                discrepancyReason.value = '';
                discrepancyReason.removeAttribute('required');
            }
        } else {
            // Discrepancy / Variance
            const diff = actualQty - sysQty;
            const diffText = diff > 0 ? `زيادة بمقدار +${diff.toFixed(2)}` : `نقص بمقدار ${diff.toFixed(2)}`;
            diffAlert.className = 'text-xs rounded-xl p-2.5 font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5';
            diffAlert.innerHTML = `<span>⚠️</span> <span>يوجد فرق في الستور: الفعلي (${actualQty} ${unit}) يختلف عن رصيد النظام (${sysQty} ${unit}) [${diffText} ${unit}]. يجب توضيح سبب الفرق أدناه للمتابعة.</span>`;
            if (discrepancyBox) discrepancyBox.classList.remove('hidden');
            if (discrepancyReason) {
                discrepancyReason.setAttribute('required', 'required');
            }
        }
    };

    window.validateTransferQuantityLimit = function() {
        const qtyInput = document.getElementById('transfer-quantity');
        const actualInput = document.getElementById('transfer-actual-warehouse-qty');
        if (!qtyInput || !actualInput) return;

        const pullQty = parseFloat(qtyInput.value);
        const actualQty = parseFloat(actualInput.value);
        const unit = window.currentTransferItemUnit || '';

        if (!isNaN(pullQty) && !isNaN(actualQty) && pullQty > actualQty) {
            qtyInput.setCustomValidity(`الكمية المسحوبة (${pullQty}) أكبر من الكمية الفعلية الموجودة في الستور (${actualQty} ${unit})!`);
        } else {
            qtyInput.setCustomValidity('');
        }
    };

    document.getElementById('transfer-shelf-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const branch = document.querySelector('input[name="transfer-shelf-branch"]:checked')?.value || 'tahnah';
        const ingredientId = document.getElementById('transfer-item-select').value;
        const actualQty = parseFloat(document.getElementById('transfer-actual-warehouse-qty').value);
        const quantity = parseFloat(document.getElementById('transfer-quantity').value);
        const discrepancyReasonInput = document.getElementById('transfer-discrepancy-reason');
        const discrepancyReason = discrepancyReasonInput ? discrepancyReasonInput.value.trim() : '';

        if (!ingredientId || isNaN(actualQty) || actualQty < 0) {
            alert('يرجى إدخال الكمية الفعلية المتبقية في الستور حالياً (العد الفعلي قبل السحب)!');
            document.getElementById('transfer-actual-warehouse-qty')?.focus();
            return;
        }

        if (isNaN(quantity) || quantity <= 0) {
            alert('يرجى تحديد كمية سحب صالحة أكبر من صفر!');
            document.getElementById('transfer-quantity')?.focus();
            return;
        }

        if (quantity > actualQty) {
            alert(`لا يمكن سحب (${quantity}) لأن الكمية الفعلية المتوفرة في الستور هي (${actualQty}) فقط!`);
            document.getElementById('transfer-quantity')?.focus();
            return;
        }

        const sysQty = window.currentTransferSystemStock !== undefined ? window.currentTransferSystemStock : 0;
        const hasDiff = Math.abs(actualQty - sysQty) >= 0.0001;

        if (hasDiff && !discrepancyReason) {
            alert('⚠️ يوجد فرق بين الرصيد الفعلي ورصيد النظام! يرجى كتابة سبب الفرق قبل إتمام السحب.');
            discrepancyReasonInput?.focus();
            return;
        }

        const ing = Store.getIngredients().find(i => i.id === ingredientId);
        const unit = ing ? (getI18nText('unit_' + ing.unit) || ing.unit) : '';
        const branchNames = { tahnah: 'محل طحنه', katheeb: 'محل كثيب', zafal: 'محل زعفل' };

        // Save shelf transfer record
        Store.saveShelfTransfer({
            branch,
            ingredientId,
            quantity,
            actualStockBeforePull: actualQty,
            systemStockBeforePull: sysQty,
            discrepancy: actualQty - sysQty,
            discrepancyReason: hasDiff ? discrepancyReason : 'الكمية الفعلية مطابقة لرصيد النظام',
            transferredBy: Store.getLoggedInUser()?.name || 'المشرف',
            date: new Date().toISOString()
        });

        // Reconcile system inventory if there was a discrepancy
        if (hasDiff) {
            try {
                const diff = actualQty - sysQty;
                if (diff < 0) {
                    Store.saveWaste({
                        type: 'ingredient',
                        itemId: ingredientId,
                        quantity: Math.abs(diff),
                        reason: `تسوية جرد فحص سحب للأرفف: ${discrepancyReason}`,
                        date: new Date().toISOString().split('T')[0],
                        recordedBy: Store.getLoggedInUser()?.name || 'المشرف'
                    });
                }
            } catch(err) {
                console.error("Auto reconcile error:", err);
            }
        }

        closeModal('transfer-shelf-modal');
        renderWarehousesTab();
        renderShelvesTab();
        showToast(`تم سحب (${quantity} ${unit}) ونقلها إلى (${branchNames[branch] || branch}) بنجاح! 📦🚀`);
    });

    window.setShelfTransferFilter = function(filter) {
        window.shelfTransferFilter = filter;
        renderWarehousesTab();
        renderShelvesTab();
    };

    window.deleteShelfTransferRecord = function(id) {
        if (confirm('هل أنت متأكد من حذف حركة السحب هذه؟')) {
            Store.deleteShelfTransfer(id);
            renderWarehousesTab();
            renderShelvesTab();
            showToast('تم حذف حركة السحب بنجاح! 🗑️');
        }
    };

    function renderWarehousesTab() {
        const warehouses = Store.getWarehouses();
        const wh1 = warehouses[0] || { id: 'wh1_fixed_id' };
        const wh2 = warehouses[1] || { id: 'wh2_fixed_id' };

        renderSingleWarehousePanel(wh1.id, 'warehouse-1-container');
        renderSingleWarehousePanel(wh2.id, 'warehouse-2-container');
    }

    // ================= SHELVES WAREHOUSE TAB (إدارة مخزن الأرفف) =================
    window.setShelfBranchFilter = function(branch) {
        window.activeShelfBranch = branch;
        renderShelvesTab();
    };

    window.setShelfCategoryFilter = function(catId) {
        window.activeShelfCategory = catId;
        renderShelvesTab();
    };

    window.setShelfSearchQuery = function(query) {
        window.activeShelfSearchQuery = query;
        renderShelvesTab();
    };

    function renderShelvesTab() {
        const container = document.getElementById('shelves-container');
        if (!container) return;

        const categories = Store.getCategories();
        const ingredients = Store.getIngredients();
        const warehouses = Store.getWarehouses();
        const inventory = calculateInventory('all', 'all');

        const wh2 = warehouses.find(w => w.id === 'wh2_fixed_id') || warehouses[1] || { id: 'wh2_fixed_id', categoryIds: [] };
        const wh2Cats = categories.filter(c => wh2.categoryIds && wh2.categoryIds.includes(c.id));
        const wh2Ingredients = ingredients.filter(i => {
            return i.warehouseId === 'wh2_fixed_id' || i.warehouseId === 'wh2' || (wh2.categoryIds && wh2.categoryIds.includes(i.categoryId));
        });

        const activeBranch = window.activeShelfBranch || 'all';
        const activeCategory = window.activeShelfCategory || 'all';
        const searchQuery = (window.activeShelfSearchQuery || '').trim().toLowerCase();

        // Get safe shelf transfers
        const getSafeTransfers = () => {
            try {
                if (typeof Store.getShelfTransfers === 'function') {
                    return Store.getShelfTransfers() || [];
                }
                if (typeof Store._get === 'function') {
                    return Store._get('inv_shelf_transfers') || [];
                }
            } catch(e){}
            return [];
        };
        const allTransfers = getSafeTransfers();

        // Branch display map
        const branchMap = {
            tahnah: { name: 'محل طحنه', cls: 'bg-amber-100 text-amber-900 border-amber-300', icon: '🏪' },
            katheeb: { name: 'محل كثيب', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: '🏪' },
            zafal: { name: 'محل زعفل', cls: 'bg-indigo-100 text-indigo-900 border-indigo-300', icon: '🏪' }
        };

        // Calculate shelf quantities
        const shelfItems = wh2Ingredients.map(ing => {
            const itemTransfers = allTransfers.filter(t => t.ingredientId === ing.id);
            const totalTransferredAll = itemTransfers.reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);

            const tahnahTransferred = itemTransfers.filter(t => t.branch === 'tahnah').reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);
            const katheebTransferred = itemTransfers.filter(t => t.branch === 'katheeb').reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);
            const zafalTransferred = itemTransfers.filter(t => t.branch === 'zafal').reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);

            let currentBranchQty = totalTransferredAll;
            if (activeBranch === 'tahnah') currentBranchQty = tahnahTransferred;
            else if (activeBranch === 'katheeb') currentBranchQty = katheebTransferred;
            else if (activeBranch === 'zafal') currentBranchQty = zafalTransferred;

            const shelfThreshold = parseFloat(ing.minShelfThreshold) || parseFloat(ing.minThreshold) || 5;
            const whThreshold = parseFloat(ing.minWarehouseThreshold) || parseFloat(ing.minThreshold) || 20;
            const whRemaining = parseFloat(inventory[ing.id]?.remaining) || 0;

            return {
                ...ing,
                currentBranchQty,
                tahnahTransferred,
                katheebTransferred,
                zafalTransferred,
                totalTransferredAll,
                shelfThreshold,
                whThreshold,
                whRemaining
            };
        });

        // Filter items
        let displayShelfItems = shelfItems;
        if (activeCategory !== 'all') {
            displayShelfItems = displayShelfItems.filter(i => i.categoryId === activeCategory);
        }
        if (searchQuery) {
            displayShelfItems = displayShelfItems.filter(i => (i.name || '').toLowerCase().includes(searchQuery));
        }

        // Stats calculation
        const totalItemsCount = wh2Ingredients.length;
        const totalQtyOnShelves = allTransfers.filter(t => activeBranch === 'all' || t.branch === activeBranch)
            .reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);
        const lowStockShelfCount = shelfItems.filter(i => i.currentBranchQty <= i.shelfThreshold).length;

        container.innerHTML = `
            <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 hover:shadow-md transition space-y-6">
                <!-- 1. Header with Stats & Actions -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
                    <div class="flex items-center gap-3.5">
                        <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center text-3xl shadow-2xs">
                            🏪
                        </div>
                        <div>
                            <div class="flex items-center gap-2.5">
                                <h3 class="text-xl sm:text-2xl font-black text-slate-900">إدارة ومتابعة مخزن الأرفف</h3>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> أرفف المحلات نشطة
                                </span>
                            </div>
                            <div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                                <span class="badge-pill bg-slate-100 text-slate-700 font-bold">📦 إجمالي الأصناف: ${totalItemsCount}</span>
                                <span class="badge-pill bg-amber-50 text-amber-900 border border-amber-200 font-bold">🚚 الكميات المسحوبة للرفوف: ${totalQtyOnShelves.toFixed(2)}</span>
                                ${lowStockShelfCount > 0 ? `
                                    <span class="badge-pill bg-rose-50 text-rose-700 border border-rose-200 font-bold animate-pulse">⚠️ ${lowStockShelfCount} مواد تحت حد الرف</span>
                                ` : '<span class="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">✅ جميع الرفوف ممتلئة</span>'}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
                        <button onclick="openTransferShelfModal(null, '${activeBranch !== 'all' ? activeBranch : 'tahnah'}')" class="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-2.5 rounded-xl shadow-xs text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer">
                            <span>📦</span> <span>سحب وتزويد الرف الآن</span>
                        </button>
                        <button onclick="switchTab('stocktake-tab'); if(typeof switchStocktakeSection==='function') switchStocktakeSection('shelves');" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3.5 py-2.5 rounded-xl border border-indigo-200 text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer">
                            <span>📋</span> <span>الجرد الشهري للأرفف</span>
                        </button>
                    </div>
                </div>

                <!-- 2. Branch Filter Bar -->
                <div class="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-center gap-2 overflow-x-auto pb-1 max-w-full text-xs font-bold">
                        <span class="text-slate-500 whitespace-nowrap">🏬 عرض الرفوف:</span>
                        <button onclick="setShelfBranchFilter('all')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeBranch === 'all' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🌟 جميع أرفف المحلات
                        </button>
                        <button onclick="setShelfBranchFilter('tahnah')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeBranch === 'tahnah' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🏪 رف محل طحنه
                        </button>
                        <button onclick="setShelfBranchFilter('katheeb')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeBranch === 'katheeb' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🏪 رف محل كثيب
                        </button>
                        <button onclick="setShelfBranchFilter('zafal')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeBranch === 'zafal' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🏪 رف محل زعفل
                        </button>
                    </div>

                    <!-- Live Search inside Shelves -->
                    <div class="relative w-full sm:w-64">
                        <input type="text" value="${searchQuery}" oninput="setShelfSearchQuery(this.value)" placeholder="🔍 بحث في مواد وأرفف المحلات..." class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 transition">
                    </div>
                </div>

                <!-- 3. Category Filter Chips -->
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
                    <button onclick="setShelfCategoryFilter('all')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${activeCategory === 'all' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                        🌟 جميع الفئات (${wh2Ingredients.length})
                    </button>
                    ${wh2Cats.map(cat => {
                        const count = wh2Ingredients.filter(i => i.categoryId === cat.id).length;
                        const isActive = activeCategory === cat.id;
                        return `
                            <button onclick="setShelfCategoryFilter('${cat.id}')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${isActive ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                                <span>🏷️ ${cat.name}</span>
                                <span class="text-[10px] opacity-80 px-1 rounded bg-black/10">(${count})</span>
                            </button>
                        `;
                    }).join('')}
                </div>

                <!-- 4. Shelves Inventory Table -->
                <div class="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                    <table class="w-full text-right text-xs">
                        <thead class="bg-amber-50/60 text-amber-900 font-black border-b border-amber-200">
                            <tr>
                                <th class="px-4 py-3.5">المادة / المنتج</th>
                                <th class="px-4 py-3.5">الفئة</th>
                                <th class="px-4 py-3.5">الرف / المحل</th>
                                <th class="px-4 py-3.5 bg-amber-100/50 text-amber-950 font-black">الكمية على الرف</th>
                                <th class="px-4 py-3.5">حد الرف الأدنى</th>
                                <th class="px-4 py-3.5">المتوفر بمخزن 2</th>
                                <th class="px-4 py-3.5">حالة الرف</th>
                                <th class="px-4 py-3.5 text-center">إجراء السحب</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            ${displayShelfItems.length === 0 ? `
                                <tr>
                                    <td colspan="8" class="text-center py-10 text-slate-400 font-bold">
                                        <div class="text-3xl mb-1.5">🏪</div>
                                        <p class="text-sm font-bold text-slate-600">لا توجد مواد مطابقة في أرفف المحلات حالياً.</p>
                                    </td>
                                </tr>
                            ` : displayShelfItems.map(ing => {
                                const cat = categories.find(c => c.id === ing.categoryId);
                                const unitName = (typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit || 'حبة';

                                let statusBadge = '';
                                if (ing.currentBranchQty <= 0) {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">❌ الرف فارغ</span>';
                                } else if (ing.currentBranchQty <= ing.shelfThreshold) {
                                    statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">⚠️ تعبئة الرف (${ing.currentBranchQty}/${ing.shelfThreshold})</span>`;
                                } else {
                                    statusBadge = `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800">✅ متوفر بالرف</span>`;
                                }

                                const branchLabel = activeBranch === 'all' 
                                    ? '<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold">🌟 جميع الفروع</span>'
                                    : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-black border ${branchMap[activeBranch]?.cls}"><span>🏪</span> <span>${branchMap[activeBranch]?.name}</span></span>`;

                                return `
                                    <tr class="hover:bg-amber-50/20 transition">
                                        <td class="px-4 py-3 font-bold text-slate-900 text-sm">${ing.name}</td>
                                        <td class="px-4 py-3">
                                            <span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold">${cat ? cat.name : 'عام'}</span>
                                        </td>
                                        <td class="px-4 py-3">${branchLabel}</td>
                                        <td class="px-4 py-3 font-black text-amber-900 bg-amber-50/30 text-sm">${ing.currentBranchQty} ${unitName}</td>
                                        <td class="px-4 py-3 font-bold text-slate-600 text-xs">${ing.shelfThreshold} ${unitName}</td>
                                        <td class="px-4 py-3 font-black text-slate-700 text-xs">${ing.whRemaining} ${unitName}</td>
                                        <td class="px-4 py-3">${statusBadge}</td>
                                        <td class="px-4 py-3 text-center">
                                            <button onclick="openTransferShelfModal('${ing.id}', '${activeBranch !== 'all' ? activeBranch : 'tahnah'}')" class="text-amber-700 hover:text-amber-900 font-black text-xs cursor-pointer px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition flex items-center justify-center gap-1 mx-auto" title="سحب وتزويد الرف من مخزن 2">
                                                <span>📦</span> <span>سحب للرف</span>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- 5. Shelf Transfers History Log -->
                <div class="mt-8 pt-6 border-t border-slate-200 space-y-4">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-100 text-amber-800">حركات النقل والتعبئة 📦</span>
                                <h4 class="text-base sm:text-lg font-black text-slate-900">سجل سحب وتوريد المواد لرفوف المحلات</h4>
                            </div>
                            <p class="text-xs text-slate-500 mt-0.5">متابعة كافة عمليات النقل المنفذة من مخزن 2 وتوزيعها على أرفف (طحنه، كثيب، زعفل)</p>
                        </div>
                        <button onclick="openTransferShelfModal(null, '${activeBranch !== 'all' ? activeBranch : 'tahnah'}')" class="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5 cursor-pointer">
                            <span>➕</span> <span>تسجيل سحب جديد للرف</span>
                        </button>
                    </div>

                    <!-- Filter Chips for History -->
                    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                        <button onclick="setShelfTransferFilter('all')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${(window.shelfTransferFilter || 'all') === 'all' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            🌟 جميع الرفوف (${allTransfers.length})
                        </button>
                        <button onclick="setShelfTransferFilter('tahnah')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${(window.shelfTransferFilter || 'all') === 'tahnah' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            🏪 رف محل طحنه (${allTransfers.filter(t => t.branch === 'tahnah').length})
                        </button>
                        <button onclick="setShelfTransferFilter('katheeb')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${(window.shelfTransferFilter || 'all') === 'katheeb' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            🏪 رف محل كثيب (${allTransfers.filter(t => t.branch === 'katheeb').length})
                        </button>
                        <button onclick="setShelfTransferFilter('zafal')" class="px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${(window.shelfTransferFilter || 'all') === 'zafal' ? 'bg-amber-500 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
                            🏪 رف محل زعفل (${allTransfers.filter(t => t.branch === 'zafal').length})
                        </button>
                    </div>

                    <!-- Shelf Transfers History Table -->
                    <div class="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                        <table class="w-full text-right text-xs">
                            <thead class="bg-amber-50/60 text-amber-900 font-black border-b border-amber-200">
                                <tr>
                                    <th class="px-4 py-3">التاريخ والوقت</th>
                                    <th class="px-4 py-3">المحل / الرف المستهدف</th>
                                    <th class="px-4 py-3">المادة المسحوبة</th>
                                    <th class="px-4 py-3">الكمية المسحوبة</th>
                                    <th class="px-4 py-3">فحص رصيد الستور (فعلي / مسجل)</th>
                                    <th class="px-4 py-3">مطابقة الرصيد / سبب الفرق</th>
                                    <th class="px-4 py-3">المسؤول عن السحب</th>
                                    <th class="px-4 py-3 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                ${(() => {
                                    const curFilter = window.shelfTransferFilter || 'all';
                                    const displayTrfs = curFilter === 'all' ? allTransfers.slice().reverse() : allTransfers.filter(t => t.branch === curFilter).reverse();

                                    if (displayTrfs.length === 0) {
                                        return `
                                            <tr>
                                                <td colspan="8" class="text-center py-8 text-slate-400 font-bold">
                                                    <div class="text-2xl mb-1">📦</div>
                                                    <p class="text-xs font-bold text-slate-500">لا توجد حركات سحب مسجلة لرفوف المحلات حتى الآن.</p>
                                                </td>
                                            </tr>
                                        `;
                                    }

                                    return displayTrfs.map(trf => {
                                        const ing = ingredients.find(i => i.id === trf.ingredientId);
                                        const unitName = ing ? ((typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit) : '';
                                        const bInfo = branchMap[trf.branch] || { name: trf.branch, cls: 'bg-slate-100 text-slate-800 border-slate-300' };

                                        const actualStock = trf.actualStockBeforePull !== undefined ? trf.actualStockBeforePull : '-';
                                        const sysStock = trf.systemStockBeforePull !== undefined ? trf.systemStockBeforePull : '-';
                                        const hasDiff = trf.discrepancy && Math.abs(trf.discrepancy) >= 0.0001;

                                        let diffBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">✅ مطابق للرصيد</span>';
                                        if (hasDiff) {
                                            const diffSign = trf.discrepancy > 0 ? `+${trf.discrepancy}` : `${trf.discrepancy}`;
                                            diffBadge = `
                                                <div class="space-y-0.5">
                                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                                        ⚠️ فرق (${diffSign} ${unitName})
                                                    </span>
                                                    <p class="text-[10px] text-slate-600 font-bold max-w-xs truncate">${trf.discrepancyReason || trf.notes || '-'}</p>
                                                </div>
                                            `;
                                        } else if (trf.notes) {
                                            diffBadge = `<span class="text-[10px] text-slate-600">${trf.notes}</span>`;
                                        }

                                        return `
                                            <tr class="hover:bg-amber-50/20 transition">
                                                <td class="px-4 py-3 font-bold text-slate-600" dir="ltr">${new Date(trf.date).toLocaleString('ar-OM', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                <td class="px-4 py-3">
                                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${bInfo.cls}">
                                                        <span>🏪</span> <span>${bInfo.name}</span>
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 font-black text-slate-900 text-sm">${ing ? ing.name : '-'}</td>
                                                <td class="px-4 py-3 font-black text-amber-700 text-sm">${trf.quantity} ${unitName}</td>
                                                <td class="px-4 py-3 text-xs font-bold text-slate-700">
                                                    <span>فعلي: <strong>${actualStock} ${unitName}</strong></span>
                                                    <span class="text-slate-400 mx-1">/</span>
                                                    <span class="text-slate-500">نظام: ${sysStock}</span>
                                                </td>
                                                <td class="px-4 py-3">${diffBadge}</td>
                                                <td class="px-4 py-3 font-bold text-slate-700">👤 ${trf.transferredBy || '-'}</td>
                                                <td class="px-4 py-3 text-center">
                                                    <button onclick="deleteShelfTransferRecord('${trf.id}')" class="text-rose-600 hover:text-rose-800 font-bold text-xs px-2 py-1 hover:bg-rose-50 rounded transition cursor-pointer" title="حذف حركة السحب">🗑️ حذف</button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('');
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    // ================= ARCHIVE TAB (أرشيف المنتجات والمواد المتوقفة) =================
    window.setArchiveFilter = function(filter) {
        window.activeArchiveFilter = filter;
        renderArchiveTab();
    };

    window.setArchiveSearchQuery = function(q) {
        window.activeArchiveSearchQuery = q;
        renderArchiveTab();
    };

    window.archiveProductItem = function(id, type = 'ingredient') {
        const item = type === 'product' 
            ? Store.getProducts().find(p => p.id === id)
            : Store.getIngredients().find(i => i.id === id);

        const itemName = item ? item.name : 'هذا المنتج';
        if (confirm(`هل أنت متأكد من أرشفة (${itemName}) وإيقاف استخدامه مؤقتاً؟\n(سيتم إخفاؤه من قوائم العمليات اليومية ونقله إلى أرشيف المنتجات، ويمكنك استعادته في أي وقت).`)) {
            if (type === 'product') {
                Store.archiveProduct(id);
            } else {
                Store.archiveIngredient(id);
            }
            renderAll();
            showToast(`تمت أرشفة (${itemName}) ونقله إلى قسم الأرشيف بنجاح! 🗄️`);
        }
    };

    window.unarchiveProductItem = function(id, type = 'ingredient') {
        const item = type === 'product'
            ? Store.getProducts().find(p => p.id === id)
            : Store.getIngredients().find(i => i.id === id);

        const itemName = item ? item.name : 'هذا المنتج';
        if (confirm(`هل ترغب في استعادة (${itemName}) وإعادة تفعيله في المخزون وقوائم العمليات النشطة؟`)) {
            if (type === 'product') {
                Store.unarchiveProduct(id);
            } else {
                Store.unarchiveIngredient(id);
            }
            renderAll();
            showToast(`✅ تم استعادة (${itemName}) وإعادة تفعيله بنجاح! 🎉`);
        }
    };

    function renderArchiveTab() {
        const container = document.getElementById('archive-container');
        if (!container) return;

        const allIngredients = Store.getIngredients();
        const allProducts = Store.getProducts();
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();

        const archivedIngredients = allIngredients.filter(i => i.archived);
        const archivedProducts = allProducts.filter(p => p.archived);

        const wh1 = warehouses.find(w => w.id === 'wh1_fixed_id') || warehouses[0] || { id: 'wh1_fixed_id', categoryIds: [] };
        const wh2 = warehouses.find(w => w.id === 'wh2_fixed_id') || warehouses[1] || { id: 'wh2_fixed_id', categoryIds: [] };

        const activeFilter = window.activeArchiveFilter || 'all';
        const searchQuery = (window.activeArchiveSearchQuery || '').trim().toLowerCase();

        // Combine into unified archived list
        let archivedList = [
            ...archivedIngredients.map(i => {
                const isWh2 = (i.warehouseId === 'wh2_fixed_id' || i.warehouseId === 'wh2' || (wh2.categoryIds && wh2.categoryIds.includes(i.categoryId)));
                return {
                    ...i,
                    itemType: 'ingredient',
                    whSource: isWh2 ? 'wh2' : 'wh1',
                    whName: isWh2 ? 'مخزن 2 (الفرعي)' : 'مخزن 1 (الرئيسي)'
                };
            }),
            ...archivedProducts.map(p => ({
                ...p,
                itemType: 'product',
                whSource: 'products',
                whName: 'دليل المنتجات والتغليف'
            }))
        ];

        // Counts
        const countAll = archivedList.length;
        const countWh1 = archivedList.filter(x => x.whSource === 'wh1').length;
        const countWh2 = archivedList.filter(x => x.whSource === 'wh2').length;
        const countProds = archivedList.filter(x => x.whSource === 'products').length;

        // Apply type filter
        if (activeFilter === 'wh1') archivedList = archivedList.filter(x => x.whSource === 'wh1');
        else if (activeFilter === 'wh2') archivedList = archivedList.filter(x => x.whSource === 'wh2');
        else if (activeFilter === 'products') archivedList = archivedList.filter(x => x.whSource === 'products');

        // Apply search filter
        if (searchQuery) {
            archivedList = archivedList.filter(x => (x.name || '').toLowerCase().includes(searchQuery));
        }

        container.innerHTML = `
            <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 hover:shadow-md transition space-y-6">
                <!-- 1. Header with Stats -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
                    <div class="flex items-center gap-3.5">
                        <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-3xl shadow-2xs">
                            🗄️
                        </div>
                        <div>
                            <div class="flex items-center gap-2.5">
                                <h3 class="text-xl sm:text-2xl font-black text-slate-900">أرشيف المنتجات والمواد المتوقفة</h3>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                    🗄️ المنتجات المعطلة والمؤرشفة
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-1">
                                المنتجات والمواد الخام التي تم إيقاف استخدامها مؤقتاً أو نهائياً، مع إمكانية استعادتها بضغطة زر وتصفح تقاريرها وتاريخها.
                            </p>
                            <div class="flex flex-wrap items-center gap-2 mt-2 text-xs font-bold">
                                <span class="badge-pill bg-slate-100 text-slate-700">📦 إجمالي المؤرشف: ${countAll}</span>
                                <span class="badge-pill bg-indigo-50 text-indigo-700 border border-indigo-200">🏬 مواد مخزن 1: ${countWh1}</span>
                                <span class="badge-pill bg-purple-50 text-purple-700 border border-purple-200">🏢 مواد مخزن 2: ${countWh2}</span>
                                <span class="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200">📦 منتجات وتغليف: ${countProds}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <button onclick="selectInventoryNavTab('warehouse-1-tab')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer">
                            <span>🏬</span> <span>العودة للمخازن النشطة</span>
                        </button>
                    </div>
                </div>

                <!-- 2. Filters & Search Bar -->
                <div class="bg-slate-50/80 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full text-xs font-bold">
                        <span class="text-slate-500 whitespace-nowrap">🗄️ تصفية الأرشيف:</span>
                        <button onclick="setArchiveFilter('all')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeFilter === 'all' ? 'bg-slate-800 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🌟 جميع المؤرشفات (${countAll})
                        </button>
                        <button onclick="setArchiveFilter('wh1')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeFilter === 'wh1' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🏬 مخزن 1 (${countWh1})
                        </button>
                        <button onclick="setArchiveFilter('wh2')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeFilter === 'wh2' ? 'bg-purple-600 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🏢 مخزن 2 (${countWh2})
                        </button>
                        <button onclick="setArchiveFilter('products')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeFilter === 'products' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            📦 منتجات وتغليف (${countProds})
                        </button>
                    </div>

                    <div class="relative w-full sm:w-64">
                        <input type="text" value="${searchQuery}" oninput="setArchiveSearchQuery(this.value)" placeholder="🔍 بحث في المنتجات المؤرشفة..." class="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-slate-600 transition">
                    </div>
                </div>

                <!-- 3. Archived Items Table -->
                <div class="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                    <table class="w-full text-right text-xs">
                        <thead class="bg-slate-100 text-slate-800 font-black border-b border-slate-200">
                            <tr>
                                <th class="px-4 py-3.5">المنتج / المادة</th>
                                <th class="px-4 py-3.5">المصدر والمخزن</th>
                                <th class="px-4 py-3.5">الفئة</th>
                                <th class="px-4 py-3.5">وحدة القياس والتكلفة</th>
                                <th class="px-4 py-3.5">حد إعادة الطلب</th>
                                <th class="px-4 py-3.5">تاريخ الأرشفة</th>
                                <th class="px-4 py-3.5 text-center">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            ${archivedList.length === 0 ? `
                                <tr>
                                    <td colspan="7" class="text-center py-12 text-slate-400 font-bold">
                                        <div class="text-3xl mb-1.5">🗄️</div>
                                        <p class="text-sm font-bold text-slate-600">لا توجد منتجات أو مواد مؤرشفة حالياً.</p>
                                        <p class="text-xs text-slate-400 mt-1">عند إيقاف أي منتج من المخازن سيظهر هنا مباشرة مع إمكانية استعادته بأي وقت.</p>
                                    </td>
                                </tr>
                            ` : archivedList.map(item => {
                                const cat = categories.find(c => c.id === item.categoryId);
                                const unitName = (typeof getI18nText === 'function' ? getI18nText('unit_' + item.unit) : item.unit) || item.unit || 'حبة';
                                const cost = parseFloat(item.costPerUnit || item.cost || 0).toFixed(3);
                                const shelfThresh = item.minShelfThreshold || item.minThreshold || '-';
                                const whThresh = item.minWarehouseThreshold || item.minThreshold || '-';
                                const archivedDate = item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('ar-OM') : 'سابقاً';

                                return `
                                    <tr class="hover:bg-slate-50/80 transition">
                                        <td class="px-4 py-3.5">
                                            <div class="font-black text-slate-900 text-sm">${item.name}</div>
                                            <div class="text-[11px] text-slate-400">${item.itemType === 'product' ? 'منتج جاهز / تغليف' : 'مادة خام'}</div>
                                        </td>
                                        <td class="px-4 py-3.5">
                                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${item.whSource === 'wh1' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : (item.whSource === 'wh2' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')}">
                                                <span>🏢</span> <span>${item.whName}</span>
                                            </span>
                                        </td>
                                        <td class="px-4 py-3.5 font-bold text-slate-700">
                                            🏷️ ${cat ? cat.name : 'عام'}
                                        </td>
                                        <td class="px-4 py-3.5 font-bold text-slate-700">
                                            <div>${unitName}</div>
                                            <div class="text-[10px] text-slate-400">${cost} ر.ع</div>
                                        </td>
                                        <td class="px-4 py-3.5 text-xs">
                                            ${item.whSource === 'wh2' ? `
                                                <span class="text-amber-800 font-bold">الرف: ${shelfThresh}</span> | <span class="text-rose-800 font-bold">المخزن: ${whThresh}</span>
                                            ` : `<span class="font-bold text-slate-700">${item.minThreshold || 5} ${unitName}</span>`}
                                        </td>
                                        <td class="px-4 py-3.5 text-xs text-slate-500 font-bold">
                                            <div>📅 ${archivedDate}</div>
                                            <div class="text-[10px] text-slate-400">بواسطة: ${item.archivedBy || 'المشرف'}</div>
                                        </td>
                                        <td class="px-4 py-3.5 text-center">
                                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                                <button onclick="unarchiveProductItem('${item.id}', '${item.itemType}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-2xs transition flex items-center gap-1 cursor-pointer" title="استعادة المنتج وإعادته للمخزن النشط">
                                                    <span>🔄</span> <span>استعادة للنشاط</span>
                                                </button>
                                                <button onclick="openProductMovementReport('${item.id}', '${item.itemType}')" class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="عرض تقرير وتاريخ حركة المنتج">
                                                    <span>📊</span> <span>التقرير والتتبع</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ================= PRODUCT MOVEMENT & LIFECYCLE REPORT TAB (تقرير حركة وتتبع المنتج الشامل) =================
    window.activeReportItemId = null;
    window.activeReportItemType = 'ingredient';
    window.activeReportDatePreset = 'all'; // 'today' | 'week' | 'month' | 'this_month' | 'last_month' | 'all' | 'custom'
    window.activeReportFromDate = '';
    window.activeReportToDate = '';

    window.openProductMovementReport = function(id, type = 'ingredient') {
        window.activeReportItemId = id;
        window.activeReportItemType = type;
        if (typeof window.selectInventoryNavTab === 'function') {
            window.selectInventoryNavTab('product-report-tab');
        } else {
            window.switchTab('product-report-tab');
        }
        renderProductReportTab();
    };

    window.setProductReportDatePreset = function(preset) {
        window.activeReportDatePreset = preset;
        const now = new Date();
        const formatDate = d => d.toISOString().split('T')[0];

        if (preset === 'today') {
            window.activeReportFromDate = formatDate(now);
            window.activeReportToDate = formatDate(now);
        } else if (preset === 'week') {
            const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            window.activeReportFromDate = formatDate(last7);
            window.activeReportToDate = formatDate(now);
        } else if (preset === 'month') {
            const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            window.activeReportFromDate = formatDate(last30);
            window.activeReportToDate = formatDate(now);
        } else if (preset === 'this_month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            window.activeReportFromDate = formatDate(firstDay);
            window.activeReportToDate = formatDate(now);
        } else if (preset === 'last_month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
            window.activeReportFromDate = formatDate(firstDay);
            window.activeReportToDate = formatDate(lastDay);
        } else if (preset === 'all') {
            window.activeReportFromDate = '';
            window.activeReportToDate = '';
        }
        renderProductReportTab();
    };

    window.setProductReportItem = function(id) {
        window.activeReportItemId = id;
        renderProductReportTab();
    };

    window.applyCustomProductReportDates = function() {
        const fromInput = document.getElementById('report-from-date');
        const toInput = document.getElementById('report-to-date');
        if (fromInput && toInput) {
            window.activeReportDatePreset = 'custom';
            window.activeReportFromDate = fromInput.value;
            window.activeReportToDate = toInput.value;
            renderProductReportTab();
        }
    };

    function renderProductReportTab() {
        const container = document.getElementById('product-report-container');
        if (!container) return;

        const allIngredients = Store.getIngredients();
        const allProducts = Store.getProducts();
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();
        const recipes = Store.getRecipes();
        const purchases = Store.getPurchases();
        const wasteLogs = Store.getWasteLogs();
        const shelfTransfers = (typeof Store.getShelfTransfers === 'function') ? Store.getShelfTransfers() : (Store._get('inv_shelf_transfers') || []);
        const usageLogs = Store.getUsageLogs();
        const inventory = calculateInventory('all', 'all');

        // Guard for empty database
        if (allIngredients.length === 0 && allProducts.length === 0) {
            container.innerHTML = `
                <div class="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs space-y-4">
                    <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                        📊
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-slate-800">تقرير تتبع وحركة دورة حياة المنتج</h3>
                        <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">لا توجد مواد أو منتجات مضافة بعد. عند إضافة منتجات وتسجيل المشتريات والاستهلاك، سيقوم هذا القسم بعرض تحليل بياني كامل وشامل لحركة كل مادة من الشراء حتى الاستهلاك والتالف.</p>
                    </div>
                    <button type="button" onclick="switchTab('products-tab')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition cursor-pointer shadow-xs">
                        ➕ الانتقال إلى دليل وإضافة المنتجات
                    </button>
                </div>
            `;
            return;
        }

        // Set default item if none active
        if (!window.activeReportItemId) {
            const firstIng = allIngredients.find(i => !i.archived) || allIngredients[0];
            if (firstIng) window.activeReportItemId = firstIng.id;
        }

        const selectedId = window.activeReportItemId;
        const currentIng = allIngredients.find(i => i.id === selectedId);
        const currentProd = allProducts.find(p => p.id === selectedId);
        const item = currentIng || currentProd || allIngredients[0] || { name: 'المادة', unit: 'حبة' };
        const isIng = !!currentIng;

        const unitName = (typeof getI18nText === 'function' ? getI18nText('unit_' + item.unit) : item.unit) || item.unit || 'حبة';
        const currentRemaining = parseFloat(inventory[item.id]?.remaining || 0);

        // Date Window Checking Function
        const isWithinRange = (dateStr) => {
            if (!dateStr) return true;
            if (!window.activeReportFromDate && !window.activeReportToDate) return true;
            const itemDate = new Date(dateStr);
            if (window.activeReportFromDate) {
                const fromDate = new Date(window.activeReportFromDate + 'T00:00:00');
                if (itemDate < fromDate) return false;
            }
            if (window.activeReportToDate) {
                const toDate = new Date(window.activeReportToDate + 'T23:59:59');
                if (itemDate > toDate) return false;
            }
            return true;
        };

        // 1. PURCHASES ANALYSIS (المشتريات والتوريد)
        const relevantPurchases = [];
        let totalPurchasedQty = 0;
        let totalPurchasedCost = 0;

        purchases.forEach(p => {
            const pDate = p.date || p.dateAdded;
            if (isWithinRange(pDate) && p.items && Array.isArray(p.items)) {
                p.items.forEach(pi => {
                    if (pi.ingredientId === item.id || pi.productId === item.id) {
                        const q = parseFloat(pi.quantity) || 0;
                        const c = parseFloat(pi.totalCost || (q * (pi.costPerUnit || 0))) || 0;
                        totalPurchasedQty += q;
                        totalPurchasedCost += c;
                        relevantPurchases.push({
                            id: p.id,
                            date: pDate,
                            supplier: p.supplier || 'مورد محلي',
                            invoiceNumber: p.invoiceNumber || '-',
                            quantity: q,
                            unitPrice: parseFloat(pi.costPerUnit || (q > 0 ? c / q : 0)).toFixed(3),
                            totalCost: c.toFixed(3),
                            expiryDate: pi.expiryDate || '-',
                            buyer: p.recordedBy || 'المسؤول'
                        });
                    }
                });
            }
        });

        // 2. RECIPE CONSUMPTION ANALYSIS (استهلاك الوصفات والمبيعات)
        const recipeBreakdown = [];
        let totalRecipeConsumedQty = 0;

        recipes.forEach(rec => {
            const matchingIng = (rec.ingredients || []).find(ri => ri.ingredientId === item.id);
            if (matchingIng) {
                const qtyPerPortion = parseFloat(matchingIng.quantity) || 0;
                // Count usage orders in date range
                const recUsages = usageLogs.filter(u => u.recipeId === rec.id && isWithinRange(u.date || u.createdAt));
                const totalPortions = recUsages.reduce((acc, u) => acc + (parseFloat(u.quantity) || 0), 0);
                const consumedQty = totalPortions * qtyPerPortion;
                totalRecipeConsumedQty += consumedQty;

                recipeBreakdown.push({
                    recipeId: rec.id,
                    recipeName: rec.name,
                    qtyPerPortion,
                    totalPortions,
                    consumedQty,
                    unit: matchingIng.unit || unitName
                });
            }
        });

        recipeBreakdown.forEach(rb => {
            rb.percentage = totalRecipeConsumedQty > 0 ? ((rb.consumedQty / totalRecipeConsumedQty) * 100).toFixed(1) : '0';
        });

        // 3. WASTE & DAMAGE ANALYSIS (الهدر والتالف)
        const relevantWaste = [];
        let totalWastedQty = 0;

        wasteLogs.forEach(w => {
            const wDate = w.date || w.createdAt;
            if (isWithinRange(wDate) && (w.itemId === item.id || w.ingredientId === item.id)) {
                const q = parseFloat(w.quantity) || 0;
                totalWastedQty += q;
                relevantWaste.push({
                    id: w.id,
                    date: wDate,
                    quantity: q,
                    reason: w.reason || 'تلف عام',
                    cost: parseFloat(w.cost || 0).toFixed(3),
                    recorder: w.recordedBy || 'المشرف'
                });
            }
        });

        // 4. SHELF TRANSFERS ANALYSIS (النقل وسحب الأرفف)
        const relevantTransfers = [];
        let totalTransferredQty = 0;

        shelfTransfers.forEach(t => {
            if (isWithinRange(t.date) && t.ingredientId === item.id) {
                const q = parseFloat(t.quantity) || 0;
                totalTransferredQty += q;
                relevantTransfers.push({
                    id: t.id,
                    date: t.date,
                    branch: t.branch,
                    branchName: t.branch === 'tahnah' ? 'محل طحنه' : (t.branch === 'katheeb' ? 'محل كثيب' : 'محل زعفل'),
                    quantity: q,
                    actualBefore: t.actualStockBeforePull !== undefined ? t.actualStockBeforePull : '-',
                    discrepancy: t.discrepancy || 0,
                    discrepancyReason: t.discrepancyReason || '-',
                    transferredBy: t.transferredBy || 'المسؤول'
                });
            }
        });

        // Preset active styles helper
        const curPreset = window.activeReportDatePreset || 'all';
        const presetBtnClass = (p) => curPreset === p
            ? 'px-3.5 py-1.5 rounded-xl font-black bg-blue-600 text-white shadow-2xs text-xs whitespace-nowrap cursor-pointer transition'
            : 'px-3.5 py-1.5 rounded-xl font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 text-xs whitespace-nowrap cursor-pointer transition';

        container.innerHTML = `
            <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 hover:shadow-md transition space-y-6">
                <!-- 1. Header & Controls -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
                    <div class="flex items-center gap-3.5">
                        <div class="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-3xl shadow-2xs">
                            📊
                        </div>
                        <div>
                            <div class="flex items-center gap-2.5">
                                <h3 class="text-xl sm:text-2xl font-black text-slate-900">تقرير تتبع وحركة المنتج الشامل</h3>
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                    🔎 مسار المادة الكامل
                                </span>
                            </div>
                            <p class="text-xs text-slate-500 mt-1">
                                معرفة متى اشتريت المادة، أين ذهبت، كم استهلكت كل وصفة منها، التلفيات المسجلة، وحركات تزويد الأرفف خلال أي فترة زمنية تختارها.
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <button onclick="window.print()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer">
                            <span>🖨️</span> <span>طباعة التقرير</span>
                        </button>
                    </div>
                </div>

                <!-- 2. Product Selector & Filter Controls -->
                <div class="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Product Selection Dropdown -->
                        <div>
                            <label class="block font-black text-slate-900 text-xs sm:text-sm mb-1.5">📦 اختيار المنتج / المادة الخام للتحليل والتتبع:</label>
                            <select onchange="setProductReportItem(this.value)" class="w-full bg-white border-2 border-blue-300 rounded-xl p-2.5 font-bold text-slate-900 text-xs sm:text-sm focus:border-blue-600 transition shadow-2xs">
                                <optgroup label="🏬 مواد مخزن 1 (الرئيسي)">
                                    ${allIngredients.filter(i => (!i.warehouseId || i.warehouseId === 'wh1_fixed_id' || i.warehouseId === 'wh1')).map(i => `
                                        <option value="${i.id}" ${i.id === item.id ? 'selected' : ''}>🌾 ${i.name} ${i.archived ? '(مؤرشف 🗄️)' : ''}</option>
                                    `).join('')}
                                </optgroup>
                                <optgroup label="🏢 مواد مخزن 2 (الفرعي)">
                                    ${allIngredients.filter(i => (i.warehouseId === 'wh2_fixed_id' || i.warehouseId === 'wh2')).map(i => `
                                        <option value="${i.id}" ${i.id === item.id ? 'selected' : ''}>🏢 ${i.name} ${i.archived ? '(مؤرشف 🗄️)' : ''}</option>
                                    `).join('')}
                                </optgroup>
                                <optgroup label="📦 منتجات وتغليف">
                                    ${allProducts.map(p => `
                                        <option value="${p.id}" ${p.id === item.id ? 'selected' : ''}>📦 ${p.name} ${p.archived ? '(مؤرشف 🗄️)' : ''}</option>
                                    `).join('')}
                                </optgroup>
                            </select>
                        </div>

                        <!-- Date Presets & Custom Range -->
                        <div>
                            <label class="block font-black text-slate-900 text-xs sm:text-sm mb-1.5">📅 تحديد الفترة الزمنية للتقرير:</label>
                            <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
                                <button onclick="setProductReportDatePreset('all')" class="${presetBtnClass('all')}">كافة الفترات</button>
                                <button onclick="setProductReportDatePreset('today')" class="${presetBtnClass('today')}">اليوم</button>
                                <button onclick="setProductReportDatePreset('week')" class="${presetBtnClass('week')}">آخر 7 أيام</button>
                                <button onclick="setProductReportDatePreset('month')" class="${presetBtnClass('month')}">آخر 30 يوم</button>
                                <button onclick="setProductReportDatePreset('this_month')" class="${presetBtnClass('this_month')}">هذا الشهر</button>
                                <button onclick="setProductReportDatePreset('last_month')" class="${presetBtnClass('last_month')}">الشهر الماضي</button>
                            </div>
                        </div>
                    </div>

                    <!-- Custom Date Pickers -->
                    <div class="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 text-xs font-bold">
                        <span class="text-slate-500">🗓️ أو حدد فترة مخصصة:</span>
                        <div class="flex items-center gap-2">
                            <span class="text-slate-600">من:</span>
                            <input type="date" id="report-from-date" value="${window.activeReportFromDate}" class="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-slate-800 text-xs font-bold">
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="text-slate-600">إلى:</span>
                            <input type="date" id="report-to-date" value="${window.activeReportToDate}" class="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-slate-800 text-xs font-bold">
                        </div>
                        <button onclick="applyCustomProductReportDates()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-2xs transition cursor-pointer">
                            🔍 تطبيق الفترة
                        </button>
                    </div>
                </div>

                <!-- 3. KPI Metrics Summary Cards -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    <!-- Purchases KPI -->
                    <div class="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4">
                        <div class="flex items-center gap-2 text-indigo-800 font-bold text-xs">
                            <span>🛒</span> <span>إجمالي المشتريات</span>
                        </div>
                        <div class="text-lg sm:text-xl font-black text-indigo-950 mt-1">
                            ${totalPurchasedQty.toFixed(2)} ${unitName}
                        </div>
                        <div class="text-[11px] text-indigo-700 font-bold mt-0.5">
                            بقيمة: ${totalPurchasedCost.toFixed(3)} ر.ع
                        </div>
                    </div>

                    <!-- Recipe Consumption KPI -->
                    <div class="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                        <div class="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                            <span>👨‍🍳</span> <span>استهلاك الوصفات</span>
                        </div>
                        <div class="text-lg sm:text-xl font-black text-emerald-950 mt-1">
                            ${totalRecipeConsumedQty.toFixed(2)} ${unitName}
                        </div>
                        <div class="text-[11px] text-emerald-700 font-bold mt-0.5">
                            في (${recipeBreakdown.filter(r => r.totalPortions > 0).length}) وصفات منجزة
                        </div>
                    </div>

                    <!-- Waste KPI -->
                    <div class="bg-rose-50/60 border border-rose-200 rounded-2xl p-4">
                        <div class="flex items-center gap-2 text-rose-800 font-bold text-xs">
                            <span>🗑️</span> <span>الهدر والتالف</span>
                        </div>
                        <div class="text-lg sm:text-xl font-black text-rose-950 mt-1">
                            ${totalWastedQty.toFixed(2)} ${unitName}
                        </div>
                        <div class="text-[11px] text-rose-700 font-bold mt-0.5">
                            عدد السجلات: ${relevantWaste.length}
                        </div>
                    </div>

                    <!-- Shelf Transfers KPI -->
                    <div class="bg-amber-50/60 border border-amber-200 rounded-2xl p-4">
                        <div class="flex items-center gap-2 text-amber-800 font-bold text-xs">
                            <span>🚚</span> <span>المنقول للأرفف</span>
                        </div>
                        <div class="text-lg sm:text-xl font-black text-amber-950 mt-1">
                            ${totalTransferredQty.toFixed(2)} ${unitName}
                        </div>
                        <div class="text-[11px] text-amber-700 font-bold mt-0.5">
                            توزيع على الفروع
                        </div>
                    </div>

                    <!-- Current Warehouse Balance KPI -->
                    <div class="bg-slate-100 border border-slate-200 rounded-2xl p-4 col-span-2 sm:col-span-1">
                        <div class="flex items-center gap-2 text-slate-700 font-bold text-xs">
                            <span>🏬</span> <span>الرصيد الفعلي الحالي</span>
                        </div>
                        <div class="text-lg sm:text-xl font-black text-slate-900 mt-1">
                            ${currentRemaining} ${unitName}
                        </div>
                        <div class="text-[11px] text-slate-500 font-bold mt-0.5">
                            ${item.archived ? '🗄️ مادة مؤرشفة' : '✅ نشط بالمخزن'}
                        </div>
                    </div>
                </div>

                <!-- 4. Section: Recipe Consumption Breakdown (أين ذهب المنتج وكم استهلكت كل وصفة) -->
                <div class="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">👨‍🍳</span>
                            <div>
                                <h4 class="font-black text-slate-900 text-sm sm:text-base">تحليل استهلاك المنتج في الوصفات وقوائم الطعام</h4>
                                <p class="text-xs text-slate-500">تفصيل دقيق لكل وصفة استخدمت هذه المادة، كمية الحصة، عدد الطلبات المنفذة، وإجمالي الكمية المستهلكة</p>
                            </div>
                        </div>
                        <span class="badge-pill bg-emerald-50 text-emerald-800 font-bold text-xs">إجمالي المستهلك: ${totalRecipeConsumedQty.toFixed(2)} ${unitName}</span>
                    </div>

                    <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                        <table class="w-full text-right text-xs">
                            <thead class="bg-emerald-50/70 text-emerald-950 font-black border-b border-emerald-200">
                                <tr>
                                    <th class="px-4 py-3">اسم الوصفة / الطبق</th>
                                    <th class="px-4 py-3">الكمية المطلوبة في الحصة الواحدة</th>
                                    <th class="px-4 py-3">عدد الطلبات / الحصص المحضرة بالفترة</th>
                                    <th class="px-4 py-3 font-black text-emerald-950">إجمالي المستهلك لهذه الوصفة</th>
                                    <th class="px-4 py-3">% من إجمالي الاستهلاك</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                ${recipeBreakdown.length === 0 ? `
                                    <tr>
                                        <td colspan="5" class="text-center py-6 text-slate-400 font-bold">
                                            لا توجد وصفات جاهزة مسجلة تستهلك هذه المادة حالياً.
                                        </td>
                                    </tr>
                                ` : recipeBreakdown.map(rb => `
                                    <tr class="hover:bg-emerald-50/20 transition">
                                        <td class="px-4 py-3 font-black text-slate-900 text-sm">🍽️ ${rb.recipeName}</td>
                                        <td class="px-4 py-3 font-bold text-slate-700">${rb.qtyPerPortion} ${rb.unit} / حصة</td>
                                        <td class="px-4 py-3 font-black text-slate-800">${rb.totalPortions} طلب</td>
                                        <td class="px-4 py-3 font-black text-emerald-800 text-sm">${rb.consumedQty.toFixed(2)} ${unitName}</td>
                                        <td class="px-4 py-3">
                                            <div class="flex items-center gap-2">
                                                <div class="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                                                    <div class="bg-emerald-500 h-2 rounded-full" style="width: ${rb.percentage}%"></div>
                                                </div>
                                                <span class="font-bold text-slate-700 text-xs">${rb.percentage}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 5. Section: Purchases Log (متى تم شراء المادة والفواتير) -->
                <div class="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">🛒</span>
                            <div>
                                <h4 class="font-black text-slate-900 text-sm sm:text-base">سجل وتواريخ شراء وتوريد المادة (Purchases Inflow)</h4>
                                <p class="text-xs text-slate-500">تواريخ الشراء، أسماء الموردين، أرقام الفواتير، والأسعار</p>
                            </div>
                        </div>
                        <span class="badge-pill bg-indigo-50 text-indigo-800 font-bold text-xs">إجمالي الوارد: ${totalPurchasedQty.toFixed(2)} ${unitName}</span>
                    </div>

                    <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                        <table class="w-full text-right text-xs">
                            <thead class="bg-indigo-50/70 text-indigo-950 font-black border-b border-indigo-200">
                                <tr>
                                    <th class="px-4 py-3">التاريخ</th>
                                    <th class="px-4 py-3">المورد</th>
                                    <th class="px-4 py-3">رقم الفاتورة / الشحنة</th>
                                    <th class="px-4 py-3">الكمية المشتراة</th>
                                    <th class="px-4 py-3">سعر الوحدة</th>
                                    <th class="px-4 py-3">الإجمالي</th>
                                    <th class="px-4 py-3">تاريخ الانتهاء</th>
                                    <th class="px-4 py-3">المسجل</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                ${relevantPurchases.length === 0 ? `
                                    <tr>
                                        <td colspan="8" class="text-center py-6 text-slate-400 font-bold">
                                            لا توجد حركات شراء مسجلة لهذه المادة في الفترة المحددة.
                                        </td>
                                    </tr>
                                ` : relevantPurchases.map(p => `
                                    <tr class="hover:bg-indigo-50/20 transition">
                                        <td class="px-4 py-3 font-bold text-slate-600" dir="ltr">${new Date(p.date).toLocaleDateString('ar-OM')}</td>
                                        <td class="px-4 py-3 font-black text-slate-900">🏢 ${p.supplier}</td>
                                        <td class="px-4 py-3 font-mono font-bold text-indigo-700">${p.invoiceNumber}</td>
                                        <td class="px-4 py-3 font-black text-indigo-950 text-sm">${p.quantity} ${unitName}</td>
                                        <td class="px-4 py-3 font-bold text-slate-700">${p.unitPrice} ر.ع</td>
                                        <td class="px-4 py-3 font-black text-indigo-900">${p.totalCost} ر.ع</td>
                                        <td class="px-4 py-3 text-slate-500">${p.expiryDate}</td>
                                        <td class="px-4 py-3 font-bold text-slate-600">👤 ${p.buyer}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 6. Section: Waste & Damage Log (الهدر والتلفيات المسجلة) -->
                <div class="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">🗑️</span>
                            <div>
                                <h4 class="font-black text-slate-900 text-sm sm:text-base">سجل الهدر والتلفيات المسجلة للمادة (Waste & Losses)</h4>
                                <p class="text-xs text-slate-500">الكميات التالفة وأسباب الهدر وتواريخ تسجيلها</p>
                            </div>
                        </div>
                        <span class="badge-pill bg-rose-50 text-rose-800 font-bold text-xs">إجمالي التالف: ${totalWastedQty.toFixed(2)} ${unitName}</span>
                    </div>

                    <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                        <table class="w-full text-right text-xs">
                            <thead class="bg-rose-50/70 text-rose-950 font-black border-b border-rose-200">
                                <tr>
                                    <th class="px-4 py-3">التاريخ</th>
                                    <th class="px-4 py-3">الكمية التالفة</th>
                                    <th class="px-4 py-3">سبب التلف / الهدر</th>
                                    <th class="px-4 py-3">المسؤول عن التسجيل</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                ${relevantWaste.length === 0 ? `
                                    <tr>
                                        <td colspan="4" class="text-center py-6 text-slate-400 font-bold">
                                            ✅ لم يتم تسجيل أي تلفيات أو هدر لهذه المادة في الفترة المحددة.
                                        </td>
                                    </tr>
                                ` : relevantWaste.map(w => `
                                    <tr class="hover:bg-rose-50/20 transition">
                                        <td class="px-4 py-3 font-bold text-slate-600" dir="ltr">${new Date(w.date).toLocaleDateString('ar-OM')}</td>
                                        <td class="px-4 py-3 font-black text-rose-700 text-sm">${w.quantity} ${unitName}</td>
                                        <td class="px-4 py-3 font-bold text-slate-800">${w.reason}</td>
                                        <td class="px-4 py-3 font-bold text-slate-600">👤 ${w.recorder}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- 7. Section: Shelf Transfers (نقل وتزويد أرفف المحلات) -->
                ${relevantTransfers.length > 0 ? `
                    <div class="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">🚚</span>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm sm:text-base">سجل النقل والتوريد لرفوف المحلات (طحنه / كثيب / زعفل)</h4>
                                    <p class="text-xs text-slate-500">حركات النقل المنفذة من مخزن 2 للأرفف مع فحص المطابقة وأسباب الفروقات</p>
                                </div>
                            </div>
                            <span class="badge-pill bg-amber-50 text-amber-800 font-bold text-xs">إجمالي المنقول: ${totalTransferredQty.toFixed(2)} ${unitName}</span>
                        </div>

                        <div class="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                            <table class="w-full text-right text-xs">
                                <thead class="bg-amber-50/70 text-amber-950 font-black border-b border-amber-200">
                                    <tr>
                                        <th class="px-4 py-3">التاريخ والوقت</th>
                                        <th class="px-4 py-3">المحل / الرف</th>
                                        <th class="px-4 py-3">الكمية المسحوبة</th>
                                        <th class="px-4 py-3">الرصيد الفعلي قبل السحب</th>
                                        <th class="px-4 py-3">ملاحظات / سبب الفرق</th>
                                        <th class="px-4 py-3">المسؤول</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-medium">
                                    ${relevantTransfers.map(t => `
                                        <tr class="hover:bg-amber-50/20 transition">
                                            <td class="px-4 py-3 font-bold text-slate-600" dir="ltr">${new Date(t.date).toLocaleString('ar-OM', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                            <td class="px-4 py-3 font-bold text-amber-900">🏪 ${t.branchName}</td>
                                            <td class="px-4 py-3 font-black text-amber-800 text-sm">${t.quantity} ${unitName}</td>
                                            <td class="px-4 py-3 font-bold text-slate-700">${t.actualBefore} ${unitName}</td>
                                            <td class="px-4 py-3 text-slate-600">${t.discrepancyReason}</td>
                                            <td class="px-4 py-3 font-bold text-slate-600">👤 ${t.transferredBy}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Open Edit Category Modal
    window.openEditCategoryModal = function(catId) {
        const cat = Store.getCategories().find(c => c.id === catId);
        if (!cat) return;
        document.getElementById('edit-cat-id').value = cat.id;
        document.getElementById('edit-cat-name').value = cat.name;

        const whSelect = document.getElementById('edit-cat-warehouse');
        const warehouses = Store.getWarehouses();
        const currentWh = warehouses.find(w => w.categoryIds && w.categoryIds.includes(cat.id)) || warehouses[0];

        if (whSelect) {
            whSelect.innerHTML = warehouses.map(w => `<option value="${w.id}" ${currentWh && currentWh.id === w.id ? 'selected' : ''}>${w.name}</option>`).join('');
        }

        openModal('edit-category-modal');
    };

    // Edit Category Form Listener
    document.getElementById('edit-category-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-cat-id').value;
        const name = document.getElementById('edit-cat-name').value.trim();
        const warehouseId = document.getElementById('edit-cat-warehouse').value;

        if (id && name) {
            Store.saveCategory({ id, name }, warehouseId);
            closeModal('edit-category-modal');
            renderWarehousesTab();
            renderDropdowns();
            renderDashboard();
            renderIngredientsTab();
            showToast(`تم تحديث الفئة (${name}) بنجاح! 🏷️`);
        }
    });

    // Categories Modal List with Strict Warehouse Tabs
    window.activeCategoryModalWhTab = 'wh1_fixed_id';

    window.switchCategoryModalWhTab = function(whId) {
        window.activeCategoryModalWhTab = whId;
        renderCategoriesModalList();
    };

    function renderCategoriesModalList() {
        const list = document.getElementById('categories-modal-list');
        const whSelect = document.getElementById('new-category-warehouse');
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();
        const ingredients = Store.getIngredients();

        const wh1 = warehouses.find(w => w.id === 'wh1_fixed_id') || warehouses[0] || { id: 'wh1_fixed_id', name: 'مخزن 1', categoryIds: [] };
        const wh2 = warehouses.find(w => w.id === 'wh2_fixed_id') || warehouses[1] || { id: 'wh2_fixed_id', name: 'مخزن 2', categoryIds: [] };

        const wh1Cats = categories.filter(c => wh1.categoryIds && wh1.categoryIds.includes(c.id));
        const wh2Cats = categories.filter(c => wh2.categoryIds && wh2.categoryIds.includes(c.id));

        // Update Tab counts and styles
        const countWh1El = document.getElementById('cat-count-wh1');
        const countWh2El = document.getElementById('cat-count-wh2');
        if (countWh1El) countWh1El.textContent = wh1Cats.length;
        if (countWh2El) countWh2El.textContent = wh2Cats.length;

        const tabWh1Btn = document.getElementById('cat-modal-tab-wh1');
        const tabWh2Btn = document.getElementById('cat-modal-tab-wh2');
        const isTabWh1 = (window.activeCategoryModalWhTab === 'wh1_fixed_id');

        if (tabWh1Btn && tabWh2Btn) {
            if (isTabWh1) {
                tabWh1Btn.className = 'px-4 py-2 text-xs sm:text-sm font-black border-b-2 border-indigo-600 text-indigo-600 flex items-center gap-1.5 transition cursor-pointer';
                tabWh2Btn.className = 'px-4 py-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition cursor-pointer';
            } else {
                tabWh1Btn.className = 'px-4 py-2 text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition cursor-pointer';
                tabWh2Btn.className = 'px-4 py-2 text-xs sm:text-sm font-black border-b-2 border-emerald-600 text-emerald-600 flex items-center gap-1.5 transition cursor-pointer';
            }
        }

        if (whSelect) {
            whSelect.innerHTML = warehouses.map(w => `<option value="${w.id}" ${w.id === window.activeCategoryModalWhTab ? 'selected' : ''}>🏢 ${w.name}</option>`).join('');
        }

        if (list) {
            const activeCats = isTabWh1 ? wh1Cats : wh2Cats;
            const currentWhName = isTabWh1 ? 'مخزن 1' : 'مخزن 2';

            if (activeCats.length === 0) {
                list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold">لا توجد فئات مسجلة في (${currentWhName}) حالياً.</div>`;
                return;
            }

            list.innerHTML = activeCats.map(cat => {
                const matCount = ingredients.filter(i => i.categoryId === cat.id && i.warehouseId === window.activeCategoryModalWhTab).length;
                return `
                    <div class="flex items-center justify-between p-3.5 hover:bg-slate-50 transition">
                        <div class="flex items-center gap-2.5">
                            <span class="font-black text-slate-900 text-xs sm:text-sm">🏷️ ${cat.name}</span>
                            <span class="badge-pill bg-slate-100 text-slate-700 text-[10px] font-bold">
                                📦 ${matCount} مواد
                            </span>
                            <span class="badge-pill ${isTabWh1 ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'} text-[10px] font-bold">
                                🏢 ${currentWhName}
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="openEditCategoryModal('${cat.id}')" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition" title="تعديل اسم أو نقل الفئة">✏️ تعديل / نقل</button>
                            <button onclick="deleteCategory('${cat.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition" title="حذف الفئة">🗑️ حذف</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    document.getElementById('add-category-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('new-category-name');
        const whSelect = document.getElementById('new-category-warehouse');
        const name = nameInput.value.trim();
        const targetWhId = whSelect ? whSelect.value : window.activeCategoryModalWhTab;

        if (name && targetWhId) {
            Store.addCategoryToWarehouse(name, targetWhId);
            nameInput.value = '';
            window.activeCategoryModalWhTab = targetWhId;
            renderCategoriesModalList();
            renderWarehousesTab();
            renderDropdowns();
            renderDashboard();
            renderIngredientsTab();
            if (window.updateProductModalCategories) window.updateProductModalCategories();
            showToast(`تمت إضافة الفئة (${name}) بنجاح! 🏷️`);
        }
    });

    window.deleteCategory = function(id) {
        if (Store.getIngredients().some(i => i.categoryId === id)) {
            alert('لا يمكن حذف الفئة لأنها مستخدمة في مواد خام مسجلة.');
            return;
        }
        if (confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
            Store.deleteCategory(id);
            renderCategoriesModalList();
            renderWarehousesTab();
            renderDropdowns();
            renderDashboard();
            renderIngredientsTab();
            if (window.updateProductModalCategories) window.updateProductModalCategories();
            showToast('تم حذف الفئة بنجاح');
        }
    };

    // Helper: Render Category Checkboxes for Warehouse Modal
    window.renderWarehouseCategoryCheckboxes = function(selectedCatIds = []) {
        const categories = Store.getCategories();
        const checkContainer = document.getElementById('wh-categories-checkboxes');
        if (!checkContainer) return;

        if (categories.length === 0) {
            checkContainer.innerHTML = '<p class="text-xs text-slate-400 p-2">لا توجد فئات مسجلة بعد. يرجى إضافة فئات أولاً.</p>';
            return;
        }

        checkContainer.innerHTML = categories.map(c => `
            <label class="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition">
                <input type="checkbox" name="wh-cats" value="${c.id}" ${selectedCatIds && selectedCatIds.includes(c.id) ? 'checked' : ''} class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500">
                <span class="text-xs sm:text-sm font-bold text-slate-800">${c.name}</span>
            </label>
        `).join('');
    };

    window.editWarehouse = function(id) {
        const wh = Store.getWarehouses().find(w => w.id === id);
        if (!wh) return;
        document.getElementById('wh-id').value = wh.id;
        document.getElementById('wh-name').value = wh.name;
        renderWarehouseCategoryCheckboxes(wh.categoryIds || []);
        openModal('add-warehouse-modal');
    };

    window.deleteWarehouse = function(id) {
        if (Store.getIngredients().some(i => i.warehouseId === id)) {
            alert('لا يمكن حذف المخزن لوجود مواد خام مسجلة تابعة له.');
            return;
        }
        if (confirm(getI18nText('confirmDelete'))) {
            Store.deleteWarehouse(id);
            renderWarehousesTab();
            renderDropdowns();
            renderDashboard();
            showToast('تم حذف المخزن');
        }
    };

    document.getElementById('warehouse-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('wh-id').value;
        const selectedCats = Array.from(document.querySelectorAll('input[name="wh-cats"]:checked')).map(cb => cb.value);

        Store.saveWarehouse({
            id: id ? id : undefined,
            name: document.getElementById('wh-name').value,
            categoryIds: selectedCats
        });

        closeModal('add-warehouse-modal');
        renderWarehousesTab();
        renderDropdowns();
        showToast('تم حفظ المخزن وتخصيص الفئات بنجاح! 🏢');
    });

    // ================= 8. RECIPES TAB WITH BRANCH ASSIGNMENT & LIVE METRICS =================
    window.recipeBranchFilter = 'all';

    window.setRecipeBranchFilter = function(branch) {
        window.recipeBranchFilter = branch;
        document.querySelectorAll('.rec-filter-btn').forEach(btn => {
            btn.className = 'rec-filter-btn px-3.5 py-2 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer';
        });
        const activeBtn = document.getElementById('rec-filter-btn-' + branch);
        if (activeBtn) {
            activeBtn.className = 'rec-filter-btn px-3.5 py-2 rounded-xl font-bold bg-indigo-600 text-white shadow-2xs cursor-pointer';
        }
        renderRecipesTab();
    };

    function renderRecipesTab() {
        const container = document.getElementById('recipes-container');
        if (!container) return;

        let recipes = Store.getRecipes();
        const ingredients = Store.getIngredients();
        const inventory = calculateInventory('all');

        const allowedBranches = getUserAllowedBranches();
        const isFullAdmin = allowedBranches.includes('all');

        // Scope to user's assigned store(s) if not full admin
        if (!isFullAdmin) {
            recipes = recipes.filter(r => allowedBranches.includes(r.branch || 'tahnah') || r.branch === 'all');
        }

        const activeBranch = window.recipeBranchFilter || 'all';
        const searchVal = (document.getElementById('recipe-search-input')?.value || '').trim().toLowerCase();

        // 1. Filter by branch chip
        if (activeBranch !== 'all') {
            recipes = recipes.filter(r => (r.branch === activeBranch || r.branch === 'all' || !r.branch));
        }

        // 2. Filter by search query
        if (searchVal) {
            recipes = recipes.filter(r => r.name.toLowerCase().includes(searchVal));
        }

        if (recipes.length === 0) {
            container.innerHTML = `
                <div class="col-span-full bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
                    <div class="text-3xl">📖</div>
                    <h3 class="font-bold text-slate-800">لا توجد وصفات مسجلة لهذا المحل أو البحث</h3>
                    <p class="text-xs text-slate-500">اضغط على زر "+ إنشاء وصفة جديدة" لإضافة وصفة مخصصة لهذا الفرع.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recipes.map(rec => {
            let imgHtml = '';
            if (rec.image) {
                imgHtml = `<img src="${rec.image}" alt="${rec.name}" class="w-full h-44 object-cover">`;
            } else {
                imgHtml = `
                    <div class="w-full h-44 bg-gradient-to-br from-indigo-50 to-indigo-100 flex flex-col items-center justify-center text-indigo-400">
                        <span class="text-3xl font-black">${rec.name.charAt(0)}</span>
                        <span class="text-xs mt-1">بدون صورة</span>
                    </div>
                `;
            }

            // Branch title
            const branchTitle = (rec.branch === 'tahnah') ? '🏪 محل طحنه' :
                                (rec.branch === 'katheeb') ? '🏪 محل كثيب' :
                                (rec.branch === 'zafal') ? '🏪 محل زعفل' : '🏪 محل طحنه';

            // Calculate Available Pieces from raw materials
            let maxBatches = 999999;
            rec.ingredients.forEach(ri => {
                const invItem = inventory[ri.ingredientId];
                const availableQty = invItem ? invItem.remaining : 0;
                const reqPerBatch = parseFloat(ri.quantityPerUnit) || 1;
                const batches = availableQty / reqPerBatch;
                if (batches < maxBatches) maxBatches = batches;
            });

            const availablePieces = Math.max(0, Math.floor(maxBatches * (parseInt(rec.yield) || 1)));

            let ingHtml = rec.ingredients.map(ri => {
                const ing = ingredients.find(i => i.id === ri.ingredientId);
                const unit = ing ? getI18nText('unit_' + ing.unit) : '';
                return `<li class="flex justify-between text-xs text-slate-600 border-b border-slate-50 py-1">
                    <span>${ing ? ing.name : '-'}</span>
                    <span class="font-bold text-slate-800" dir="ltr">${ri.quantityPerUnit} ${unit}</span>
                </li>`;
            }).join('');

            return `
                <div class="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden flex flex-col action-card justify-between">
                    <div>
                        <div class="relative">
                            ${imgHtml}
                            <div class="absolute top-2 end-2 bg-white/95 backdrop-blur-sm rounded-xl px-2 py-1 shadow-sm flex items-center gap-1.5">
                                <button onclick="editRecipe('${rec.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold cursor-pointer">تعديل</button>
                                <span class="text-slate-300">|</span>
                                <button onclick="deleteRecipe('${rec.id}')" class="text-rose-600 hover:text-rose-900 text-xs font-bold cursor-pointer">حذف</button>
                            </div>
                            <div class="absolute bottom-2 start-2 bg-indigo-950/90 text-white rounded-xl px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                <span>${branchTitle}</span>
                                <span class="opacity-60">|</span>
                                <span>إنتاجية: ${rec.yield || 1} قطعة</span>
                            </div>
                        </div>
                        <div class="p-4">
                            <div class="flex items-center justify-between gap-2">
                                <h4 class="font-black text-base text-slate-900">${rec.name}</h4>
                                <span class="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">${branchTitle}</span>
                            </div>
                            <div class="mt-3">
                                <p class="text-xs font-bold text-slate-500 mb-1">المكونات للمقدار الواحد:</p>
                                <ul class="space-y-0.5">${ingHtml}</ul>
                            </div>
                        </div>
                    </div>

                    <!-- Available Produced Pieces Counter -->
                    <div class="p-3.5 bg-indigo-50/70 border-t border-indigo-100 flex items-center justify-between">
                        <span class="text-xs font-bold text-indigo-900" data-i18n="lblAvailablePieces">القطع المتاحة حالياً:</span>
                        <span class="font-black text-base ${availablePieces > 0 ? 'text-emerald-700' : 'text-rose-600'}">${availablePieces} قطعة</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.editRecipe = function(id) {
        const rec = Store.getRecipes().find(r => r.id === id);
        if (!rec) return;
        document.getElementById('rec-id').value = rec.id;
        document.getElementById('rec-name').value = rec.name;
        document.getElementById('rec-yield').value = rec.yield || 1;
        document.getElementById('rec-branch').value = rec.branch || 'tahnah';
        document.getElementById('rec-image-base64').value = rec.image || '';

        const list = document.getElementById('recipe-ingredients-list');
        list.innerHTML = '';
        rec.ingredients.forEach(ri => addRecipeIngredientRow(ri.ingredientId, ri.quantityPerUnit));

        document.getElementById('rec-submit-btn').textContent = getI18nText('btnUpdate');
        openModal('add-recipe-modal');
    };

    function addRecipeIngredientRow(selectedId = '', qty = '') {
        const ingredients = Store.getIngredients();
        const row = document.createElement('div');
        row.className = 'flex gap-2 items-center recipe-ing-row';
        row.innerHTML = `
            <select class="recipe-ing-select flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs sm:text-sm" required>
                ${ingredients.map(i => `<option value="${i.id}" ${i.id === selectedId ? 'selected' : ''}>${i.name} (${getI18nText('unit_' + i.unit)})</option>`).join('')}
            </select>
            <input type="number" step="0.01" min="0.01" value="${qty}" placeholder="الكمية" class="recipe-ing-qty w-24 bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs sm:text-sm font-bold" required>
            <button type="button" class="text-rose-500 hover:text-rose-700 font-bold px-2 cursor-pointer" onclick="this.parentElement.remove()">✕</button>
        `;
        document.getElementById('recipe-ingredients-list').appendChild(row);
    }

    document.getElementById('add-recipe-ing-btn')?.addEventListener('click', () => addRecipeIngredientRow());

    document.getElementById('recipe-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('rec-id').value;
        const ingRows = document.querySelectorAll('.recipe-ing-row');
        if (ingRows.length === 0) {
            alert('يجب إضافة مادة خام واحدة على الأقل في الوصفة!');
            return;
        }

        const ingredients = Array.from(ingRows).map(row => ({
            ingredientId: row.querySelector('.recipe-ing-select').value,
            quantityPerUnit: parseFloat(row.querySelector('.recipe-ing-qty').value) || 0
        }));

        let imageBase64 = document.getElementById('rec-image-base64').value;
        const fileInput = document.getElementById('rec-image-input');
        if (fileInput && fileInput.files.length > 0) {
            imageBase64 = await getBase64(fileInput.files[0]);
        }

        Store.saveRecipe({
            id: id ? id : undefined,
            name: document.getElementById('rec-name').value,
            yield: parseInt(document.getElementById('rec-yield').value) || 1,
            branch: document.getElementById('rec-branch').value || 'tahnah',
            image: imageBase64,
            ingredients
        });

        closeModal('add-recipe-modal');
        renderAll();
        showToast('تم حفظ الوصفة وتخصيصها للمحل بنجاح! 📖✅');
    });

    window.deleteRecipe = function(id) {
        if (confirm(getI18nText('confirmDelete'))) {
            Store.deleteRecipe(id);
            renderAll();
        }
    };

    // ================= 9. PRODUCTION ORDERS (KITCHEN) =================
    function renderOrdersTab() {
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        const allowedBranches = getUserAllowedBranches();
        const isFullAdmin = allowedBranches.includes('all');
        let orders = Store.getProductionOrders();
        const recipes = Store.getRecipes();

        // Scope to employee's assigned store(s)
        if (!isFullAdmin) {
            orders = orders.filter(o => allowedBranches.includes(o.branch));
        }

        tbody.innerHTML = orders.slice().reverse().map(order => {
            const rec = recipes.find(r => r.id === order.recipeId);

            let statusBadge = '';
            if (order.status === 'pending') statusBadge = '<span class="badge-pill bg-slate-100 text-slate-700">قيد الانتظار ⏳</span>';
            else if (order.status === 'in_progress') statusBadge = '<span class="badge-pill bg-indigo-100 text-indigo-800">جاري التحضير 👨‍🍳</span>';
            else if (order.status === 'ready') statusBadge = '<span class="badge-pill bg-amber-100 text-amber-800">جاهز للتسليم 📦</span>';
            else if (order.status === 'delivered') statusBadge = '<span class="badge-pill bg-emerald-100 text-emerald-800">تم التسليم واكتمال الإنتاج ✅</span>';

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="px-4 py-3 font-mono font-bold text-xs text-slate-500">#${order.id.slice(-5)}</td>
                    <td class="px-4 py-3" dir="ltr">${new Date(order.createdAt).toLocaleString()}</td>
                    <td class="px-4 py-3">${getBranchBadgeHtml(order.branch)}</td>
                    <td class="px-4 py-3 font-bold text-slate-900">${rec ? rec.name : '-'}</td>
                    <td class="px-4 py-3 font-black text-indigo-600">${order.quantity} قطعة</td>
                    <td class="px-4 py-3">${statusBadge}</td>
                    <td class="px-4 py-3 text-xs text-slate-500">${order.loggedBy || '-'}</td>
                    <td class="px-4 py-3">
                        <div class="flex items-center gap-2">
                            <select onchange="updateOrderStatus('${order.id}', this.value)" class="text-xs bg-slate-50 border rounded-lg p-1 font-medium">
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار ⏳</option>
                                <option value="in_progress" ${order.status === 'in_progress' ? 'selected' : ''}>جاري التحضير 👨‍🍳</option>
                                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>جاهز للتسليم 📦</option>
                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التسليم ✅ (خصم المخزون)</option>
                            </select>
                            <button onclick="deleteProductionOrder('${order.id}')" class="text-rose-600 hover:text-rose-900 text-xs font-bold">حذف</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.updateOrderStatus = function(id, newStatus) {
        const order = Store.getProductionOrders().find(o => o.id === id);
        if (order) {
            order.status = newStatus;
            Store.saveProductionOrder(order);
            renderOrdersTab();
            renderDashboard();
            showToast('تم تحديث حالة طلب المطبخ بنجاح!');
        }
    };

    window.deleteProductionOrder = function(id) {
        if (confirm(getI18nText('confirmDelete'))) {
            Store.deleteProductionOrder(id);
            renderOrdersTab();
            renderDashboard();
        }
    };

    document.getElementById('order-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = Store.getLoggedInUser();
        Store.saveProductionOrder({
            branch: document.getElementById('order-branch').value,
            recipeId: document.getElementById('order-recipe-select').value,
            quantity: parseInt(document.getElementById('order-quantity').value) || 1,
            notes: document.getElementById('order-notes').value,
            status: 'pending',
            loggedBy: `${user.name} (${user.customRoleTitle || getI18nText('role_' + user.role) || user.role})`
        });

        closeModal('add-order-modal');
        renderOrdersTab();
        renderDashboard();
        showToast('تم إرسال طلب الإنتاج إلى المطبخ 👨‍🍳');
    });

    // ================= 10. POS QUICK USAGE =================
    function renderUsagePOS() {
        const grid = document.getElementById('usage-recipe-grid');
        const usageBody = document.getElementById('usage-log-body');
        if (!grid) return;

        const allowedBranches = getUserAllowedBranches();
        const isFullAdmin = allowedBranches.includes('all');
        let recipes = Store.getRecipes();

        // Filter POS recipes by employee's allowed branches
        if (!isFullAdmin) {
            recipes = recipes.filter(r => allowedBranches.includes(r.branch || 'tahnah') || r.branch === 'all');
        }

        grid.innerHTML = recipes.map(rec => {
            let imgStyle = rec.image ? `background-image: url('${rec.image}')` : 'background-color: #4f46e5';
            let overlay = rec.image ? '<div class="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition duration-300"></div>' : '';

            return `
                <button onclick="quickLogUsage('${rec.id}')" class="relative group h-36 rounded-3xl shadow-sm overflow-hidden bg-cover bg-center border border-slate-200 transition transform hover:scale-[1.02] active:scale-95 text-start" style="${imgStyle}">
                    ${overlay}
                    <div class="absolute inset-0 p-3 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent">
                        <h4 class="font-black text-sm sm:text-base text-white drop-shadow-md leading-tight">${rec.name}</h4>
                        <p class="text-[11px] font-bold text-emerald-300 drop-shadow mt-0.5">⚡ اضغط لخصم 1 حبة</p>
                    </div>
                </button>
            `;
        }).join('');

        if (usageBody) {
            let logs = Store.getUsageLogs();
            if (!isFullAdmin) {
                logs = logs.filter(l => {
                    const r = recipes.find(rec => rec.id === l.recipeId);
                    const b = l.branch || (r ? r.branch : 'tahnah');
                    return allowedBranches.includes(b) || b === 'all';
                });
            }

            usageBody.innerHTML = logs.slice(-15).reverse().map(log => {
                const rec = recipes.find(r => r.id === log.recipeId);
                return `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="px-4 py-2.5" dir="ltr">${new Date(log.date).toLocaleString()}</td>
                        <td class="px-4 py-2.5 font-bold text-slate-900">${rec ? rec.name : '-'}</td>
                        <td class="px-4 py-2.5 font-bold text-emerald-600">${log.quantityProduced} حبة</td>
                        <td class="px-4 py-2.5 text-xs text-slate-500">${log.loggedBy || 'كاشير'}</td>
                        <td class="px-4 py-2.5">
                            <button onclick="deleteUsageLog('${log.id}')" class="text-rose-600 hover:text-rose-800 font-bold text-xs border border-rose-200 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer">تراجع ↩️</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    window.quickLogUsage = function(recipeId) {
        const user = Store.getLoggedInUser();
        const rec = Store.getRecipes().find(r => r.id === recipeId);
        const branch = (rec && rec.branch && rec.branch !== 'all') ? rec.branch : (user.allowedBranches?.[0] || 'tahnah');

        Store.saveUsageLog({
            recipeId,
            branch,
            quantityProduced: 1,
            loggedBy: `${user.name} (${user.customRoleTitle || getI18nText('role_' + user.role) || user.role || 'كاشير'})`
        });
        renderAll();
        showToast('✅ تم تسجيل البيع وخصم المقادير من المخزون!');
    };

    window.deleteUsageLog = function(id) {
        Store.deleteUsageLog(id);
        renderAll();
    };

    // ================= 11. WASTE LOGS & EDIT/DELETE =================
    function renderWasteTab() {
        const rawBody = document.getElementById('raw-waste-log-body');
        const recBody = document.getElementById('recipe-waste-log-body');
        const ingredients = Store.getIngredients();
        const recipes = Store.getRecipes();

        const allowedBranches = getUserAllowedBranches();
        const isFullAdmin = allowedBranches.includes('all');

        if (rawBody) {
            rawBody.innerHTML = Store.getWasteLogs().slice(-15).reverse().map(w => {
                const ing = ingredients.find(i => i.id === w.ingredientId);
                const unit = ing ? getI18nText('unit_' + ing.unit) : '';
                return `
                    <tr>
                        <td class="px-3 py-2" dir="ltr">${new Date(w.date).toLocaleDateString()}</td>
                        <td class="px-3 py-2 font-bold">${ing ? ing.name : '-'}</td>
                        <td class="px-3 py-2 font-bold text-rose-600" dir="ltr">${w.quantity} ${unit}</td>
                        <td class="px-3 py-2 text-rose-800 font-medium">${w.reason}</td>
                        <td class="px-3 py-2 text-slate-500">${w.loggedBy || '-'}</td>
                        <td class="px-3 py-2">
                            <div class="flex items-center gap-1.5">
                                <button onclick="editRawWaste('${w.id}')" class="text-indigo-600 font-bold hover:underline">تعديل</button>
                                <button onclick="deleteRawWaste('${w.id}')" class="text-rose-600 font-bold hover:underline">حذف</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        if (recBody) {
            let wasteList = Store.getRecipeWasteLogs();
            if (!isFullAdmin) {
                wasteList = wasteList.filter(rw => {
                    const rec = recipes.find(r => r.id === rw.recipeId);
                    return !rec || allowedBranches.includes(rec.branch || 'tahnah') || rec.branch === 'all';
                });
            }

            recBody.innerHTML = wasteList.slice(-15).reverse().map(rw => {
                const rec = recipes.find(r => r.id === rw.recipeId);
                return `
                    <tr>
                        <td class="px-3 py-2" dir="ltr">${new Date(rw.date).toLocaleDateString()}</td>
                        <td class="px-3 py-2 font-bold">${rec ? rec.name : '-'}</td>
                        <td class="px-3 py-2 font-bold text-amber-600">${rw.wastedPieces} قطعة</td>
                        <td class="px-3 py-2 text-amber-800 font-medium">${rw.reason}</td>
                        <td class="px-3 py-2 text-slate-500">${rw.loggedBy || '-'}</td>
                        <td class="px-3 py-2">
                            <div class="flex items-center gap-1.5">
                                <button onclick="editRecipeWaste('${rw.id}')" class="text-indigo-600 font-bold hover:underline">تعديل</button>
                                <button onclick="deleteRecipeWaste('${rw.id}')" class="text-rose-600 font-bold hover:underline">حذف</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    document.getElementById('raw-waste-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const reason = document.getElementById('waste-raw-reason').value.trim();
        if (!reason) {
            alert(getI18nText('wasteReasonRequiredAlert'));
            return;
        }

        const user = Store.getLoggedInUser();
        Store.saveWasteLog({
            ingredientId: document.getElementById('waste-raw-select').value,
            quantity: parseFloat(document.getElementById('waste-raw-qty').value) || 0,
            reason: reason,
            loggedBy: `${user.name} (${getI18nText('role_' + user.role) || user.role})`
        });

        e.target.reset();
        renderAll();
        showToast('تم تسجيل تالف المادة الخام بنجاح!');
    });

    document.getElementById('recipe-waste-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const reason = document.getElementById('waste-recipe-reason').value.trim();
        if (!reason) {
            alert(getI18nText('wasteReasonRequiredAlert'));
            return;
        }

        const user = Store.getLoggedInUser();
        Store.saveRecipeWasteLog({
            recipeId: document.getElementById('waste-recipe-select').value,
            wastedPieces: parseInt(document.getElementById('waste-recipe-qty').value) || 1,
            reason: reason,
            loggedBy: `${user.name} (${getI18nText('role_' + user.role) || user.role})`
        });

        e.target.reset();
        renderAll();
        showToast('تم توثيق تالف الوصفة إدارياً بدون خصم مزدوج!');
    });

    window.editRawWaste = function(id) {
        const item = Store.getWasteLogs().find(w => w.id === id);
        if (!item) return;
        document.getElementById('edit-waste-id').value = item.id;
        document.getElementById('edit-waste-type').value = 'raw';
        document.getElementById('edit-waste-qty').value = item.quantity;
        document.getElementById('edit-waste-reason').value = item.reason;
        openModal('edit-waste-modal');
    };

    window.deleteRawWaste = function(id) {
        if (confirm(getI18nText('confirmDelete'))) {
            Store.deleteWasteLog(id);
            renderAll();
        }
    };

    window.editRecipeWaste = function(id) {
        const item = Store.getRecipeWasteLogs().find(w => w.id === id);
        if (!item) return;
        document.getElementById('edit-waste-id').value = item.id;
        document.getElementById('edit-waste-type').value = 'recipe';
        document.getElementById('edit-waste-qty').value = item.wastedPieces;
        document.getElementById('edit-waste-reason').value = item.reason;
        openModal('edit-waste-modal');
    };

    window.deleteRecipeWaste = function(id) {
        if (confirm(getI18nText('confirmDelete'))) {
            Store.deleteRecipeWasteLog(id);
            renderAll();
        }
    };

    document.getElementById('edit-waste-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-waste-id').value;
        const type = document.getElementById('edit-waste-type').value;
        const qty = parseFloat(document.getElementById('edit-waste-qty').value);
        const reason = document.getElementById('edit-waste-reason').value.trim();

        if (type === 'raw') {
            const item = Store.getWasteLogs().find(w => w.id === id);
            if (item) {
                item.quantity = qty;
                item.reason = reason;
                Store.saveWasteLog(item);
            }
        } else {
            const item = Store.getRecipeWasteLogs().find(w => w.id === id);
            if (item) {
                item.wastedPieces = qty;
                item.reason = reason;
                Store.saveRecipeWasteLog(item);
            }
        }

        closeModal('edit-waste-modal');
        renderAll();
        showToast('تم تعديل سجل التالف بنجاح!');
    });

    // ================= 12. MONTHLY STOCKTAKE (3 DEDICATED SECTIONS) =================
    let activeStocktakeSection = 'wh1'; // 'wh1', 'shelves', 'wh2'
    let activeStocktakeShelf = 'tahnah'; // 'tahnah', 'katheeb', 'zafal'

    function getNextMonthKey(currentKey) {
        const parts = currentKey.split('-');
        let year = parseInt(parts[0]);
        let month = parseInt(parts[1]);
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
        return `${year}-${String(month).padStart(2, '0')}`;
    }

    window.switchStocktakeSection = function(section) {
        activeStocktakeSection = section;
        document.querySelectorAll('.st-section-tab').forEach(btn => {
            btn.classList.remove('active', 'bg-white', 'text-indigo-900', 'shadow-2xs');
            btn.classList.add('text-slate-600');
        });
        const activeTabBtn = document.getElementById(`st-main-tab-${section}`);
        if (activeTabBtn) {
            activeTabBtn.classList.add('active', 'bg-white', 'text-indigo-900', 'shadow-2xs');
            activeTabBtn.classList.remove('text-slate-600');
        }

        document.querySelectorAll('.st-section-panel').forEach(p => p.classList.add('hidden'));
        const activePanel = document.getElementById(`st-section-${section}`);
        if (activePanel) activePanel.classList.remove('hidden');

        renderStocktakeTab();
    };

    window.switchStocktakeShelf = function(shelf) {
        activeStocktakeShelf = shelf;
        document.querySelectorAll('.st-shelf-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-white', 'text-indigo-900', 'shadow-2xs', 'font-black');
            btn.classList.add('text-slate-600', 'font-bold');
        });
        const activeBtn = document.getElementById(`st-shelf-tab-${shelf}`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-white', 'text-indigo-900', 'shadow-2xs', 'font-black');
            activeBtn.classList.remove('text-slate-600', 'font-bold');
        }
        renderStocktakeTab();
    };

    function renderStocktakeTab() {
        const currentMonth = getCurrentMonthKey();
        const openBalances = Store.getOpeningBalances(currentMonth) || {};
        const stocktakes = Store.getStocktakes();
        const currentStocktake = stocktakes.find(s => s.monthKey === currentMonth) || { sections: {} };
        const ingredients = Store.getIngredients();
        const purchases = Store.getPurchases();
        const warehouses = Store.getWarehouses();

        // Target WH IDs from store
        const wh1 = warehouses.find(w => (w.name && w.name.includes('1'))) || warehouses[0];
        const wh2 = warehouses.find(w => (w.name && w.name.includes('2'))) || warehouses[1];

        const wh1Id = wh1 ? wh1.id : 'wh1_fixed_id';
        const wh2Id = wh2 ? wh2.id : 'wh2_fixed_id';

        // ----------------------------------------------------
        // SECTION 1: WAREHOUSE 1 (المادة الخام | المسجل بالنظام | الموجود بأرض الواقع | حالة التطابق والمشكلة | تأكيد المدير)
        // ----------------------------------------------------
        const wh1Body = document.getElementById('stocktake-wh1-body');
        if (wh1Body) {
            const wh1MonthLabel = document.getElementById('st-wh1-month-label');
            if (wh1MonthLabel) wh1MonthLabel.textContent = `كشف جرد مواد مخزن 1 فقط - لشهر: ${currentMonth}`;

            // Strict Filter ingredients for Warehouse 1 ONLY
            const wh1Items = ingredients.filter(i => i.warehouseId === wh1Id);
            
            let sumSystemWh1 = 0, sumPhysicalWh1 = 0, countMatchedWh1 = 0, countDiffWh1 = 0;

            wh1Body.innerHTML = wh1Items.map(inv => {
                const savedItem = currentStocktake.sections?.wh1?.[inv.id] || {};
                const opening = parseFloat(openBalances['wh-1']?.[inv.id] ?? openBalances[inv.id] ?? 20);
                
                // Purchases for WH1
                let purchased = 0;
                purchases.forEach(p => {
                    if (p.items && Array.isArray(p.items)) {
                        p.items.forEach(item => {
                            if (item.ingredientId === inv.id && (item.warehouseId === wh1Id || !item.warehouseId)) {
                                purchased += parseFloat(item.quantity) || 0;
                            }
                        });
                    } else if (p.ingredientId === inv.id) {
                        purchased += parseFloat(p.quantity) || 0;
                    }
                });

                // Recorded in System
                const systemRecorded = Math.round((opening + purchased) * 1000) / 1000;
                
                // Physical count in reality
                const physicalQty = (savedItem.physicalQty !== undefined && savedItem.physicalQty !== null && savedItem.physicalQty !== '')
                    ? parseFloat(savedItem.physicalQty)
                    : systemRecorded;
                
                const diff = Math.round((physicalQty - systemRecorded) * 1000) / 1000;
                const isMatch = (diff === 0);
                const reason = savedItem.reason || '';
                const isManagerApproved = savedItem.isManagerApproved || false;

                sumSystemWh1 += systemRecorded;
                sumPhysicalWh1 += physicalQty;
                if (isMatch) countMatchedWh1++;
                else countDiffWh1++;

                let matchStatusHtml = '';
                let reasonInputHtml = '';

                if (isMatch) {
                    matchStatusHtml = `<span class="badge-pill bg-emerald-100 text-emerald-800 font-bold inline-flex items-center gap-1"><span>متطابق تماماً</span> <span>✅</span></span>`;
                    reasonInputHtml = `<input type="text" value="${reason}" placeholder="لا توجد ملاحظات (مطابق)" class="row-reason-input w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:bg-white">`;
                } else {
                    const diffText = diff < 0 ? `عجز (${diff})` : `زيادة (+${diff})`;
                    matchStatusHtml = `<span class="badge-pill ${diff < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'} font-black text-xs inline-flex items-center gap-1" dir="ltr"><span>${diffText}</span> <span>⚠️</span></span>`;
                    reasonInputHtml = `<input type="text" value="${reason}" placeholder="* حقل إجباري: اكتب سبب المشكلة / الفارق بالتفصيل *" class="row-reason-input w-full bg-rose-50/80 border-2 border-rose-400 rounded-xl p-2 text-xs font-bold text-rose-950 focus:bg-white focus:border-rose-600 shadow-2xs" required>`;
                }

                return `
                    <tr class="hover:bg-slate-50 transition wh1-stocktake-row" data-ing-id="${inv.id}">
                        <!-- 1. المادة الخام -->
                        <td class="px-4 py-3.5 font-bold text-slate-900">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full ${isMatch ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                                <span>${inv.name}</span>
                                <span class="text-[11px] text-slate-400 font-medium">(${getI18nText('unit_' + inv.unit)})</span>
                            </div>
                        </td>
                        <!-- 2. كم مسجل في النظام -->
                        <td class="px-4 py-3.5 font-black text-indigo-900 bg-indigo-50/30 text-sm font-mono row-system-qty" dir="ltr">
                            ${systemRecorded} ${getI18nText('unit_' + inv.unit)}
                        </td>
                        <!-- 3. كم موجود في أرض الواقع (✍️) -->
                        <td class="px-4 py-3.5 bg-emerald-50/50">
                            <div class="flex items-center gap-1.5">
                                <input type="number" step="0.001" min="0" value="${physicalQty}" oninput="updateStocktakeRowLive(this, 'wh1')" class="wh1-physical-input w-28 sm:w-32 bg-white border-2 border-emerald-400 rounded-xl p-2 text-center font-black font-mono text-emerald-950 text-sm shadow-2xs focus:ring-2 focus:ring-emerald-500" required>
                                <span class="text-xs text-emerald-700 font-bold">${getI18nText('unit_' + inv.unit)}</span>
                            </div>
                        </td>
                        <!-- 4. حالة التطابق / سبب المشكلة (إجباري إذا غير مطابق) -->
                        <td class="px-4 py-3.5 row-match-cell">
                            <div class="space-y-1.5">
                                <div class="row-match-badge">${matchStatusHtml}</div>
                                <div class="row-reason-container">${reasonInputHtml}</div>
                            </div>
                        </td>
                        <!-- 5. تأكيد المدير -->
                        <td class="px-4 py-3.5">
                            <label class="inline-flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl px-3 py-2 transition">
                                <input type="checkbox" ${isManagerApproved ? 'checked' : ''} class="row-manager-check rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4">
                                <span class="text-xs font-bold text-slate-800">تأكيد المدير</span>
                            </label>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ----------------------------------------------------
        // SECTION 2: SHELVES (رف طحنه | رف كثيب | رف زعفل) - ALL ITEMS OF WH1 & WH2
        // ----------------------------------------------------
        const shelvesBody = document.getElementById('stocktake-shelves-body');
        if (shelvesBody) {
            const shelfNames = {
                tahnah: 'رف طحنه',
                katheeb: 'رف كثيب',
                zafal: 'رف زعفل'
            };
            const activeShelfName = shelfNames[activeStocktakeShelf] || 'رف طحنه';
            const activeShelfKey = 'shelf-' + activeStocktakeShelf;
            const shelfLabel = document.getElementById('st-shelf-active-label');
            if (shelfLabel) shelfLabel.textContent = `كشف جرد ${activeShelfName} (شامل كافة مواد مخزن 1 ومخزن 2)`;

            // ALL ingredients from Warehouse 1 AND Warehouse 2 together
            shelvesBody.innerHTML = ingredients.map(inv => {
                const savedItem = currentStocktake.sections?.[activeShelfKey]?.[inv.id] || {};
                const defaultOpen = Math.round((parseFloat(openBalances[inv.id] || 15) / 3) * 100) / 100;
                const opening = parseFloat(openBalances[activeShelfKey]?.[inv.id] ?? defaultOpen);
                
                // Purchases specifically for this branch shelf
                let purchased = 0;
                purchases.forEach(p => {
                    if (p.items && Array.isArray(p.items)) {
                        p.items.forEach(item => {
                            const itemBranch = item.branch || p.branch;
                            if (item.ingredientId === inv.id && itemBranch === activeStocktakeShelf) {
                                purchased += parseFloat(item.quantity) || 0;
                            }
                        });
                    } else if (p.ingredientId === inv.id && p.branch === activeStocktakeShelf) {
                        purchased += parseFloat(p.quantity) || 0;
                    }
                });

                const available = Math.round((opening + purchased) * 1000) / 1000;
                const physicalQty = (savedItem.physicalQty !== undefined && savedItem.physicalQty !== null && savedItem.physicalQty !== '')
                    ? parseFloat(savedItem.physicalQty)
                    : available;

                const actualUsed = Math.max(0, Math.round((available - physicalQty) * 1000) / 1000);
                const reason = savedItem.reason || '';
                const isManagerApproved = savedItem.isManagerApproved || false;

                const whName = inv.warehouseId === wh2Id ? 'مخزن 2' : 'مخزن 1';

                return `
                    <tr class="hover:bg-slate-50 transition shelf-stocktake-row" data-ing-id="${inv.id}" data-shelf-key="${activeShelfKey}">
                        <!-- 1. المادة الخام -->
                        <td class="px-3.5 py-3.5 font-bold text-slate-900">${inv.name}</td>
                        <!-- 2. المخزن التابع -->
                        <td class="px-3.5 py-3.5">
                            <span class="badge-pill ${inv.warehouseId === wh2Id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'} text-[11px] font-bold">${whName}</span>
                        </td>
                        <!-- 3. الوحدة -->
                        <td class="px-3.5 py-3.5 text-slate-500 font-medium">${getI18nText('unit_' + inv.unit)}</td>
                        <!-- 4. رصيد بداية الرف (ر.ب) -->
                        <td class="px-3.5 py-3.5 font-bold text-slate-700 bg-slate-50/50 row-opening" dir="ltr">${opening}</td>
                        <!-- 5. المشتريات (+) -->
                        <td class="px-3.5 py-3.5 font-bold text-indigo-700 bg-indigo-50/20 row-purchased" dir="ltr">${purchased}</td>
                        <!-- 6. المتاح على الرف (=) -->
                        <td class="px-3.5 py-3.5 font-black text-slate-800 bg-slate-100/40 row-available" dir="ltr">${available}</td>
                        <!-- 7. المتبقي في الرف (الجرد الفعلي) ✍️ -->
                        <td class="px-3.5 py-3.5 bg-emerald-50/60">
                            <input type="number" step="0.001" min="0" value="${physicalQty}" oninput="updateStocktakeRowLive(this, 'shelf')" class="shelf-physical-input w-28 sm:w-32 bg-white border-2 border-emerald-400 rounded-xl p-1.5 text-center font-black font-mono text-emerald-950 shadow-2xs focus:ring-2 focus:ring-emerald-500" required>
                        </td>
                        <!-- 8. الاستهلاك الفعلي 🎯 -->
                        <td class="px-3.5 py-3.5 bg-amber-50/40 font-mono font-black text-amber-900 text-xs sm:text-sm row-actual-used" dir="ltr">${actualUsed}</td>
                        <!-- 9. الملاحظات (غير إلزامي) -->
                        <td class="px-3.5 py-3.5">
                            <input type="text" value="${reason}" placeholder="ملاحظات (اختياري)..." class="row-reason-input w-full bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-xs focus:bg-white">
                        </td>
                        <!-- 10. فائض الرف للشهر التالي 🚀 (نفس رقم المتبقي في الرف) -->
                        <td class="px-3.5 py-3.5 font-mono font-black text-emerald-700 bg-emerald-50/30 row-surplus-forward" dir="ltr">${physicalQty}</td>
                        <!-- 11. اعتماد المدير -->
                        <td class="px-3.5 py-3.5">
                            <label class="inline-flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl px-2.5 py-1.5 transition">
                                <input type="checkbox" ${isManagerApproved ? 'checked' : ''} class="row-manager-check rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4">
                                <span class="text-xs font-bold text-slate-700">تم التشييك</span>
                            </label>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ----------------------------------------------------
        // SECTION 3: WAREHOUSE 2 (المادة الخام | المسجل بالنظام | الموجود بأرض الواقع | حالة التطابق والمشكلة | تأكيد المدير)
        // ----------------------------------------------------
        const wh2Body = document.getElementById('stocktake-wh2-body');
        if (wh2Body) {
            const wh2MonthLabel = document.getElementById('st-wh2-month-label');
            if (wh2MonthLabel) wh2MonthLabel.textContent = `كشف جرد مواد مخزن 2 فقط - لشهر: ${currentMonth}`;

            // Strict Filter ingredients for Warehouse 2 ONLY
            const wh2Items = ingredients.filter(i => i.warehouseId === wh2Id);

            wh2Body.innerHTML = wh2Items.map(inv => {
                const savedItem = currentStocktake.sections?.wh2?.[inv.id] || {};
                const opening = parseFloat(openBalances['wh-2']?.[inv.id] ?? openBalances[inv.id] ?? 10);
                
                // Purchases for WH2
                let purchased = 0;
                purchases.forEach(p => {
                    if (p.items && Array.isArray(p.items)) {
                        p.items.forEach(item => {
                            if (item.ingredientId === inv.id && (item.warehouseId === wh2Id || !item.warehouseId)) {
                                purchased += parseFloat(item.quantity) || 0;
                            }
                        });
                    } else if (p.ingredientId === inv.id) {
                        purchased += parseFloat(p.quantity) || 0;
                    }
                });

                // Recorded in System
                const systemRecorded = Math.round((opening + purchased) * 1000) / 1000;
                
                // Physical count in reality
                const physicalQty = (savedItem.physicalQty !== undefined && savedItem.physicalQty !== null && savedItem.physicalQty !== '')
                    ? parseFloat(savedItem.physicalQty)
                    : systemRecorded;
                
                const diff = Math.round((physicalQty - systemRecorded) * 1000) / 1000;
                const isMatch = (diff === 0);
                const reason = savedItem.reason || '';
                const isManagerApproved = savedItem.isManagerApproved || false;

                let matchStatusHtml = '';
                let reasonInputHtml = '';

                if (isMatch) {
                    matchStatusHtml = `<span class="badge-pill bg-emerald-100 text-emerald-800 font-bold inline-flex items-center gap-1"><span>متطابق تماماً</span> <span>✅</span></span>`;
                    reasonInputHtml = `<input type="text" value="${reason}" placeholder="لا توجد ملاحظات (مطابق)" class="row-reason-input w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:bg-white">`;
                } else {
                    const diffText = diff < 0 ? `عجز (${diff})` : `زيادة (+${diff})`;
                    matchStatusHtml = `<span class="badge-pill ${diff < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'} font-black text-xs inline-flex items-center gap-1" dir="ltr"><span>${diffText}</span> <span>⚠️</span></span>`;
                    reasonInputHtml = `<input type="text" value="${reason}" placeholder="* حقل إجباري: اكتب سبب المشكلة / الفارق بالتفصيل *" class="row-reason-input w-full bg-rose-50/80 border-2 border-rose-400 rounded-xl p-2 text-xs font-bold text-rose-950 focus:bg-white focus:border-rose-600 shadow-2xs" required>`;
                }

                return `
                    <tr class="hover:bg-slate-50 transition wh2-stocktake-row" data-ing-id="${inv.id}">
                        <!-- 1. المادة الخام -->
                        <td class="px-4 py-3.5 font-bold text-slate-900">
                            <div class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full ${isMatch ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                                <span>${inv.name}</span>
                                <span class="text-[11px] text-slate-400 font-medium">(${getI18nText('unit_' + inv.unit)})</span>
                            </div>
                        </td>
                        <!-- 2. كم مسجل في النظام -->
                        <td class="px-4 py-3.5 font-black text-indigo-900 bg-indigo-50/30 text-sm font-mono row-system-qty" dir="ltr">
                            ${systemRecorded} ${getI18nText('unit_' + inv.unit)}
                        </td>
                        <!-- 3. كم موجود في أرض الواقع (✍️) -->
                        <td class="px-4 py-3.5 bg-emerald-50/50">
                            <div class="flex items-center gap-1.5">
                                <input type="number" step="0.001" min="0" value="${physicalQty}" oninput="updateStocktakeRowLive(this, 'wh2')" class="wh2-physical-input w-28 sm:w-32 bg-white border-2 border-emerald-400 rounded-xl p-2 text-center font-black font-mono text-emerald-950 text-sm shadow-2xs focus:ring-2 focus:ring-emerald-500" required>
                                <span class="text-xs text-emerald-700 font-bold">${getI18nText('unit_' + inv.unit)}</span>
                            </div>
                        </td>
                        <!-- 4. حالة التطابق / سبب المشكلة (إجباري إذا غير مطابق) -->
                        <td class="px-4 py-3.5 row-match-cell">
                            <div class="space-y-1.5">
                                <div class="row-match-badge">${matchStatusHtml}</div>
                                <div class="row-reason-container">${reasonInputHtml}</div>
                            </div>
                        </td>
                        <!-- 5. تأكيد المدير -->
                        <td class="px-4 py-3.5">
                            <label class="inline-flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl px-3 py-2 transition">
                                <input type="checkbox" ${isManagerApproved ? 'checked' : ''} class="row-manager-check rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4">
                                <span class="text-xs font-bold text-slate-800">تأكيد المدير</span>
                            </label>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ----------------------------------------------------
        // ARCHIVE HISTORY TABLE
        // ----------------------------------------------------
        const historyBody = document.getElementById('rollover-history-body');
        if (historyBody) {
            const rollovers = Store.getMonthlyRollovers();
            if (rollovers.length === 0) {
                historyBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-4 py-8 text-center text-slate-400 text-xs font-bold">
                            لا توجد سجلات أرشفة سابقة حتى الآن. يتم حفظ الأرشيف تلقائياً عند الضغط على "اعتماد وترحيل الفائض للشهر التالي".
                        </td>
                    </tr>
                `;
            } else {
                historyBody.innerHTML = rollovers.slice().reverse().map(r => `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="px-4 py-3 font-bold text-indigo-900 font-mono text-sm">${r.monthKey}</td>
                        <td class="px-4 py-3 text-xs text-slate-600 font-medium" dir="ltr">${new Date(r.date).toLocaleString('ar-OM')}</td>
                        <td class="px-4 py-3">
                            <span class="badge-pill bg-emerald-100 text-emerald-800 font-bold text-xs">
                                ${r.totalSurplusQty ? `${r.totalSurplusQty} وحدة` : 'مواد مرحلة'} 🚀
                            </span>
                        </td>
                        <td class="px-4 py-3 font-black text-slate-900 font-mono" dir="ltr">${parseFloat(r.totalConsumedCost || 0).toFixed(3)} ر.ع</td>
                        <td class="px-4 py-3 text-xs font-bold text-emerald-700">${r.approvedBy || 'المدير العام'}</td>
                        <td class="px-4 py-3">
                            <button onclick="viewStocktakeArchiveDetails('${r.id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-2xs">
                                <span>عرض كشف الجرد</span> <span>🔍</span>
                            </button>
                        </td>
                        <td class="px-4 py-3">
                            <button onclick="deleteMonthlyRollover('${r.id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-2xs" title="حذف من الأرشيف">
                                <span>حذف</span> <span>🗑️</span>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    }

    window.updateStocktakeRowLive = function(inputEl, mode) {
        const row = inputEl.closest('tr');
        if (mode === 'wh1' || mode === 'wh2') {
            const systemQty = parseFloat(row.querySelector('.row-system-qty')?.textContent) || 0;
            const physical = parseFloat(inputEl.value) || 0;
            const diff = Math.round((physical - systemQty) * 1000) / 1000;
            const isMatch = (diff === 0);

            const badgeCell = row.querySelector('.row-match-badge');
            const reasonContainer = row.querySelector('.row-reason-container');

            if (isMatch) {
                if (badgeCell) badgeCell.innerHTML = `<span class="badge-pill bg-emerald-100 text-emerald-800 font-bold inline-flex items-center gap-1"><span>متطابق تماماً</span> <span>✅</span></span>`;
                if (reasonContainer) reasonContainer.innerHTML = `<input type="text" value="" placeholder="لا توجد ملاحظات (مطابق)" class="row-reason-input w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs focus:bg-white">`;
            } else {
                const diffText = diff < 0 ? `عجز (${diff})` : `زيادة (+${diff})`;
                if (badgeCell) badgeCell.innerHTML = `<span class="badge-pill ${diff < 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'} font-black text-xs inline-flex items-center gap-1" dir="ltr"><span>${diffText}</span> <span>⚠️</span></span>`;
                if (reasonContainer) reasonContainer.innerHTML = `<input type="text" value="" placeholder="* حقل إجباري: اكتب سبب المشكلة / الفارق بالتفصيل *" class="row-reason-input w-full bg-rose-50/80 border-2 border-rose-400 rounded-xl p-2 text-xs font-bold text-rose-950 focus:bg-white focus:border-rose-600 shadow-2xs" required>`;
            }
            return;
        }

        // Mode === 'shelf'
        const available = parseFloat(row.querySelector('.row-available')?.textContent) || 0;
        const physical = parseFloat(inputEl.value) || 0;
        const actualUsed = Math.max(0, Math.round((available - physical) * 1000) / 1000);

        const rowActualUsedEl = row.querySelector('.row-actual-used');
        if (rowActualUsedEl) rowActualUsedEl.textContent = actualUsed;

        // Surplus forward for next month is exact copy of physical remaining on shelf
        const rowSurplusForwardEl = row.querySelector('.row-surplus-forward');
        if (rowSurplusForwardEl) rowSurplusForwardEl.textContent = physical;
    };

    window.saveStocktakeDraft = function() {
        const currentMonth = getCurrentMonthKey();
        const stocktakes = Store.getStocktakes();
        let draft = stocktakes.find(s => s.monthKey === currentMonth) || { monthKey: currentMonth, sections: {} };
        draft.sections = draft.sections || {};

        // 1. Save WH1
        const wh1Rows = document.querySelectorAll('.wh1-stocktake-row');
        draft.sections.wh1 = draft.sections.wh1 || {};
        wh1Rows.forEach(r => {
            const id = r.getAttribute('data-ing-id');
            draft.sections.wh1[id] = {
                physicalQty: parseFloat(r.querySelector('.wh1-physical-input')?.value) || 0,
                reason: r.querySelector('.row-reason-input')?.value || '',
                isManagerApproved: r.querySelector('.row-manager-check')?.checked || false
            };
        });

        // 2. Save Active Shelf
        const shelfRows = document.querySelectorAll('.shelf-stocktake-row');
        const shelfKey = 'shelf-' + activeStocktakeShelf;
        draft.sections[shelfKey] = draft.sections[shelfKey] || {};
        shelfRows.forEach(r => {
            const id = r.getAttribute('data-ing-id');
            draft.sections[shelfKey][id] = {
                physicalQty: parseFloat(r.querySelector('.shelf-physical-input')?.value) || 0,
                reason: r.querySelector('.row-reason-input')?.value || '',
                isManagerApproved: r.querySelector('.row-manager-check')?.checked || false
            };
        });

        // 3. Save WH2
        const wh2Rows = document.querySelectorAll('.wh2-stocktake-row');
        draft.sections.wh2 = draft.sections.wh2 || {};
        wh2Rows.forEach(r => {
            const id = r.getAttribute('data-ing-id');
            draft.sections.wh2[id] = {
                physicalQty: parseFloat(r.querySelector('.wh2-physical-input')?.value) || 0,
                reason: r.querySelector('.row-reason-input')?.value || '',
                isManagerApproved: r.querySelector('.row-manager-check')?.checked || false
            };
        });

        draft.updatedAt = new Date().toISOString();
        Store.saveStocktake(draft);
        showToast('تم حفظ مسودة الجرد بنجاح! 💾');
    };

    window.deleteMonthlyRollover = function(id) {
        if (confirm('هل أنت متأكد من حذف هذا السجل من أرشيف الجرد والترحيل؟')) {
            Store.deleteMonthlyRollover(id);
            renderStocktakeTab();
            showToast('🗑️ تم حذف السجل من أرشيف الجرد بنجاح!');
        }
    };

    window.viewStocktakeArchiveDetails = function(id) {
        const r = Store.getMonthlyRollovers().find(item => item.id === id);
        if (!r) return;

        const ingredients = Store.getIngredients();

        document.getElementById('st-arch-month-title').textContent = `شهر: ${r.monthKey}`;
        document.getElementById('st-arch-date').textContent = new Date(r.date).toLocaleString('ar-OM');
        document.getElementById('st-arch-surplus-qty').textContent = r.totalSurplusQty ? `${r.totalSurplusQty} وحدة` : '-';
        document.getElementById('st-arch-consumed-cost').textContent = `${parseFloat(r.totalConsumedCost || 0).toFixed(3)} ر.ع`;
        document.getElementById('st-arch-approved-by').textContent = r.approvedBy || 'المدير العام';

        const tbody = document.getElementById('st-arch-table-body');
        if (r.sectionsSnapshot) {
            let rowsHtml = '';
            // Render Shelves
            ['shelf-tahnah', 'shelf-katheeb', 'shelf-zafal'].forEach(sk => {
                const shelfName = sk === 'shelf-tahnah' ? 'رف طحنه' : (sk === 'shelf-katheeb' ? 'رف كثيب' : 'رف زعفل');
                const data = r.sectionsSnapshot[sk] || {};
                rowsHtml += `<tr class="bg-amber-100/60 font-black text-amber-900"><td colspan="9" class="px-3 py-2 text-start">📦 ${shelfName} (فائض الرف المرحل لنفس الفرع)</td></tr>`;
                Object.entries(data).forEach(([ingId, item], idx) => {
                    const ing = ingredients.find(i => i.id === ingId);
                    rowsHtml += `
                        <tr class="hover:bg-slate-50">
                            <td class="px-3 py-2 text-slate-400 font-bold">${idx + 1}</td>
                            <td class="px-3 py-2 font-bold text-slate-900">${ing ? ing.name : ingId}</td>
                            <td class="px-3 py-2 text-slate-500">${ing ? getI18nText('unit_' + ing.unit) : ''}</td>
                            <td class="px-3 py-2 font-mono" dir="ltr">${item.opening || 0}</td>
                            <td class="px-3 py-2 font-mono text-indigo-700" dir="ltr">${item.purchased || 0}</td>
                            <td class="px-3 py-2 font-mono font-black" dir="ltr">${item.available || 0}</td>
                            <td class="px-3 py-2 font-mono font-black text-emerald-800 bg-emerald-50" dir="ltr">${item.physicalQty || 0}</td>
                            <td class="px-3 py-2 font-mono font-black text-amber-900 bg-amber-50" dir="ltr">${item.actualUsed || 0}</td>
                            <td class="px-3 py-2 font-mono font-black text-emerald-700" dir="ltr">${item.physicalQty || 0}</td>
                        </tr>
                    `;
                });
            });

            // Render WH1 & WH2
            ['wh1', 'wh2'].forEach(wk => {
                const whName = wk === 'wh1' ? 'مخزن 1' : 'مخزن 2';
                const data = r.sectionsSnapshot[wk] || {};
                rowsHtml += `<tr class="bg-indigo-100/60 font-black text-indigo-900"><td colspan="9" class="px-3 py-2 text-start">🏬 ${whName}</td></tr>`;
                Object.entries(data).forEach(([ingId, item], idx) => {
                    const ing = ingredients.find(i => i.id === ingId);
                    rowsHtml += `
                        <tr class="hover:bg-slate-50">
                            <td class="px-3 py-2 text-slate-400 font-bold">${idx + 1}</td>
                            <td class="px-3 py-2 font-bold text-slate-900">${ing ? ing.name : ingId}</td>
                            <td class="px-3 py-2 text-slate-500">${ing ? getI18nText('unit_' + ing.unit) : ''}</td>
                            <td class="px-3 py-2 font-mono" dir="ltr">${item.opening || 0}</td>
                            <td class="px-3 py-2 font-mono text-indigo-700" dir="ltr">${item.purchased || 0}</td>
                            <td class="px-3 py-2 font-mono font-black" dir="ltr">${item.available || 0}</td>
                            <td class="px-3 py-2 font-mono font-black text-emerald-800 bg-emerald-50" dir="ltr">${item.physicalQty || 0}</td>
                            <td class="px-3 py-2 font-mono font-black text-amber-900 bg-amber-50" dir="ltr">${item.actualUsed || 0}</td>
                            <td class="px-3 py-2 font-mono font-black text-emerald-700" dir="ltr">${item.physicalQty || 0}</td>
                        </tr>
                    `;
                });
            });

            tbody.innerHTML = rowsHtml;
        } else if (r.items) {
            tbody.innerHTML = Object.entries(r.items).map(([ingId, data], idx) => {
                const ing = ingredients.find(i => i.id === ingId);
                const unit = ing ? getI18nText('unit_' + ing.unit) : '';
                return `
                    <tr class="hover:bg-slate-50">
                        <td class="px-3 py-2.5 text-slate-400 font-bold">${idx + 1}</td>
                        <td class="px-3 py-2.5 font-bold text-slate-900">${ing ? ing.name : ingId}</td>
                        <td class="px-3 py-2.5 text-slate-500">${unit}</td>
                        <td class="px-3 py-2.5 font-mono font-bold" dir="ltr">${data.opening || 0}</td>
                        <td class="px-3 py-2.5 font-mono font-bold text-indigo-700" dir="ltr">${data.purchased || 0}</td>
                        <td class="px-3 py-2.5 font-mono font-black text-slate-800" dir="ltr">${data.available || 0}</td>
                        <td class="px-3 py-2.5 font-mono font-black text-emerald-800 bg-emerald-50" dir="ltr">${data.physicalQty || 0}</td>
                        <td class="px-3 py-2.5 font-mono font-black text-amber-900 bg-amber-50" dir="ltr">${data.actualUsed || 0}</td>
                        <td class="px-3 py-2.5 font-mono font-black text-emerald-700" dir="ltr">${data.physicalQty || 0}</td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-slate-400 text-xs">لا تتوفر تفاصيل إضافية لهذا السجل القديم</td></tr>`;
        }

        openModal('stocktake-archive-detail-modal');
    };

    window.executeMonthRollover = function() {
        const user = Store.getLoggedInUser();
        if (user.role !== 'admin') {
            alert('عفواً، اعتماد وترحيل الجرد الشهري مخصص للمدير العام فقط!');
            closeModal('rollover-confirm-modal');
            return;
        }

        saveStocktakeDraft();

        const currentMonth = getCurrentMonthKey();
        const nextMonth = getNextMonthKey(currentMonth);
        const stocktakes = Store.getStocktakes();
        const currentDraft = stocktakes.find(s => s.monthKey === currentMonth) || { sections: {} };
        const ingredients = Store.getIngredients();

        const nextOpeningBalances = {
            "wh-1": {},
            "wh-2": {},
            "shelf-tahnah": {},
            "shelf-katheeb": {},
            "shelf-zafal": {}
        };

        const sectionsSnapshot = {
            "wh1": {},
            "wh2": {},
            "shelf-tahnah": {},
            "shelf-katheeb": {},
            "shelf-zafal": {}
        };

        let totalSurplusQty = 0;
        let totalConsumptionCost = 0;

        // 1. Rollover WH1
        const wh1Rows = document.querySelectorAll('.wh1-stocktake-row');
        wh1Rows.forEach(r => {
            const id = r.getAttribute('data-ing-id');
            const systemRecorded = parseFloat(r.querySelector('.row-system-qty')?.textContent) || 0;
            const phys = parseFloat(r.querySelector('.wh1-physical-input')?.value) || 0;
            const reason = r.querySelector('.row-reason-input')?.value || '';
            const isManagerApproved = r.querySelector('.row-manager-check')?.checked || false;

            nextOpeningBalances['wh-1'][id] = phys;
            sectionsSnapshot['wh1'][id] = {
                opening: systemRecorded,
                purchased: 0,
                available: systemRecorded,
                physicalQty: phys,
                actualUsed: Math.max(0, Math.round((systemRecorded - phys) * 1000) / 1000),
                reason,
                isManagerApproved
            };
            totalSurplusQty += phys;
            totalConsumptionCost += (Math.max(0, systemRecorded - phys) * 0.85);
        });

        // 2. Rollover Shelves (tahnah, katheeb, zafal)
        const openBalances = Store.getOpeningBalances(currentMonth) || {};
        const purchases = Store.getPurchases();
        ['tahnah', 'katheeb', 'zafal'].forEach(sh => {
            const shKey = 'shelf-' + sh;
            ingredients.forEach(ing => {
                const saved = currentDraft.sections?.[shKey]?.[ing.id] || {};
                const defaultOpen = Math.round((parseFloat(openBalances[ing.id] || 15) / 3) * 100) / 100;
                const opening = parseFloat(openBalances[shKey]?.[ing.id] ?? defaultOpen);
                
                let purchased = 0;
                purchases.forEach(p => {
                    if (p.items && Array.isArray(p.items)) {
                        p.items.forEach(item => {
                            const itemBranch = item.branch || p.branch;
                            if (item.ingredientId === ing.id && itemBranch === sh) {
                                purchased += parseFloat(item.quantity) || 0;
                            }
                        });
                    } else if (p.ingredientId === ing.id && p.branch === sh) {
                        purchased += parseFloat(p.quantity) || 0;
                    }
                });
                
                const available = Math.round((opening + purchased) * 1000) / 1000;
                const phys = saved.physicalQty !== undefined
                    ? parseFloat(saved.physicalQty)
                    : (sh === activeStocktakeShelf ? (parseFloat(document.querySelector(`.shelf-stocktake-row[data-ing-id="${ing.id}"] .shelf-physical-input`)?.value) || available) : available);
                
                const actualUsed = Math.max(0, Math.round((available - phys) * 1000) / 1000);
                
                nextOpeningBalances[shKey][ing.id] = phys;
                sectionsSnapshot[shKey][ing.id] = {
                    opening,
                    purchased,
                    available,
                    physicalQty: phys,
                    actualUsed,
                    reason: saved.reason || ''
                };
                totalSurplusQty += phys;
                totalConsumptionCost += (actualUsed * 0.85);
            });
        });

        // 3. Rollover WH2
        const wh2Rows = document.querySelectorAll('.wh2-stocktake-row');
        wh2Rows.forEach(r => {
            const id = r.getAttribute('data-ing-id');
            const systemRecorded = parseFloat(r.querySelector('.row-system-qty')?.textContent) || 0;
            const phys = parseFloat(r.querySelector('.wh2-physical-input')?.value) || 0;
            const reason = r.querySelector('.row-reason-input')?.value || '';
            const isManagerApproved = r.querySelector('.row-manager-check')?.checked || false;

            nextOpeningBalances['wh-2'][id] = phys;
            sectionsSnapshot['wh2'][id] = {
                opening: systemRecorded,
                purchased: 0,
                available: systemRecorded,
                physicalQty: phys,
                actualUsed: Math.max(0, Math.round((systemRecorded - phys) * 1000) / 1000),
                reason,
                isManagerApproved
            };
            totalSurplusQty += phys;
            totalConsumptionCost += (Math.max(0, systemRecorded - phys) * 0.85);
        });

        // Save Next Month Scoped Opening Balances
        Store.saveOpeningBalances(nextMonth, nextOpeningBalances);

        // Save Archive
        Store.saveMonthlyRollover({
            monthKey: currentMonth,
            nextMonthKey: nextMonth,
            totalConsumedCost: totalConsumptionCost.toFixed(3),
            totalSurplusQty: Math.round(totalSurplusQty * 100) / 100,
            sectionsSnapshot,
            approvedBy: `${user.name} (المدير العام)`
        });

        closeModal('rollover-confirm-modal');
        renderAll();
        showToast(`🚀 تم اعتماد جرد المخازن والأرفف وترحيل فائض كل رف ومخزن لشهر (${nextMonth}) بنجاح!`);
    };

    // ================= 13. STAFF & DEPARTMENTS MANAGEMENT =================
    function renderStaffAndTasks() {
        renderDepartments();
        renderStaff();
        renderTasks();
        renderFastSwitchList();
    }

    // --- 1. Departments Rendering ---
    function renderDepartments() {
        const grid = document.getElementById('departments-grid');
        if (!grid) return;
        const departments = Store.getDepartments();
        const employees = Store.getEmployees();

        grid.innerHTML = departments.map(dept => {
            const head = employees.find(e => e.id === dept.headId || (e.departmentId === dept.id && e.isDeptHead));
            const members = employees.filter(e => e.departmentId === dept.id);

            return `
                <div class="p-4 rounded-3xl border border-slate-200 bg-slate-50/70 hover:bg-white transition hover:shadow-md space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div class="flex items-center gap-2.5">
                            <span class="text-2xl p-2 bg-white rounded-2xl shadow-2xs border border-slate-100">${dept.icon || '🏢'}</span>
                            <div>
                                <h4 class="font-black text-slate-900 text-sm">${dept.name}</h4>
                                <span class="text-[11px] text-slate-500 font-bold">${members.length} موظفين بالفريق</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="openAddDepartmentModal('${dept.id}')" class="text-indigo-600 hover:text-indigo-800 p-1 font-bold text-xs" title="تعديل القسم">✏️</button>
                            <button onclick="deleteDepartment('${dept.id}')" class="text-rose-600 hover:text-rose-800 p-1 font-bold text-xs" title="حذف القسم">🗑️</button>
                        </div>
                    </div>

                    <!-- Department Head Card -->
                    <div class="p-2.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="text-base">👑</span>
                            <div>
                                <span class="text-[10px] text-amber-800 font-bold block">رئيس القسم المشرف:</span>
                                <span class="font-black text-slate-900 text-xs">${head ? head.name : 'لم يتم التعيين بعد'}</span>
                            </div>
                        </div>
                        ${head ? `<span class="badge-pill bg-amber-200 text-amber-900 text-[10px] font-black">${head.customRoleTitle || 'رئيس قسم'}</span>` : ''}
                    </div>

                    <!-- Team Members Avatars -->
                    <div class="space-y-1.5">
                        <span class="text-[10px] text-slate-400 font-bold block">أعضاء الفريق:</span>
                        ${members.length === 0 ? '<p class="text-xs text-slate-400 italic">لا يوجد موظفين مسجلين بهذا القسم حالياً</p>' : `
                            <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                ${members.map(m => `
                                    <span class="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1 shadow-2xs">
                                        <span>👤</span> <span>${m.name}</span>
                                        <span class="text-[10px] text-indigo-600 font-medium">(${m.customRoleTitle || m.role})</span>
                                    </span>
                                `).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Assign Task Button -->
                    <div class="pt-2 border-t border-slate-100">
                        <button onclick="openAddTaskForDept('${dept.id}')" class="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-xl transition text-center flex items-center justify-center gap-1 text-xs shadow-2xs">
                            <span>+ إسناد وتكليف مهمة لهذا القسم</span> <span>📋</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.openAddDepartmentModal = function(id = null) {
        const dept = id ? Store.getDepartments().find(d => d.id === id) : null;
        document.getElementById('dept-id').value = dept ? dept.id : '';
        document.getElementById('dept-name').value = dept ? dept.name : '';
        document.getElementById('dept-icon').value = dept ? dept.icon : '🏢';
        document.getElementById('dept-desc').value = dept ? (dept.description || '') : '';
        document.getElementById('dept-modal-title').textContent = dept ? 'تعديل بيانات القسم الإداري' : 'إضافة قسم إداري جديد';

        const headSelect = document.getElementById('dept-head-select');
        const employees = Store.getEmployees();
        headSelect.innerHTML = '<option value="">-- لم يتم تعيين رئيس للقسم بعد --</option>' + 
            employees.map(e => `<option value="${e.id}" ${dept && (dept.headId === e.id || e.id === dept.headId) ? 'selected' : ''}>${e.name} (${e.customRoleTitle || e.role})</option>`).join('');

        openModal('add-department-modal');
    };

    document.getElementById('department-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('dept-id').value;
        const name = document.getElementById('dept-name').value.trim();
        const icon = document.getElementById('dept-icon').value.trim() || '🏢';
        const headId = document.getElementById('dept-head-select').value;
        const desc = document.getElementById('dept-desc').value.trim();

        const savedDept = Store.saveDepartment({
            id: id || undefined,
            name,
            icon,
            headId,
            description: desc
        });

        if (headId) {
            const emp = Store.getEmployees().find(e => e.id === headId);
            if (emp) {
                emp.isDeptHead = true;
                emp.departmentId = savedDept.id;
                Store.saveEmployee(emp);
            }
        }

        closeModal('add-department-modal');
        renderStaffAndTasks();
        renderDropdowns();
        showToast(`تم حفظ القسم (${name}) بنجاح! 🏢✨`);
    });

    window.deleteDepartment = function(id) {
        if (confirm('هل أنت متأكد من حذف هذا القسم؟ لن يتم حذف الموظفين المسجلين فيه.')) {
            Store.deleteDepartment(id);
            renderStaffAndTasks();
            renderDropdowns();
            showToast('تم حذف القسم بنجاح!');
        }
    };

    // --- 2. Staff Directory Rendering ---
    function renderStaff() {
        const staffList = document.getElementById('staff-list');
        if (!staffList) return;
        const employees = Store.getEmployees();
        const departments = Store.getDepartments();
        const currentUser = Store.getLoggedInUser();
        const branchMap = { tahnah: 'محل طحنه', katheeb: 'محل كثيب', zafal: 'محل زعفل' };

        staffList.innerHTML = employees.map(emp => {
            const dept = departments.find(d => d.id === emp.departmentId);
            const roleTitle = emp.customRoleTitle || getI18nText('role_' + emp.role) || emp.role || 'موظف';
            const isCurrent = currentUser && (currentUser.id === emp.id || currentUser.username === emp.username);

            const empBranches = (emp.role === 'admin' || (emp.allowedBranches && emp.allowedBranches.includes('all')))
                ? ['tahnah', 'katheeb', 'zafal']
                : (emp.allowedBranches && emp.allowedBranches.length > 0 ? emp.allowedBranches : ['tahnah']);
            const branchBadgesHtml = empBranches.map(b => `
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">🏪 ${branchMap[b] || b}</span>
            `).join('');

            return `
                <div class="p-4 rounded-3xl border ${isCurrent ? 'border-emerald-400 bg-emerald-50/40 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50'} transition flex flex-col justify-between space-y-3">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center gap-3">
                            <span class="w-11 h-11 rounded-2xl ${isCurrent ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-700'} flex items-center justify-center font-black text-base shadow-2xs">
                                ${emp.name.charAt(0)}
                            </span>
                            <div>
                                <div class="font-black text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                                    <span>${emp.name}</span>
                                    ${emp.isDeptHead ? '<span class="badge-pill bg-amber-100 text-amber-800 text-[10px]">👑 رئيس قسم</span>' : ''}
                                    ${isCurrent ? '<span class="badge-pill bg-emerald-100 text-emerald-800 text-[10px]">النشط حالياً</span>' : ''}
                                </div>
                                <div class="text-xs text-slate-500 mt-0.5">
                                    اليوزر: <code class="font-mono text-indigo-600 font-bold bg-indigo-50 px-1 py-0.5 rounded">${emp.username || '-'}</code>
                                    ${emp.phone ? ` • <span dir="ltr">${emp.phone}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Role, Department and Branch Badges -->
                    <div class="space-y-1.5">
                        <div class="flex flex-wrap items-center gap-1.5 text-xs">
                            <span class="px-2.5 py-1 bg-slate-100 rounded-xl font-bold text-slate-700 flex items-center gap-1">
                                <span>${dept ? dept.icon : '🏢'}</span> <span>${dept ? dept.name : 'بدون قسم (عام)'}</span>
                            </span>
                            <span class="px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-xl font-black">
                                ${roleTitle}
                            </span>
                        </div>
                        <div class="flex flex-wrap items-center gap-1">
                            <span class="text-[11px] font-bold text-slate-500">المحلات:</span>
                            ${branchBadgesHtml}
                        </div>
                    </div>

                    <!-- Allowed Permissions Summary -->
                    <div class="text-[11px] text-slate-500 font-medium">
                        <span>الصلاحيات:</span> <b>${emp.role === 'admin' || (emp.allowedTabs && emp.allowedTabs.includes('all')) ? 'جميع شاشات النظام (كامل الصلاحيات)' : `${(emp.allowedTabs || []).length} شاشات مصرح بها`}</b>
                    </div>

                    <!-- Actions -->
                    <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <button onclick="switchActiveUserTo('${emp.id}')" class="px-3 py-1.5 ${isCurrent ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} rounded-xl font-bold text-xs transition flex items-center gap-1 shadow-2xs cursor-pointer">
                            <span>${isCurrent ? 'الحساب النشط ✅' : 'دخول بحسابه ⚡'}</span>
                        </button>
                        <div class="flex items-center gap-1">
                            <button onclick="openAddEmployeeModal('${emp.id}')" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold text-xs cursor-pointer" title="تعديل">✏️ تعديل</button>
                            ${emp.username !== 'Ahmed.admin' ? `
                                <button onclick="deleteEmployee('${emp.id}')" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-xs cursor-pointer" title="حذف">🗑️ حذف</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.openAddEmployeeModal = function(id = null) {
        const emp = id ? Store.getEmployees().find(e => e.id === id) : null;
        document.getElementById('emp-id').value = emp ? emp.id : '';
        document.getElementById('emp-name').value = emp ? emp.name : '';
        document.getElementById('emp-phone').value = emp ? (emp.phone || '') : '';
        document.getElementById('emp-username').value = emp ? (emp.username || '') : '';
        document.getElementById('emp-password').value = emp ? (emp.password || '') : '';
        document.getElementById('emp-role').value = emp ? emp.role : 'employee';
        document.getElementById('emp-custom-role').value = emp ? (emp.customRoleTitle || '') : '';
        document.getElementById('emp-is-head').checked = emp ? (emp.isDeptHead || false) : false;
        document.getElementById('emp-modal-title').textContent = emp ? 'تعديل بيانات الموظف والصلاحيات' : 'إضافة موظف جديد وتحديد الصلاحيات';
        document.getElementById('emp-submit-btn').textContent = emp ? 'تحديث الموظف' : 'حفظ الموظف';

        // Populate Department Selector
        const deptSelect = document.getElementById('emp-dept-select');
        const departments = Store.getDepartments();
        deptSelect.innerHTML = '<option value="">-- بدون قسم محدد (عام) --</option>' + 
            departments.map(d => `<option value="${d.id}" ${emp && emp.departmentId === d.id ? 'selected' : ''}>${d.icon} ${d.name}</option>`).join('');

        // Store / Branch Checkboxes
        document.querySelectorAll('input[name="emp-branches"]').forEach(cb => {
            if (!emp) {
                cb.checked = (cb.value === 'tahnah');
            } else if (emp.role === 'admin' || (emp.allowedBranches && emp.allowedBranches.includes('all'))) {
                cb.checked = true;
            } else {
                cb.checked = (emp.allowedBranches && emp.allowedBranches.includes(cb.value));
            }
        });

        // Permissions Checkboxes
        document.querySelectorAll('input[name="emp-tabs"]').forEach(cb => {
            cb.checked = !emp || emp.role === 'admin' || (emp.allowedTabs && (emp.allowedTabs.includes('all') || emp.allowedTabs.includes(cb.value)));
        });

        openModal('add-employee-modal');
    };

    window.toggleAllEmpPermissions = function() {
        const cbs = document.querySelectorAll('input[name="emp-tabs"]');
        const allChecked = Array.from(cbs).every(cb => cb.checked);
        cbs.forEach(cb => cb.checked = !allChecked);
    };

    document.getElementById('employee-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('emp-id').value;
        const name = document.getElementById('emp-name').value.trim();
        const phone = document.getElementById('emp-phone').value.trim();
        const username = document.getElementById('emp-username').value.trim();
        const password = document.getElementById('emp-password').value.trim();
        const departmentId = document.getElementById('emp-dept-select').value;
        const role = document.getElementById('emp-role').value;
        const customRoleTitle = document.getElementById('emp-custom-role').value.trim();
        const isDeptHead = document.getElementById('emp-is-head').checked;
        const selectedTabs = Array.from(document.querySelectorAll('input[name="emp-tabs"]:checked')).map(cb => cb.value);
        const selectedBranches = Array.from(document.querySelectorAll('input[name="emp-branches"]:checked')).map(cb => cb.value);
        const finalBranches = (role === 'admin') ? ['all', 'tahnah', 'katheeb', 'zafal'] : (selectedBranches.length > 0 ? selectedBranches : ['tahnah']);

        const savedEmp = Store.saveEmployee({
            id: id || undefined,
            name,
            phone,
            username,
            password,
            departmentId,
            role,
            customRoleTitle,
            isDeptHead,
            allowedTabs: role === 'admin' ? ['all'] : selectedTabs,
            allowedBranches: finalBranches
        });

        // If marked as dept head, sync with department
        if (isDeptHead && departmentId) {
            const dept = Store.getDepartments().find(d => d.id === departmentId);
            if (dept) {
                dept.headId = savedEmp.id;
                Store.saveDepartment(dept);
            }
        }

        closeModal('add-employee-modal');
        renderStaffAndTasks();
        renderActiveUserHeader();
        showToast(`تم حفظ الموظف (${name}) وتحديد محلات العمل بنجاح! 👤✨`);
    });

    window.deleteEmployee = function(id) {
        if (confirm('هل أنت متأكد من حذف هذا الموظف؟')) {
            Store.deleteEmployee(id);
            renderStaffAndTasks();
            renderDropdowns();
            showToast('تم حذف الموظف بنجاح!');
        }
    };

    // --- 3. Fast Switch & Account Handlers ---
    window.switchLoginModalTab = function(mode) {
        const fastPanel = document.getElementById('login-fast-switch-panel');
        const manualPanel = document.getElementById('login-manual-panel');
        const fastBtn = document.getElementById('tab-btn-fast-switch');
        const manualBtn = document.getElementById('tab-btn-manual-login');

        if (mode === 'fast') {
            fastPanel?.classList.remove('hidden');
            manualPanel?.classList.add('hidden');
            fastBtn?.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600');
            fastBtn?.classList.remove('text-slate-500');
            manualBtn?.classList.remove('border-b-2', 'border-indigo-600', 'text-indigo-600');
            manualBtn?.classList.add('text-slate-500');
            renderFastSwitchList();
        } else {
            fastPanel?.classList.add('hidden');
            manualPanel?.classList.remove('hidden');
            manualBtn?.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600');
            manualBtn?.classList.remove('text-slate-500');
            fastBtn?.classList.remove('border-b-2', 'border-indigo-600', 'text-indigo-600');
            fastBtn?.classList.add('text-slate-500');
        }
    };

    window.renderFastSwitchList = function() {
        const container = document.getElementById('fast-switch-employees-list');
        if (!container) return;
        const employees = Store.getEmployees();
        const departments = Store.getDepartments();
        const currentUser = Store.getLoggedInUser();
        const branchMap = { tahnah: 'طحنه', katheeb: 'كثيب', zafal: 'زعفل' };

        container.innerHTML = employees.map(emp => {
            const dept = departments.find(d => d.id === emp.departmentId);
            const isActive = currentUser && (currentUser.id === emp.id || currentUser.username === emp.username);
            const roleTitle = emp.customRoleTitle || getI18nText('role_' + emp.role) || emp.role || 'موظف';
            const empBranches = (emp.role === 'admin' || (emp.allowedBranches && emp.allowedBranches.includes('all')))
                ? ['جميع المحلات 🌟']
                : (emp.allowedBranches && emp.allowedBranches.length > 0 ? emp.allowedBranches.map(b => `محل ${branchMap[b] || b}`) : ['محل طحنه']);
            const branchText = empBranches.join(' • ');

            return `
                <div onclick="switchActiveUserTo('${emp.id}')" class="p-3 rounded-2xl border ${isActive ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200 bg-slate-50 hover:bg-white'} cursor-pointer transition flex items-center justify-between shadow-2xs hover:border-indigo-300">
                    <div class="flex items-center gap-3">
                        <span class="w-9 h-9 rounded-xl ${isActive ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-700'} flex items-center justify-center font-bold text-sm">
                            ${emp.name.charAt(0)}
                        </span>
                        <div>
                            <div class="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                                <span>${emp.name}</span>
                                ${emp.isDeptHead ? '<span class="badge-pill bg-amber-100 text-amber-800 text-[10px]">👑 رئيس قسم</span>' : ''}
                                ${isActive ? '<span class="badge-pill bg-emerald-100 text-emerald-800 text-[10px]">نشط حالياً ✅</span>' : ''}
                            </div>
                            <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                <span>${dept ? `${dept.icon} ${dept.name}` : 'عام'}</span>
                                <span>•</span>
                                <span class="font-bold text-indigo-700">${roleTitle}</span>
                                <span>•</span>
                                <span class="text-indigo-900 font-bold bg-indigo-50 px-1.5 py-0.5 rounded-md text-[10px]">🏪 ${branchText}</span>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="px-3 py-1.5 rounded-xl ${isActive ? 'bg-emerald-600 text-white font-bold text-xs' : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs'} transition">
                        ${isActive ? 'نشط' : 'تبديل ⚡'}
                    </button>
                </div>
            `;
        }).join('');
    };

    window.switchActiveUserTo = function(empId) {
        const emp = Store.getEmployees().find(e => e.id === empId);
        if (!emp) return;
        Store.setLoggedInUser(emp);
        renderActiveUserHeader();
        applyTabPermissions(emp);
        renderAll();
        closeModal('login-switch-modal');
        showToast(`تم التبديل بنجاح إلى حساب: ${emp.name} (${emp.customRoleTitle || emp.role}) 👤✨`);
    };

    document.getElementById('manual-login-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('manual-login-username').value.trim();
        const p = document.getElementById('manual-login-password').value.trim();
        const res = Store.login(u, p);
        if (res.success) {
            renderActiveUserHeader();
            applyTabPermissions(res.user);
            renderAll();
            closeModal('login-switch-modal');
            showToast(`مرحباً بك ${res.user.name}! تم تسجيل الدخول بنجاح 🚀`);
        } else {
            alert('⚠️ ' + (res.message || 'بيانات الدخول غير صحيحة!'));
        }
    });

    // --- 4. Tasks Rendering & Handling ---
    function renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        if (!tasksList) return;
        let tasks = Store.getTasks();
        const employees = Store.getEmployees();
        const departments = Store.getDepartments();

        const deptFilter = document.getElementById('task-filter-dept')?.value || 'all';
        const statusFilter = document.getElementById('task-filter-status')?.value || 'all';

        if (deptFilter !== 'all') {
            tasks = tasks.filter(t => t.departmentId === deptFilter || (t.assignedTo && employees.find(e => e.id === t.assignedTo)?.departmentId === deptFilter));
        }
        if (statusFilter !== 'all') {
            tasks = tasks.filter(t => t.status === statusFilter);
        }

        if (tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                    <span class="text-3xl block mb-2">📋</span>
                    <p class="text-xs font-bold text-slate-500">لا توجد مهام مسندة مطابقة للفلاتر المحددة حالياً.</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = tasks.map(task => {
            const assignedEmp = employees.find(e => e.id === task.assignedTo);
            const assignedDept = departments.find(d => d.id === task.departmentId);
            const isDone = task.status === 'completed' || task.status === 'done';
            const isInProgress = task.status === 'in_progress';

            let statusBadge = '';
            if (isDone) {
                statusBadge = '<span class="badge-pill bg-emerald-100 text-emerald-800 font-black text-xs">مكتملة ✅</span>';
            } else if (isInProgress) {
                statusBadge = '<span class="badge-pill bg-amber-100 text-amber-800 font-black text-xs">قيد التنفيذ 🔄</span>';
            } else {
                statusBadge = '<span class="badge-pill bg-slate-100 text-slate-700 font-black text-xs">قيد الانتظار ⏳</span>';
            }

            let targetBadge = '';
            if (task.assignType === 'dept' || (!task.assignedTo && task.departmentId)) {
                targetBadge = `<span class="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg text-xs font-black">🏢 ${assignedDept ? assignedDept.name : 'قسم بالكامل'}</span>`;
            } else {
                targetBadge = `<span class="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg text-xs font-bold">👤 ${assignedEmp ? assignedEmp.name : 'موظف محدد'}</span>`;
            }

            return `
                <div class="p-4 rounded-2xl border ${isDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'} hover:shadow-xs transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-start gap-3">
                        <button onclick="cycleTaskStatus('${task.id}')" class="mt-1 w-6 h-6 rounded-lg border-2 ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-indigo-500'} flex items-center justify-center text-xs font-bold transition" title="تغيير حالة المهمة">
                            ${isDone ? '✓' : ''}
                        </button>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <h4 class="font-black text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}">${task.title}</h4>
                                ${statusBadge}
                                ${targetBadge}
                            </div>
                            ${task.description ? `<p class="text-xs text-slate-500 mt-1">${task.description}</p>` : ''}
                            <div class="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                                <span>📅 موعد الإنجاز: <b class="text-slate-700">${task.dueDate || '-'}</b></span>
                                <span>•</span>
                                <span>⚡ الأولوية: <b class="${task.priority === 'high' ? 'text-rose-600' : 'text-slate-600'}">${task.priority === 'high' ? 'عاجلة 🔴' : (task.priority === 'low' ? 'عادية 🟢' : 'متوسطة 🟡')}</b></span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 self-end sm:self-center">
                        <button onclick="cycleTaskStatus('${task.id}')" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition">
                            ${isDone ? 'إعادة فتح 🔄' : 'تغيير الحالة ⚡'}
                        </button>
                        <button onclick="deleteTask('${task.id}')" class="text-rose-600 hover:text-rose-800 font-bold text-xs p-1">
                            حذف 🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.cycleTaskStatus = function(taskId) {
        const task = Store.getTasks().find(t => t.id === taskId);
        if (!task) return;
        if (!task.status || task.status === 'pending') {
            task.status = 'in_progress';
        } else if (task.status === 'in_progress') {
            task.status = 'completed';
        } else {
            task.status = 'pending';
        }
        Store.saveTask(task);
        renderTasks();
        showToast('تم تحديث حالة المهمة بنجاح! 📋');
    };

    window.toggleTaskAssignType = function(type) {
        const deptBox = document.getElementById('task-dept-box');
        const empBox = document.getElementById('task-emp-box');
        if (type === 'dept') {
            deptBox?.classList.remove('hidden');
            empBox?.classList.add('hidden');
        } else {
            deptBox?.classList.add('hidden');
            empBox?.classList.remove('hidden');
        }
    };

    window.openAddTaskModal = function(prefillDeptId = null, prefillEmpId = null) {
        document.getElementById('task-id').value = '';
        document.getElementById('task-title').value = '';
        document.getElementById('task-desc').value = '';
        document.getElementById('task-priority').value = 'medium';
        document.getElementById('task-due-date').value = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const deptSelect = document.getElementById('task-dept-select');
        const empSelect = document.getElementById('task-assignee');
        const departments = Store.getDepartments();
        const employees = Store.getEmployees();

        deptSelect.innerHTML = departments.map(d => `<option value="${d.id}" ${prefillDeptId === d.id ? 'selected' : ''}>${d.icon} ${d.name}</option>`).join('');
        empSelect.innerHTML = employees.map(e => `<option value="${e.id}" ${prefillEmpId === e.id ? 'selected' : ''}>${e.name} (${e.customRoleTitle || e.role})</option>`).join('');

        if (prefillDeptId) {
            document.querySelector('input[name="task-assign-type"][value="dept"]').checked = true;
            toggleTaskAssignType('dept');
        } else if (prefillEmpId) {
            document.querySelector('input[name="task-assign-type"][value="employee"]').checked = true;
            toggleTaskAssignType('employee');
        } else {
            document.querySelector('input[name="task-assign-type"][value="dept"]').checked = true;
            toggleTaskAssignType('dept');
        }

        openModal('add-task-modal');
    };

    window.openAddTaskForDept = function(deptId) {
        openAddTaskModal(deptId, null);
    };

    window.deleteTask = function(id) {
        if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
            Store.deleteTask(id);
            renderTasks();
            showToast('تم حذف المهمة بنجاح!');
        }
    };

    document.getElementById('task-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const assignType = document.querySelector('input[name="task-assign-type"]:checked')?.value || 'dept';
        const deptId = document.getElementById('task-dept-select').value;
        const empId = document.getElementById('task-assignee').value;
        const priority = document.getElementById('task-priority').value;
        const dueDate = document.getElementById('task-due-date').value;
        const desc = document.getElementById('task-desc').value.trim();

        Store.saveTask({
            title,
            assignType,
            departmentId: assignType === 'dept' ? deptId : '',
            assignedTo: assignType === 'employee' ? empId : '',
            priority,
            dueDate,
            description: desc,
            status: 'pending'
        });

        closeModal('add-task-modal');
        renderTasks();
        showToast(`تم إسناد المهمة (${title}) بنجاح! 📋🚀`);
    });

    // ================= 14. DROPDOWNS POPULATION =================
    function renderDropdowns() {
        const ingredients = Store.getIngredients();
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();
        const recipes = Store.getRecipes();
        const employees = Store.getEmployees();

        // Raw waste
        const rawWasteSelect = document.getElementById('waste-raw-select');
        if (rawWasteSelect) rawWasteSelect.innerHTML = ingredients.map(i => `<option value="${i.id}">${i.name} (${getI18nText('unit_' + i.unit)})</option>`).join('');

        // Ingredient / Raw Product Category & Warehouse (Grouped per warehouse)
        const rawCatSelect = document.getElementById('prod-raw-category-select');
        let catOptionsHtml = '<option value="">-- اختر الفئة --</option>';
        warehouses.forEach(w => {
            const wCats = categories.filter(c => w.categoryIds && w.categoryIds.includes(c.id));
            if (wCats.length > 0) {
                catOptionsHtml += `<optgroup label="🏢 ${w.name}">` + wCats.map(c => `<option value="${c.id}" data-wh="${w.id}">${c.name}</option>`).join('') + `</optgroup>`;
            }
        });
        const unassigned = categories.filter(c => !warehouses.some(w => w.categoryIds && w.categoryIds.includes(c.id)));
        if (unassigned.length > 0) {
            catOptionsHtml += `<optgroup label="فئات أخرى">` + unassigned.map(c => `<option value="${c.id}">${c.name}</option>`).join('') + `</optgroup>`;
        }
        if (rawCatSelect) rawCatSelect.innerHTML = catOptionsHtml;

        const rawWhSelect = document.getElementById('prod-raw-warehouse-select');
        if (rawWhSelect) rawWhSelect.innerHTML = warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');

        // Dashboard Filters
        const dashCatSelect = document.getElementById('dash-filter-category');
        if (dashCatSelect) {
            const curVal = dashCatSelect.value;
            dashCatSelect.innerHTML = `<option value="all">${getI18nText('filterCategoryAll')}</option>` + categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            dashCatSelect.value = curVal || 'all';
        }

        const dashWhSelect = document.getElementById('dash-filter-warehouse');
        if (dashWhSelect) {
            const curVal = dashWhSelect.value;
            dashWhSelect.innerHTML = `<option value="all">${getI18nText('filterWarehouseAll')}</option>` + warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
            dashWhSelect.value = curVal || 'all';
        }

        // Recipe Selectors
        const orderRecSelect = document.getElementById('order-recipe-select');
        const wasteRecSelect = document.getElementById('waste-recipe-select');
        const recOptions = recipes.map(r => `<option value="${r.id}">${r.name} (ينتج ${r.yield || 1} قطعة)</option>`).join('');

        if (orderRecSelect) orderRecSelect.innerHTML = recOptions;
        if (wasteRecSelect) wasteRecSelect.innerHTML = recOptions;

        // Task Assignee
        const taskAssignee = document.getElementById('task-assignee');
        if (taskAssignee) taskAssignee.innerHTML = employees.map(e => `<option value="${e.id}">${e.name} (${e.customRoleTitle || e.role})</option>`).join('');

        // Task Department Filter
        const taskFilterDept = document.getElementById('task-filter-dept');
        if (taskFilterDept) {
            const curVal = taskFilterDept.value || 'all';
            const departments = Store.getDepartments();
            taskFilterDept.innerHTML = '<option value="all">جميع الأقسام</option>' + departments.map(d => `<option value="${d.id}">${d.icon} ${d.name}</option>`).join('');
            taskFilterDept.value = curVal;
        }
    }

    // Dashboard Toolbar Listeners
    document.getElementById('dash-filter-branch')?.addEventListener('change', renderDashboard);
    document.getElementById('dash-filter-category')?.addEventListener('change', renderDashboard);
    document.getElementById('dash-filter-warehouse')?.addEventListener('change', renderDashboard);
    document.getElementById('dash-sort-by')?.addEventListener('change', renderDashboard);

    // ================= 15. MODAL HELPERS =================
    window.openModal = function(modalId) {
        const m = document.getElementById(modalId);
        if (m) {
            m.classList.remove('hidden');
            m.style.display = 'flex';
        }
        if (modalId === 'add-purchase-modal') {
            const container = document.getElementById('purchase-items-list');
            if (container && container.children.length === 0) {
                addPurchaseItemRow();
            }
        }
        if (modalId === 'manage-categories-modal') {
            try { renderCategoriesModalList(); } catch(e){}
        }
        if (modalId === 'add-warehouse-modal') {
            try {
                const currentId = document.getElementById('wh-id')?.value;
                if (!currentId) renderWarehouseCategoryCheckboxes([]);
            } catch(e){}
        }
        if (modalId === 'add-order-modal') {
            try {
                const allowedBranches = getUserAllowedBranches();
                const branchSelect = document.getElementById('order-branch');
                if (branchSelect) {
                    const branchMap = { tahnah: 'محل طحنه', katheeb: 'محل كثيب', zafal: 'محل زعفل' };
                    const branchesToShow = allowedBranches.includes('all') ? ['tahnah', 'katheeb', 'zafal'] : allowedBranches;
                    branchSelect.innerHTML = branchesToShow.map(b => `<option value="${b}">🏪 ${branchMap[b] || b}</option>`).join('');
                }
            } catch(e){}
        }
    };

    window.closeModal = function(modalId) {
        const m = document.getElementById(modalId);
        if (m) {
            m.classList.add('hidden');
            m.style.display = 'none';
        }
        try {
            if (modalId === 'add-ingredient-modal') {
                document.getElementById('ingredient-form')?.reset();
                const idField = document.getElementById('ing-id');
                if (idField) idField.value = '';
            } else if (modalId === 'add-warehouse-modal') {
                document.getElementById('warehouse-form')?.reset();
                const idField = document.getElementById('wh-id');
                if (idField) idField.value = '';
            } else if (modalId === 'add-purchase-modal') {
                document.getElementById('purchase-form')?.reset();
                const editIdField = document.getElementById('pur-edit-id');
                if (editIdField) editIdField.value = '';
                const modalTitle = document.getElementById('pur-modal-title');
                if (modalTitle) modalTitle.textContent = 'تسجيل فاتورة مشتريات جديدة (بالريال العماني ر.ع)';
                const invField = document.getElementById('pur-invoice-base64');
                if (invField) invField.value = '';
                const previewBox = document.getElementById('pur-image-preview-box');
                if (previewBox) previewBox.classList.add('hidden');
                const itemsList = document.getElementById('purchase-items-list');
            } else if (modalId === 'add-consumable-purchase-modal') {
                document.getElementById('consumable-purchase-form')?.reset();
                const editIdField = document.getElementById('cons-edit-id');
                if (editIdField) editIdField.value = '';
                const modalTitle = document.getElementById('cons-modal-title');
                if (modalTitle) modalTitle.textContent = 'تسجيل فاتورة استهلاكية جديدة (بالريال العماني ر.ع)';
                const invField = document.getElementById('cons-invoice-base64');
                if (invField) invField.value = '';
                const previewBox = document.getElementById('cons-image-preview-box');
                if (previewBox) previewBox.classList.add('hidden');
                const radioSingle = document.getElementById('cons-mode-single');
                if (radioSingle) radioSingle.checked = true;
                toggleConsumableBranchMode('single');
                const multiTotal = document.getElementById('cons-multi-total-display');
                if (multiTotal) multiTotal.textContent = '0.000 ر.ع';
            } else if (modalId === 'add-recipe-modal') {
                document.getElementById('recipe-form')?.reset();
                const idField = document.getElementById('rec-id');
                if (idField) idField.value = '';
                const branchField = document.getElementById('rec-branch');
                if (branchField) branchField.value = 'tahnah';
                const submitBtn = document.getElementById('rec-submit-btn');
                if (submitBtn) submitBtn.textContent = 'حفظ الوصفة';
                const imgField = document.getElementById('rec-image-base64');
                if (imgField) imgField.value = '';
                const ingList = document.getElementById('recipe-ingredients-list');
                if (ingList) ingList.innerHTML = '';
            } else if (modalId === 'add-employee-modal') {
                document.getElementById('employee-form')?.reset();
                const idField = document.getElementById('emp-id');
                if (idField) idField.value = '';
            } else if (modalId === 'manage-categories-modal') {
                document.getElementById('add-category-form')?.reset();
            } else if (modalId === 'edit-category-modal') {
                document.getElementById('edit-category-form')?.reset();
                const idField = document.getElementById('edit-cat-id');
                if (idField) idField.value = '';
            } else if (modalId === 'add-product-modal') {
                document.getElementById('product-form')?.reset();
                const idField = document.getElementById('prod-id');
                if (idField) idField.value = '';
                const title = document.getElementById('prod-modal-title');
                if (title) title.textContent = 'إضافة منتج جديد 📦';
                const submitBtn = document.getElementById('prod-submit-btn');
                if (submitBtn) submitBtn.textContent = 'حفظ المنتج 💾';
                const selectorBox = document.getElementById('prod-nature-selector-box');
                if (selectorBox) selectorBox.classList.remove('hidden');
                switchProductNatureType('raw');
            }
        } catch (e) {
            console.error("closeModal error:", e);
        }
    };

    function showToast(msg) {
        try {
            const toast = document.createElement('div');
            toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce font-bold border border-slate-700 text-xs sm:text-sm';
            toast.innerHTML = msg;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.4s ease';
                setTimeout(() => toast.remove(), 400);
            }, 2200);
        } catch(e){}
    }
    window.showToast = showToast;

    function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // ================= 16. MASTER RENDER =================
    window.renderAll = function() {
        try { renderActiveUserHeader(); } catch (e) { console.error("header err", e); }
        try { renderDropdowns(); } catch (e) { console.error("dropdowns err", e); }
        try { renderDashboard(); } catch (e) { console.error("dashboard err", e); }
        try { renderPurchasesTab(); } catch (e) { console.error("purchases err", e); }
        try { renderExternalPurchasesTab(); } catch (e) { console.error("external purchases err", e); }
        try { renderProductsTab(); } catch (e) { console.error("products err", e); }
        try { renderWarehousesTab(); } catch (e) { console.error("warehouses err", e); }
        try { renderShelvesTab(); } catch (e) { console.error("shelves err", e); }
        try { renderArchiveTab(); } catch (e) { console.error("archive err", e); }
        try { renderProductReportTab(); } catch (e) { console.error("product report err", e); }
        try { renderRecipesTab(); } catch (e) { console.error("recipes err", e); }
        try { renderOrdersTab(); } catch (e) { console.error("orders err", e); }
        try { renderUsagePOS(); } catch (e) { console.error("usage err", e); }
        try { renderWasteTab(); } catch (e) { console.error("waste err", e); }
        try { renderStocktakeTab(); } catch (e) { console.error("stocktake err", e); }
        try { renderStaffAndTasks(); } catch (e) { console.error("staff err", e); }
    };

    // Backup & Restore Handlers
    window.exportDatabaseJSON = function() {
        const allData = {};
        Object.values(Store.KEYS).forEach(k => {
            if (k !== Store.KEYS.AUTH_USER) {
                allData[k] = Store._get(k);
            }
        });
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showToast('تم تحميل ملف النسخة الاحتياطية بنجاح 💾');
    };

    window.importDatabaseJSON = function(fileInput) {
        if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    Object.keys(data).forEach(k => {
                        if (data[k]) {
                            localStorage.setItem(k, JSON.stringify(data[k]));
                        }
                    });
                    Store._syncToServer();
                    renderAll();
                    showToast('✅ تم استيراد واستعادة البيانات بنجاح!');
                } catch (err) {
                    alert('ملف غير صالح، يرجى اختيار ملف JSON صحيح.');
                }
            };
            reader.readAsText(fileInput.files[0]);
        }
    };

    // Synchronous immediate rendering on startup
    checkAuth();

    // Asynchronous background sync
    Store.initSync(() => {
        try { renderAll(); } catch(e){}
    });
});
