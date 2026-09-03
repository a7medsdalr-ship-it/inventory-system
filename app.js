/**
 * app.js - Full Enterprise Application Logic with Auth, Balanced Invoices, Permissions, and Warehouses
 */

document.addEventListener('DOMContentLoaded', async () => {

    
    // ================= GLOBAL MODAL & ACTION HANDLERS =================
    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn("openModal: modal not found:", modalId);
            return;
        }
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };

    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    };

    window.openAddPurchaseModal = function() {
        const form = document.getElementById('purchase-form');
        if (form) form.reset();
        const editId = document.getElementById('pur-edit-id');
        if (editId) editId.value = '';
        const b64 = document.getElementById('pur-invoice-base64');
        if (b64) b64.value = '';
        const prevBox = document.getElementById('pur-image-preview-box');
        if (prevBox) prevBox.classList.add('hidden');
        const title = document.getElementById('pur-modal-title');
        if (title) title.textContent = 'تسجيل فاتورة مشتريات محلية جديدة (بالريال العماني ر.ع)';

        const user = Store.getLoggedInUser();
        const isAdmin = user && user.role === 'admin';
        const dateInput = document.getElementById('pur-invoice-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
            if (isAdmin) {
                dateInput.disabled = false;
                dateInput.removeAttribute('readonly');
            } else {
                dateInput.disabled = true;
                dateInput.setAttribute('readonly', 'true');
            }
        }

        const container = document.getElementById('purchase-items-list');
        if (container) {
            container.innerHTML = '';
            if (typeof addPurchaseItemRow === 'function') addPurchaseItemRow();
        }
        if (typeof updateInvoiceAutoSummary === 'function') updateInvoiceAutoSummary();
        openModal('add-purchase-modal');
    };

    window.openAddConsumablePurchaseModal = function() {
        const form = document.getElementById('consumable-purchase-form');
        if (form) form.reset();
        const editId = document.getElementById('cons-edit-id');
        if (editId) editId.value = '';
        const b64 = document.getElementById('cons-invoice-base64');
        if (b64) b64.value = '';
        const prevBox = document.getElementById('cons-image-preview-box');
        if (prevBox) prevBox.classList.add('hidden');
        const title = document.getElementById('cons-modal-title');
        if (title) title.textContent = 'تسجيل فاتورة استهلاكية جديدة (بالريال العماني ر.ع)';

        const user = Store.getLoggedInUser();
        const isAdmin = user && user.role === 'admin';
        const dateInput = document.getElementById('cons-invoice-date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
            if (isAdmin) {
                dateInput.disabled = false;
                dateInput.removeAttribute('readonly');
            } else {
                dateInput.disabled = true;
                dateInput.setAttribute('readonly', 'true');
            }
        }
        if (typeof toggleConsumableBranchMode === 'function') toggleConsumableBranchMode('single');
        openModal('add-consumable-purchase-modal');
    };

    window.openAddEmployeeModal = function() {
        const form = document.getElementById('employee-form');
        if (form) form.reset();
        const editId = document.getElementById('emp-id');
        if (editId) editId.value = '';
        const title = document.getElementById('emp-modal-title');
        if (title) title.textContent = 'إضافة موظف جديد';
        if (typeof renderDepartmentSelect === 'function') renderDepartmentSelect('emp-department');
        toggleAllEmpPermissions(true);
        openModal('add-employee-modal');
    };

    window.openAddDepartmentModal = function() {
        const form = document.getElementById('department-form');
        if (form) form.reset();
        const editId = document.getElementById('dept-id');
        if (editId) editId.value = '';
        openModal('add-department-modal');
    };

    window.openAddTaskModal = function() {
        const form = document.getElementById('task-form');
        if (form) form.reset();
        const editId = document.getElementById('task-id');
        if (editId) editId.value = '';
        if (typeof renderDepartmentSelect === 'function') renderDepartmentSelect('task-department');
        if (typeof renderEmployeeSelect === 'function') renderEmployeeSelect('task-assignee');
        openModal('add-task-modal');
    };

    window.switchLoginModalTab = function(tab) {
        const isLogin = tab === 'login';
        const loginSection = document.getElementById('login-form-section');
        const switchSection = document.getElementById('switch-user-section');
        const tabLoginBtn = document.getElementById('modal-tab-login');
        const tabSwitchBtn = document.getElementById('modal-tab-switch');
        if (loginSection && switchSection) {
            if (isLogin) {
                loginSection.classList.remove('hidden');
                switchSection.classList.add('hidden');
                if (tabLoginBtn) tabLoginBtn.className = 'flex-1 py-2 font-black text-xs sm:text-sm bg-indigo-600 text-white rounded-xl shadow-xs';
                if (tabSwitchBtn) tabSwitchBtn.className = 'flex-1 py-2 font-bold text-xs sm:text-sm text-slate-600 hover:text-slate-900 rounded-xl';
            } else {
                loginSection.classList.add('hidden');
                switchSection.classList.remove('hidden');
                if (tabSwitchBtn) tabSwitchBtn.className = 'flex-1 py-2 font-black text-xs sm:text-sm bg-indigo-600 text-white rounded-xl shadow-xs';
                if (tabLoginBtn) tabLoginBtn.className = 'flex-1 py-2 font-bold text-xs sm:text-sm text-slate-600 hover:text-slate-900 rounded-xl';
                if (typeof renderUserSwitchList === 'function') renderUserSwitchList();
            }
        }
    };

    window.toggleAllEmpPermissions = function(checked) {
        document.querySelectorAll('.emp-perm-check').forEach(cb => {
            cb.checked = checked;
        });
    };

    window.setRecipeBranchFilter = function(b) {
        window.activeRecipeBranch = b;
        if (typeof renderRecipesTab === 'function') renderRecipesTab();
    };

    window.executeMonthRollover = function() {
        if (typeof confirmRollover === 'function') {
            confirmRollover();
        } else {
            showToast('تم اعتماد وترحيل رصيد الشهر بنجاح 🚀✅');
            closeModal('rollover-confirm-modal');
        }
    };


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

    const tabTitlesMap = {
        'dashboard-tab': '📊 لوحة القيادة (لوحة التحكم)',
        'usage-tab': '⚡ نقاط البيع (الكاشير والاستهلاك)',
        'purchases-tab': '🛒 المشتريات المحلية',
        'external-purchases-tab': '🚚 المشتريات الخارجية والطلبيات',
        'orders-tab': '👨‍🍳 تقديم طلب (المطبخ والإنتاج)',
        'products-tab': '📦 دليل وإدارة المنتجات',
        'warehouse-1-tab': '🏬 مخزن المشتريات المحلية',
        'warehouse-2-tab': '🏢 مخزن المشتريات الخارجية',
        'shelves-tab': '🏪 إدارة مخزن الأرفف وتزويد المحلات',
        'recipes-tab': '📖 دليل الوصفات والإنتاج',
        'archive-tab': '🗄️ أرشيف المنتجات والمواد المتوقفة',
        'product-report-tab': '📊 تقرير حركة وتتبع المنتج الشامل',
        'waste-tab': '🗑️ تسجيل التالف والهدر',
        'stocktake-tab': '📋 الجرد الشهري والفعلي',
        'profits-tab': '💰 الأرباح والتقارير المالية',
        'staff-tasks-tab': '👥 إدارة الموظفين والصلاحيات'
    };

    window.switchTab = function(targetTabId) {
        if (!targetTabId || !document.getElementById(targetTabId)) {
            targetTabId = 'dashboard-tab';
        }
        window.activeNavTab = targetTabId;
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');

        // Update Sidebar and Desktop Nav Buttons
        tabBtns.forEach(b => {
            if (b.getAttribute('data-tab-id') === targetTabId) {
                b.classList.add('bg-indigo-600', 'text-white', 'shadow-xs');
                b.classList.remove('text-slate-600', 'md:text-slate-300', 'md:text-slate-400', 'hover:bg-slate-100', 'md:hover:bg-slate-800');
            } else {
                b.classList.remove('bg-indigo-600', 'text-white', 'shadow-xs');
                b.classList.add('text-slate-600', 'md:text-slate-300', 'hover:bg-slate-100', 'md:hover:bg-slate-800');
            }
        });

        // Auto-expand parent accordion if inside purchases or warehouses
        if (targetTabId === 'purchases-tab' || targetTabId === 'external-purchases-tab') {
            const purContent = document.getElementById('pur-accordion-content');
            const purChevron = document.getElementById('pur-accordion-chevron');
            if (purContent) purContent.classList.remove('hidden');
            if (purChevron) purChevron.style.transform = 'rotate(180deg)';
        } else if (targetTabId === 'warehouse-1-tab' || targetTabId === 'warehouse-2-tab' || targetTabId === 'shelves-tab') {
            const whContent = document.getElementById('wh-accordion-content');
            const whChevron = document.getElementById('wh-accordion-chevron');
            if (whContent) whContent.classList.remove('hidden');
            if (whChevron) whChevron.style.transform = 'rotate(180deg)';
        }

        // Update Top Workspace Page Title
        const pageTitleEl = document.getElementById('workspace-page-title');
        if (pageTitleEl && tabTitlesMap[targetTabId]) {
            pageTitleEl.innerHTML = tabTitlesMap[targetTabId];
        }

        // On mobile: auto close sidebar menu on navigation
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('app-sidebar');
            const navContainer = document.getElementById('sidebar-nav-container');
            if (sidebar && navContainer && navContainer.classList.contains('mobile-open')) {
                toggleSidebarMenu();
            }
        }

        // Close dropdown menus when switching any tab
        const menu = document.getElementById('inventory-dropdown-menu');
        const chevron = document.getElementById('inventory-dropdown-chevron');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.add('hidden');
        }
        if (chevron) chevron.style.transform = 'rotate(0deg)';

        const purMenu = document.getElementById('purchases-dropdown-menu');
        const purChevron = document.getElementById('purchases-dropdown-chevron');
        if (purMenu) {
            purMenu.style.display = 'none';
            purMenu.classList.add('hidden');
        }
        if (purChevron) purChevron.style.transform = 'rotate(0deg)';

        // Highlight parent "إدارة المشتريات" dropdown button if current tab is purchases or external purchases
        const isPurchasesSubTab = (targetTabId === 'purchases-tab' || targetTabId === 'external-purchases-tab');
        const purDropdownBtn = document.getElementById('purchases-dropdown-btn');
        if (purDropdownBtn) {
            if (isPurchasesSubTab) {
                purDropdownBtn.classList.add('bg-indigo-600', 'text-white');
                purDropdownBtn.classList.remove('text-slate-600');
            } else {
                purDropdownBtn.classList.remove('bg-indigo-600', 'text-white');
                purDropdownBtn.classList.add('text-slate-600');
            }
        }

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
            if (filterBranch === 'tahnah') openQty = openingBalances['shelf-tahnah']?.[ing.id] ?? openingBalances['tahnah']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else if (filterBranch === 'katheeb') openQty = openingBalances['shelf-katheeb']?.[ing.id] ?? openingBalances['katheeb']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else if (filterBranch === 'zafal') openQty = openingBalances['shelf-zafal']?.[ing.id] ?? openingBalances['zafal']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else if (filterWarehouse === 'wh-1' || filterWarehouse === 'wh1_fixed_id' || filterWarehouse === '6a3dfi5flmsvn4x9q') openQty = openingBalances['wh-1']?.[ing.id] ?? openingBalances['wh1_fixed_id']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else if (filterWarehouse === 'wh-2' || filterWarehouse === 'wh2_fixed_id' || filterWarehouse === 'n8825cuynmsvn4x9q') openQty = openingBalances['wh-2']?.[ing.id] ?? openingBalances['wh2_fixed_id']?.[ing.id] ?? openingBalances[ing.id] ?? 0;
            else {
                if (openingBalances['wh-1'] || openingBalances['wh1_fixed_id'] || openingBalances['wh-2'] || openingBalances['wh2_fixed_id'] || openingBalances['shelf-tahnah']) {
                    openQty = (openingBalances['wh-1']?.[ing.id] || openingBalances['wh1_fixed_id']?.[ing.id] || 0) +
                              (openingBalances['wh-2']?.[ing.id] || openingBalances['wh2_fixed_id']?.[ing.id] || 0) +
                              (openingBalances['shelf-tahnah']?.[ing.id] || openingBalances['tahnah']?.[ing.id] || 0) +
                              (openingBalances['shelf-katheeb']?.[ing.id] || openingBalances['katheeb']?.[ing.id] || 0) +
                              (openingBalances['shelf-zafal']?.[ing.id] || openingBalances['zafal']?.[ing.id] || 0);
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
    window.renderDashboard = function() {
        const tbody = document.getElementById('dashboard-table-body');
        if (!tbody) return;

        const branchSelect = document.getElementById('dash-filter-branch');
        const catSelect = document.getElementById('dash-filter-category');
        const whSelect = document.getElementById('dash-filter-warehouse');
        const sortSelect = document.getElementById('dash-sort-by');

        const branchFilter = branchSelect ? branchSelect.value : 'all';
        const categoryFilter = catSelect ? catSelect.value : 'all';
        const warehouseFilter = whSelect ? whSelect.value : 'all';
        const sortBy = sortSelect ? sortSelect.value : 'default';

        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();

        // Populate Warehouse Filter Dropdown dynamically if needed
        if (whSelect && whSelect.options.length <= 1) {
            const curWh = whSelect.value;
            whSelect.innerHTML = '<option value="all">🏬 جميع المخازن</option>' +
                warehouses.map(w => `<option value="${w.id}" ${curWh === w.id ? 'selected' : ''}>🏬 ${w.name}</option>`).join('');
        }

        // Populate Category Filter Dropdown dynamically if needed
        if (catSelect && catSelect.options.length <= 1) {
            const curCat = catSelect.value;
            catSelect.innerHTML = '<option value="all">🏷️ جميع الفئات (' + categories.length + ')</option>' +
                categories.map(c => `<option value="${c.id}" ${curCat === c.id ? 'selected' : ''}>🏷️ ${c.name}</option>`).join('');
        }

        const rawInventory = calculateInventory(branchFilter, warehouseFilter);
        let items = Object.values(rawInventory);

        // Filter Category
        if (categoryFilter !== 'all') {
            items = items.filter(i => i.categoryId === categoryFilter);
        }

        // Filter Warehouse
        if (warehouseFilter !== 'all') {
            const selectedWh = warehouses.find(w => w.id === warehouseFilter);
            items = items.filter(i => {
                return i.warehouseId === warehouseFilter || (selectedWh && selectedWh.categoryIds && selectedWh.categoryIds.includes(i.categoryId));
            });
        }

        // Sorting
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (sortBy === 'qty-asc') {
            items.sort((a, b) => (parseFloat(a.remaining) || 0) - (parseFloat(b.remaining) || 0));
        } else if (sortBy === 'qty-desc') {
            items.sort((a, b) => (parseFloat(b.remaining) || 0) - (parseFloat(a.remaining) || 0));
        } else if (sortBy === 'expiry') {
            items.sort((a, b) => {
                if (!a.nearestExpiry) return 1;
                if (!b.nearestExpiry) return -1;
                return new Date(a.nearestExpiry) - new Date(b.nearestExpiry);
            });
        }

        // Reorder Alert Threshold Verification
        const lowStockItems = items.filter(inv => (parseFloat(inv.remaining) || 0) <= (parseFloat(inv.minThreshold) || 5));
        const alertBox = document.getElementById('dash-reorder-alert-box');
        const alertText = document.getElementById('dash-reorder-alert-text');

        if (alertBox && alertText) {
            if (lowStockItems.length > 0) {
                alertBox.classList.remove('hidden');
                alertText.textContent = `المواد التي تحتاج إعادة طلب فوراً (${lowStockItems.length} مواد): ${lowStockItems.slice(0, 5).map(i => i.name).join(' ، ')}${lowStockItems.length > 5 ? ' ...وغيرها' : ''}`;
            } else {
                alertBox.classList.add('hidden');
            }
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

        const statTotal = document.getElementById('stat-total-items');
        if (statTotal) statTotal.textContent = items.length;

        const statExpiring = document.getElementById('stat-expiring-soon');
        if (statExpiring) statExpiring.textContent = expiringSoonCount;

        const statApprovals = document.getElementById('stat-pending-approvals');
        if (statApprovals) statApprovals.textContent = Store.getPurchases().filter(p => !p.isApproved).length;

        const statOrders = document.getElementById('stat-pending-orders');
        if (statOrders) statOrders.textContent = Store.getProductionOrders().filter(o => o.status !== 'delivered').length;

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-12 text-slate-400 font-bold">
                        <div class="text-4xl mb-2">🔍</div>
                        <p class="text-sm font-bold text-slate-600">لا توجد مواد تطابق خيارات التصفية المحددة.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map(inv => {
            const cat = categories.find(c => c.id === inv.categoryId);
            const catName = cat ? cat.name : 'عام';
            const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + inv.unit) : '';
            const unit = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (inv.unit || 'حبة');
            const minThreshold = parseFloat(inv.minThreshold) || 5;

            // Status Badge
            let statusBadge = '<span class="badge-pill bg-emerald-100 text-emerald-800 font-bold">متوفر جيداً ✅</span>';
            if (inv.remaining <= 0) {
                statusBadge = '<span class="badge-pill bg-rose-100 text-rose-800 font-black">نفد المخزون ❌</span>';
            } else if (inv.remaining <= minThreshold) {
                statusBadge = '<span class="badge-pill bg-amber-100 text-amber-800 font-bold pulse-alert">تنبيه: إعادة طلب ⚠️</span>';
            }

            // Expiry Badge
            let expiryHtml = '<span class="text-slate-400">-</span>';
            if (inv.nearestExpiry) {
                const expDate = new Date(inv.nearestExpiry);
                const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                    expiryHtml = `<span class="badge-pill bg-rose-100 text-rose-800 font-bold" dir="ltr">${inv.nearestExpiry} (منتهي ⛔)</span>`;
                    statusBadge = '<span class="badge-pill bg-rose-100 text-rose-800 font-bold">منتهي الصلاحية ⛔</span>';
                } else if (diffDays <= 7) {
                    expiryHtml = `<span class="badge-pill bg-amber-100 text-amber-900 font-bold" dir="ltr">${inv.nearestExpiry} (${diffDays} يوم ⏳)</span>`;
                } else {
                    expiryHtml = `<span class="text-slate-600 text-xs font-medium" dir="ltr">${inv.nearestExpiry}</span>`;
                }
            }

            return `
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="px-4 py-3 font-bold text-slate-900">
                        <div class="flex items-center gap-2">
                            <span>📦</span>
                            <span>${inv.name}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">
                        <span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">${catName}</span>
                    </td>
                    <td class="px-4 py-3 font-bold text-slate-700 text-xs">${inv.totalPurchased} ${unit}</td>
                    <td class="px-4 py-3 font-bold text-slate-700 text-xs">${inv.totalUsed} ${unit}</td>
                    <td class="px-4 py-3 font-bold text-rose-600 text-xs">${inv.totalWasted > 0 ? inv.totalWasted + ' ' + unit : '-'}</td>
                    <td class="px-4 py-3 font-black text-indigo-900 bg-indigo-50/40 text-sm">${inv.remaining} ${unit}</td>
                    <td class="px-4 py-3 font-bold text-slate-500 text-xs">${minThreshold} ${unit}</td>
                    <td class="px-4 py-3">${expiryHtml}</td>
                    <td class="px-4 py-3">${statusBadge}</td>
                </tr>
            `;
        }).join('');
    };
    function renderDashboard() { window.renderDashboard(); }


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
    window.addPurchaseItemRow = function addPurchaseItemRow(itemData = null) {
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

        // Set Invoice Date for Editing
        const user = Store.getLoggedInUser();
        const isAdmin = user && user.role === 'admin';
        const dateInput = document.getElementById('pur-invoice-date');
        const dateBadge = document.getElementById('pur-date-admin-badge');
        const dateHint = document.getElementById('pur-date-hint');

        if (dateInput) {
            const rawDate = p.dateAdded || new Date().toISOString();
            dateInput.value = rawDate.split('T')[0];
            if (isAdmin) {
                dateInput.disabled = false;
                dateInput.removeAttribute('readonly');
                if (dateBadge) {
                    dateBadge.textContent = '👑 صلاحية المسؤول: تعديل تاريخ الفاتورة';
                    dateBadge.className = 'badge-pill bg-emerald-100 text-emerald-800 text-[10px] font-bold';
                }
                if (dateHint) dateHint.textContent = 'يمكنك تغيير وتعديل تاريخ الفاتورة ليتم تصنيفها وحسابها في يومها المحدد';
            } else {
                dateInput.disabled = true;
                dateInput.setAttribute('readonly', 'true');
                if (dateBadge) {
                    dateBadge.textContent = '🔒 مقفل (صلاحية تعديل التاريخ للمسؤول فقط)';
                    dateBadge.className = 'badge-pill bg-slate-200 text-slate-700 text-[10px] font-bold';
                }
                if (dateHint) dateHint.textContent = 'تعديل تاريخ الفواتير يتطلب حساب المسؤول العام';
            }
        }

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
            dateAdded: (() => {
                const chosenDate = document.getElementById('pur-invoice-date')?.value;
                if (chosenDate) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (chosenDate === todayStr && !existing) {
                        return new Date().toISOString();
                    }
                    return new Date(chosenDate + 'T12:00:00.000Z').toISOString();
                }
                return existing ? existing.dateAdded : new Date().toISOString();
            })()
        });

        // Reset form & list
        document.getElementById('purchase-items-list').innerHTML = '';
        document.getElementById('pur-edit-id').value = '';
        document.getElementById('pur-invoice-base64').value = '';
        document.getElementById('pur-modal-title').textContent = 'تسجيل فاتورة مشتريات محلية جديدة (بالريال العماني ر.ع)';
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

        // Set Invoice Date for Editing
        const user = Store.getLoggedInUser();
        const isAdmin = user && user.role === 'admin';
        const dateInput = document.getElementById('cons-invoice-date');
        const dateBadge = document.getElementById('cons-date-admin-badge');
        const dateHint = document.getElementById('cons-date-hint');

        if (dateInput) {
            const rawDate = p.dateAdded || new Date().toISOString();
            dateInput.value = rawDate.split('T')[0];
            if (isAdmin) {
                dateInput.disabled = false;
                dateInput.removeAttribute('readonly');
                if (dateBadge) {
                    dateBadge.textContent = '👑 صلاحية المسؤول: تعديل تاريخ الفاتورة';
                    dateBadge.className = 'badge-pill bg-emerald-100 text-emerald-800 text-[10px] font-bold';
                }
                if (dateHint) dateHint.textContent = 'يمكنك تغيير وتعديل تاريخ الفاتورة الاستهلاكية';
            } else {
                dateInput.disabled = true;
                dateInput.setAttribute('readonly', 'true');
                if (dateBadge) {
                    dateBadge.textContent = '🔒 مقفل (صلاحية تعديل التاريخ للمسؤول فقط)';
                    dateBadge.className = 'badge-pill bg-slate-200 text-slate-700 text-[10px] font-bold';
                }
                if (dateHint) dateHint.textContent = 'تعديل تاريخ الفواتير يتطلب حساب المسؤول العام';
            }
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
            dateAdded: (() => {
                const chosenDate = document.getElementById('cons-invoice-date')?.value;
                if (chosenDate) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (chosenDate === todayStr && !existing) {
                        return new Date().toISOString();
                    }
                    return new Date(chosenDate + 'T12:00:00.000Z').toISOString();
                }
                return existing ? existing.dateAdded : new Date().toISOString();
            })()
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
            'wh1': '🏬 مخزن المشتريات المحلية',
            'wh2': '🏢 مخزن المشتريات الخارجية',
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
                        <span class="badge-pill bg-slate-100 text-slate-800 font-bold text-[11px]">${whNameMap[p.targetWarehouseId] || p.targetWarehouseId || '🏬 مخزن المشتريات المحلية'}</span>
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

        let targetWh = warehouses.find(w => w.id === 'wh2' || w.id === 'wh2_fixed_id' || w.id === 'n8825cuynmsvn4x9q') || warehouses[1] || { id: 'wh2_fixed_id', name: 'مخزن المشتريات الخارجية', categoryIds: ["cat_wh2_syrup", "cat_wh2_topping", "cat_wh2_drinkware", "cat_wh2_foodpack", "cat_wh2_dry", "cat_wh2_frozen", "cat_wh2_dairy", "cat_wh2_coffee", "cat_wh2_tea"] };

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
            <option value="all" ${selectedCatId === 'all' ? 'selected' : ''}>📂 جميع فئات مخزن المشتريات الخارجية (${wh2Categories.length} فئة)</option>
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
                <option value="">-- لا توجد منتجات في هذه الفئة لمخزن المشتريات الخارجية --</option>
            `;
        } else {
            prodSelect.innerHTML = `
                <option value="">-- اضغط لاختيار منتج من مخزن المشتريات الخارجية (${filteredItems.length} منتج متوفر) --</option>
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
        showToast(`تمت إضافة المنتج (${prodName}) لمخزن المشتريات الخارجية بنجاح! 📦✨`);
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
            if (titleEl) titleEl.textContent = 'طلب شراء خارجي جديد (مخزن المشتريات الخارجية)';
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
            document.getElementById('ext-modal-title').textContent = 'تعديل طلب شراء خارجي (مخزن المشتريات الخارجية)';
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
        showToast(`تم حفظ طلب الشراء الخارجي لمخزن المشتريات الخارجية للمنتج (${itemName}) بنجاح! 🚚✅`);
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

    // ================= 6. UNIFIED PRODUCTS MANAGEMENT (دليل وإدارة المنتجات) =================
    function getProductLocationName(loc) {
        if (!loc) return 'غير محدد';
        if (loc === 'wh1' || loc === 'wh-1' || loc === 'wh1_fixed_id') return '🏬 مخزن المشتريات المحلية';
        if (loc === 'wh2' || loc === 'wh-2' || loc === 'wh2_fixed_id') return '🏢 مخزن المشتريات الخارجية';
        if (loc === 'tahnah') return '🏪 فرع طحنه';
        if (loc === 'katheeb') return '🏪 فرع كثيب';
        if (loc === 'zafal') return '🏪 فرع زعفل';
        return loc;
    }

    function renderProductsTab() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        const allIngredients = Store.getIngredients().filter(i => !i.archived);
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();

        // Update Category Filter Dropdown
        const catFilter = document.getElementById('prod-filter-category');
        const selectedWhFilter = document.getElementById('prod-filter-warehouse')?.value || 'all';

        if (catFilter) {
            let availableCats = categories;
            if (selectedWhFilter !== 'all') {
                const whObj = warehouses.find(w => w.id === selectedWhFilter);
                if (whObj && whObj.categoryIds) {
                    availableCats = categories.filter(c => whObj.categoryIds.includes(c.id));
                }
            }
            const currentSelectedCat = catFilter.value || 'all';
            catFilter.innerHTML = `
                <option value="all">🏷️ جميع الفئات (${availableCats.length})</option>
                ${availableCats.map(c => `<option value="${c.id}" ${currentSelectedCat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            `;
        }

        // Update Modal Dropdown for Warehouse
        const rawWhSelect = document.getElementById('prod-raw-warehouse-select');
        if (rawWhSelect && rawWhSelect.children.length === 0) {
            rawWhSelect.innerHTML = warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        }

        // Update KPIs
        const localItems = allIngredients.filter(i => i.warehouseId === 'wh1_fixed_id' || i.warehouseId === 'wh1');
        const externalItems = allIngredients.filter(i => i.warehouseId === 'wh2_fixed_id' || i.warehouseId === 'wh2');
        
        let lowStockCount = 0;
        allIngredients.forEach(ing => {
            const stock = Store.getIngredientStock(ing.id);
            const remaining = (stock.purchased + (stock.externalPurchased || 0)) - (stock.used + stock.wasted);
            if (remaining <= (ing.minThreshold || 0)) lowStockCount++;
        });

        const totalCountEl = document.getElementById('stat-products-total');
        const localCountEl = document.getElementById('stat-products-local');
        const externalCountEl = document.getElementById('stat-products-external');
        const lowCountEl = document.getElementById('stat-products-low');

        if (totalCountEl) totalCountEl.textContent = allIngredients.length;
        if (localCountEl) localCountEl.textContent = localItems.length;
        if (externalCountEl) externalCountEl.textContent = externalItems.length;
        if (lowCountEl) lowCountEl.textContent = lowStockCount;

        // Prepare unified items list
        let unifiedList = allIngredients.map(ing => {
            const cat = categories.find(c => c.id === ing.categoryId);
            const wh = warehouses.find(w => w.id === ing.warehouseId);
            return {
                id: ing.id,
                name: ing.name,
                categoryName: cat ? cat.name : 'عام',
                categoryId: ing.categoryId,
                warehouseId: ing.warehouseId || 'wh1_fixed_id',
                warehouseName: wh ? wh.name : (ing.warehouseId === 'wh2_fixed_id' ? 'مخزن المشتريات الخارجية' : 'مخزن المشتريات المحلية'),
                unit: getI18nText('unit_' + ing.unit) || ing.unit,
                rawUnit: ing.unit,
                costPrice: ing.costPrice || 0,
                minThreshold: ing.minThreshold || 5,
                hasExpiry: (ing.hasExpiry === 'no' || ing.hasExpiry === false) ? 'no' : 'yes'
            };
        });

        // Filter by Warehouse
        if (selectedWhFilter !== 'all') {
            unifiedList = unifiedList.filter(item => item.warehouseId === selectedWhFilter || (selectedWhFilter === 'wh1_fixed_id' && item.warehouseId === 'wh1') || (selectedWhFilter === 'wh2_fixed_id' && item.warehouseId === 'wh2'));
        }

        // Filter by Category
        const catFilterVal = document.getElementById('prod-filter-category')?.value || 'all';
        if (catFilterVal !== 'all') {
            unifiedList = unifiedList.filter(item => item.categoryId === catFilterVal);
        }

        // Filter by Search Query
        const searchVal = (document.getElementById('prod-search-input')?.value || '').trim().toLowerCase();
        if (searchVal) {
            unifiedList = unifiedList.filter(item => 
                (item.name || '').toLowerCase().includes(searchVal) ||
                (item.categoryName || '').toLowerCase().includes(searchVal) ||
                (item.warehouseName || '').toLowerCase().includes(searchVal)
            );
        }

        if (unifiedList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-10 text-slate-400 font-bold">
                        <div class="text-3xl mb-1.5">📦</div>
                        <p class="text-sm font-bold text-slate-600">لا توجد منتجات مسجلة مطابقة للبحث أو التصفية.</p>
                        <button type="button" onclick="openAddProductModal('all')" class="mt-2.5 text-indigo-600 hover:underline font-bold text-xs cursor-pointer">
                            + إضافة منتج جديد الآن
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = unifiedList.map(item => {
            const isLocal = (item.warehouseId === 'wh1_fixed_id' || item.warehouseId === 'wh1');
            const whBadge = isLocal
                ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">🏬 مخزن المشتريات المحلية</span>'
                : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-purple-50 text-purple-800 border border-purple-200">🏢 مخزن المشتريات الخارجية</span>';

            const expiryBadge = (item.hasExpiry === 'yes')
                ? '<span class="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">إلزامي ⏳</span>'
                : '<span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">بدون انتهاء ♾️</span>';

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="px-4 py-3 font-bold text-slate-900 text-xs sm:text-sm">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">📦</span>
                            <span class="font-black">${item.name}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">${whBadge}</td>
                    <td class="px-4 py-3 font-medium text-slate-700 text-xs">
                        <span class="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 font-bold">${item.categoryName}</span>
                    </td>
                    <td class="px-4 py-3 font-bold text-slate-800 text-xs">${item.unit}</td>
                    <td class="px-4 py-3 font-black text-rose-700 text-xs">${item.minThreshold} ${item.unit}</td>
                    <td class="px-4 py-3">${expiryBadge}</td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-1.5 flex-wrap">
                            <button type="button" onclick="openProductMovementReport('${item.id}', 'ingredient')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" title="عرض تقرير حركة وتتبع المنتج">📊 تقرير</button>
                            <button type="button" onclick="archiveProductItem('${item.id}', 'ingredient')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" title="أرشفة المنتج">🗄️ أرشفة</button>
                            <button type="button" onclick="openEditUnifiedProductModal('${item.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer" title="تعديل">✏️</button>
                            <button type="button" onclick="deleteUnifiedProduct('${item.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer" title="حذف">🗑️</button>
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

    document.getElementById('prod-raw-warehouse-select')?.addEventListener('change', (e) => {
        if (window.updateProductModalCategories) window.updateProductModalCategories(e.target.value);
    });

    window.openAddProductModal = function(defaultType = 'all') {
        const modal = document.getElementById('add-product-modal');
        if (!modal) return;

        // Reset form
        document.getElementById('product-form')?.reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-modal-title').textContent = 'إضافة منتج جديد 📦';
        document.getElementById('prod-submit-btn').innerHTML = '<span>حفظ المنتج</span> <span>💾</span>';

        if (window.toggleInlineAddCategory) toggleInlineAddCategory(false);

        const rawWhSelect = document.getElementById('prod-raw-warehouse-select');
        if (rawWhSelect) {
            const whIdToUse = (window.activeNavTab === 'warehouse-2-tab' || defaultType === 'wh2' || defaultType === 'wh2_fixed_id') ? 'wh2_fixed_id' : 'wh1_fixed_id';
            rawWhSelect.value = whIdToUse;
            if (window.updateProductModalCategories) window.updateProductModalCategories(whIdToUse);
        }

        openModal('add-product-modal');
    };

    window.openEditUnifiedProductModal = function(id) {
        document.getElementById('product-form')?.reset();
        document.getElementById('prod-id').value = id;

        if (window.toggleInlineAddCategory) toggleInlineAddCategory(false);

        document.getElementById('prod-modal-title').textContent = 'تعديل بيانات المنتج ✏️';
        document.getElementById('prod-submit-btn').innerHTML = '<span>تحديث وحفظ التعديلات</span> <span>✅</span>';

        const ing = Store.getIngredients().find(i => i.id === id);
        if (!ing) return;

        document.getElementById('prod-name').value = ing.name || '';
        document.getElementById('prod-raw-warehouse-select').value = ing.warehouseId || 'wh1_fixed_id';
        if (window.updateProductModalCategories) window.updateProductModalCategories(ing.warehouseId || 'wh1_fixed_id', ing.categoryId);
        document.getElementById('prod-raw-category-select').value = ing.categoryId || '';
        document.getElementById('prod-raw-unit').value = ing.unit || 'piece';
        document.getElementById('prod-raw-min-threshold').value = ing.minThreshold || 5;
        document.getElementById('prod-cost-price').value = ing.costPrice || 0;
        document.getElementById('prod-raw-has-expiry').value = (ing.hasExpiry === 'no' || ing.hasExpiry === false) ? 'no' : 'yes';

        openModal('add-product-modal');
    };

    window.deleteUnifiedProduct = function(id) {
        const isUsedInRecipe = Store.getRecipes().some(r => r.ingredients.some(ri => ri.ingredientId === id));
        if (isUsedInRecipe) {
            alert('لا يمكن حذف هذا المنتج لأنه مستخدم في وصفات حالية.');
            return;
        }
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            Store.deleteIngredient(id);
            renderAll();
            showToast('تم حذف المنتج بنجاح! 🗑️');
        }
    };

    document.getElementById('product-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const name = document.getElementById('prod-name').value.trim();
        const warehouseId = document.getElementById('prod-raw-warehouse-select').value || 'wh1_fixed_id';
        const categoryId = document.getElementById('prod-raw-category-select').value;
        const unit = document.getElementById('prod-raw-unit').value;
        const minThreshold = parseFloat(document.getElementById('prod-raw-min-threshold').value) || 5;
        const costPrice = parseFloat(document.getElementById('prod-cost-price')?.value) || 0;
        const hasExpiry = document.getElementById('prod-raw-has-expiry').value;

        if (!name) {
            alert('يرجى إدخال اسم المنتج!');
            return;
        }

        if (!categoryId) {
            alert('يرجى اختيار فئة المنتج أو إنشاء فئة جديدة من الزر أعلاه.');
            return;
        }

        Store.saveIngredient({
            id: id ? id : undefined,
            name,
            categoryId,
            warehouseId,
            unit,
            minThreshold,
            costPrice,
            hasExpiry
        });

        closeModal('add-product-modal');
        renderAll();
        showToast(`تم حفظ المنتج (${name}) بنجاح! 📦✅`);
    });

    document.getElementById('prod-filter-category')?.addEventListener('change', renderProductsTab);
    document.getElementById('prod-filter-warehouse')?.addEventListener('change', renderProductsTab);
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

    window.selectPurchasesNavTab = function(tabId) {
        const purMenu = document.getElementById('purchases-dropdown-menu');
        const purChevron = document.getElementById('purchases-dropdown-chevron');
        if (purMenu) {
            purMenu.style.display = 'none';
            purMenu.classList.add('hidden');
        }
        if (purChevron) purChevron.style.transform = 'rotate(0deg)';

        switchTab(tabId);

        if (tabId === 'purchases-tab') {
            renderPurchasesTab();
        } else if (tabId === 'external-purchases-tab') {
            renderExternalPurchasesTab();
        }
    };

    // ================= DROPDOWN NAVIGATION CONTROLLERS =================
    window.toggleInventoryDropdown = function(event) {
        if (event) {
            event.stopPropagation();
        }
        const menu = document.getElementById('inventory-dropdown-menu');
        const chevron = document.getElementById('inventory-dropdown-chevron');
        if (!menu) return;

        // Close purchases dropdown if open
        const purMenu = document.getElementById('purchases-dropdown-menu');
        const purChevron = document.getElementById('purchases-dropdown-chevron');
        if (purMenu) {
            purMenu.style.display = 'none';
            purMenu.classList.add('hidden');
        }
        if (purChevron) purChevron.style.transform = 'rotate(0deg)';

        const isHidden = (menu.style.display === 'none' || menu.classList.contains('hidden') || !menu.style.display);
        if (isHidden) {
            menu.classList.remove('hidden');
            menu.style.display = 'block';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            menu.style.display = 'none';
            menu.classList.add('hidden');
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    };

    window.togglePurchasesDropdown = function(event) {
        if (event) {
            event.stopPropagation();
        }
        const purMenu = document.getElementById('purchases-dropdown-menu');
        const purChevron = document.getElementById('purchases-dropdown-chevron');
        if (!purMenu) return;

        // Close inventory dropdown if open
        const menu = document.getElementById('inventory-dropdown-menu');
        const chevron = document.getElementById('inventory-dropdown-chevron');
        if (menu) {
            menu.style.display = 'none';
            menu.classList.add('hidden');
        }
        if (chevron) chevron.style.transform = 'rotate(0deg)';

        const isHidden = (purMenu.style.display === 'none' || purMenu.classList.contains('hidden') || !purMenu.style.display);
        if (isHidden) {
            purMenu.classList.remove('hidden');
            purMenu.style.display = 'block';
            if (purChevron) purChevron.style.transform = 'rotate(180deg)';
        } else {
            purMenu.style.display = 'none';
            purMenu.classList.add('hidden');
            if (purChevron) purChevron.style.transform = 'rotate(0deg)';
        }
    };

    // Global click listener to close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        const invWrapper = document.getElementById('inventory-dropdown-wrapper');
        const purWrapper = document.getElementById('purchases-dropdown-wrapper');

        if (invWrapper && !invWrapper.contains(e.target)) {
            const menu = document.getElementById('inventory-dropdown-menu');
            const chevron = document.getElementById('inventory-dropdown-chevron');
            if (menu) {
                menu.style.display = 'none';
                menu.classList.add('hidden');
            }
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }

        if (purWrapper && !purWrapper.contains(e.target)) {
            const purMenu = document.getElementById('purchases-dropdown-menu');
            const purChevron = document.getElementById('purchases-dropdown-chevron');
            if (purMenu) {
                purMenu.style.display = 'none';
                purMenu.classList.add('hidden');
            }
            if (purChevron) purChevron.style.transform = 'rotate(0deg)';
        }
    });

        // ================= 6. UNIFIED PRODUCTS MANAGEMENT (دليل وإدارة المنتجات) =================
    function getProductLocationName(loc) {
        if (!loc) return 'غير محدد';
        if (loc === 'wh1' || loc === 'wh-1' || loc === 'wh1_fixed_id') return '🏬 مخزن المشتريات المحلية';
        if (loc === 'wh2' || loc === 'wh-2' || loc === 'wh2_fixed_id') return '🏢 مخزن المشتريات الخارجية';
        if (loc === 'tahnah') return '🏪 فرع طحنه';
        if (loc === 'katheeb') return '🏪 فرع كثيب';
        if (loc === 'zafal') return '🏪 فرع زعفل';
        return loc;
    }

    function renderProductsTab() {
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        const allIngredients = Store.getIngredients().filter(i => !i.archived);
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();

        // Update Category Filter Dropdown
        const catFilter = document.getElementById('prod-filter-category');
        const selectedWhFilter = document.getElementById('prod-filter-warehouse')?.value || 'all';

        if (catFilter) {
            let availableCats = categories;
            if (selectedWhFilter !== 'all') {
                const whObj = warehouses.find(w => w.id === selectedWhFilter);
                if (whObj && whObj.categoryIds) {
                    availableCats = categories.filter(c => whObj.categoryIds.includes(c.id));
                }
            }
            const currentSelectedCat = catFilter.value || 'all';
            catFilter.innerHTML = `
                <option value="all">🏷️ جميع الفئات (${availableCats.length})</option>
                ${availableCats.map(c => `<option value="${c.id}" ${currentSelectedCat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            `;
        }

        // Update Modal Dropdown for Warehouse
        const rawWhSelect = document.getElementById('prod-raw-warehouse-select');
        if (rawWhSelect && rawWhSelect.children.length === 0) {
            rawWhSelect.innerHTML = warehouses.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
        }

        // Update KPIs
        const localItems = allIngredients.filter(i => i.warehouseId === 'wh1_fixed_id' || i.warehouseId === 'wh1');
        const externalItems = allIngredients.filter(i => i.warehouseId === 'wh2_fixed_id' || i.warehouseId === 'wh2');
        
        let lowStockCount = 0;
        allIngredients.forEach(ing => {
            const stock = Store.getIngredientStock(ing.id);
            const remaining = (stock.purchased + (stock.externalPurchased || 0)) - (stock.used + stock.wasted);
            if (remaining <= (ing.minThreshold || 0)) lowStockCount++;
        });

        const totalCountEl = document.getElementById('stat-products-total');
        const localCountEl = document.getElementById('stat-products-local');
        const externalCountEl = document.getElementById('stat-products-external');
        const lowCountEl = document.getElementById('stat-products-low');

        if (totalCountEl) totalCountEl.textContent = allIngredients.length;
        if (localCountEl) localCountEl.textContent = localItems.length;
        if (externalCountEl) externalCountEl.textContent = externalItems.length;
        if (lowCountEl) lowCountEl.textContent = lowStockCount;

        // Prepare unified items list
        let unifiedList = allIngredients.map(ing => {
            const cat = categories.find(c => c.id === ing.categoryId);
            const wh = warehouses.find(w => w.id === ing.warehouseId);
            return {
                id: ing.id,
                name: ing.name,
                categoryName: cat ? cat.name : 'عام',
                categoryId: ing.categoryId,
                warehouseId: ing.warehouseId || 'wh1_fixed_id',
                warehouseName: wh ? wh.name : (ing.warehouseId === 'wh2_fixed_id' ? 'مخزن المشتريات الخارجية' : 'مخزن المشتريات المحلية'),
                unit: getI18nText('unit_' + ing.unit) || ing.unit,
                rawUnit: ing.unit,
                costPrice: ing.costPrice || 0,
                minThreshold: ing.minThreshold || 5,
                hasExpiry: (ing.hasExpiry === 'no' || ing.hasExpiry === false) ? 'no' : 'yes'
            };
        });

        // Filter by Warehouse
        if (selectedWhFilter !== 'all') {
            unifiedList = unifiedList.filter(item => item.warehouseId === selectedWhFilter || (selectedWhFilter === 'wh1_fixed_id' && item.warehouseId === 'wh1') || (selectedWhFilter === 'wh2_fixed_id' && item.warehouseId === 'wh2'));
        }

        // Filter by Category
        const catFilterVal = document.getElementById('prod-filter-category')?.value || 'all';
        if (catFilterVal !== 'all') {
            unifiedList = unifiedList.filter(item => item.categoryId === catFilterVal);
        }

        // Filter by Search Query
        const searchVal = (document.getElementById('prod-search-input')?.value || '').trim().toLowerCase();
        if (searchVal) {
            unifiedList = unifiedList.filter(item => 
                (item.name || '').toLowerCase().includes(searchVal) ||
                (item.categoryName || '').toLowerCase().includes(searchVal) ||
                (item.warehouseName || '').toLowerCase().includes(searchVal)
            );
        }

        if (unifiedList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-10 text-slate-400 font-bold">
                        <div class="text-3xl mb-1.5">📦</div>
                        <p class="text-sm font-bold text-slate-600">لا توجد منتجات مسجلة مطابقة للبحث أو التصفية.</p>
                        <button type="button" onclick="openAddProductModal('all')" class="mt-2.5 text-indigo-600 hover:underline font-bold text-xs cursor-pointer">
                            + إضافة منتج جديد الآن
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = unifiedList.map(item => {
            const isLocal = (item.warehouseId === 'wh1_fixed_id' || item.warehouseId === 'wh1');
            const whBadge = isLocal
                ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">🏬 مخزن المشتريات المحلية</span>'
                : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-purple-50 text-purple-800 border border-purple-200">🏢 مخزن المشتريات الخارجية</span>';

            const expiryBadge = (item.hasExpiry === 'yes')
                ? '<span class="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">إلزامي ⏳</span>'
                : '<span class="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">بدون انتهاء ♾️</span>';

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="px-4 py-3 font-bold text-slate-900 text-xs sm:text-sm">
                        <div class="flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">📦</span>
                            <span class="font-black">${item.name}</span>
                        </div>
                    </td>
                    <td class="px-4 py-3">${whBadge}</td>
                    <td class="px-4 py-3 font-medium text-slate-700 text-xs">
                        <span class="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 font-bold">${item.categoryName}</span>
                    </td>
                    <td class="px-4 py-3 font-bold text-slate-800 text-xs">${item.unit}</td>
                    <td class="px-4 py-3 font-black text-rose-700 text-xs">${item.minThreshold} ${item.unit}</td>
                    <td class="px-4 py-3">${expiryBadge}</td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-1.5 flex-wrap">
                            <button type="button" onclick="openProductMovementReport('${item.id}', 'ingredient')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" title="عرض تقرير حركة وتتبع المنتج">📊 تقرير</button>
                            <button type="button" onclick="archiveProductItem('${item.id}', 'ingredient')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1" title="أرشفة المنتج">🗄️ أرشفة</button>
                            <button type="button" onclick="openEditUnifiedProductModal('${item.id}')" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer" title="تعديل">✏️</button>
                            <button type="button" onclick="deleteUnifiedProduct('${item.id}')" class="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer" title="حذف">🗑️</button>
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

    document.getElementById('prod-raw-warehouse-select')?.addEventListener('change', (e) => {
        if (window.updateProductModalCategories) window.updateProductModalCategories(e.target.value);
    });

    window.openAddProductModal = function(defaultType = 'all') {
        const modal = document.getElementById('add-product-modal');
        if (!modal) return;

        // Reset form
        document.getElementById('product-form')?.reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-modal-title').textContent = 'إضافة منتج جديد 📦';
        document.getElementById('prod-submit-btn').innerHTML = '<span>حفظ المنتج</span> <span>💾</span>';

        if (window.toggleInlineAddCategory) toggleInlineAddCategory(false);

        const rawWhSelect = document.getElementById('prod-raw-warehouse-select');
        if (rawWhSelect) {
            const whIdToUse = (window.activeNavTab === 'warehouse-2-tab' || defaultType === 'wh2' || defaultType === 'wh2_fixed_id') ? 'wh2_fixed_id' : 'wh1_fixed_id';
            rawWhSelect.value = whIdToUse;
            if (window.updateProductModalCategories) window.updateProductModalCategories(whIdToUse);
        }

        openModal('add-product-modal');
    };

    window.openEditUnifiedProductModal = function(id) {
        document.getElementById('product-form')?.reset();
        document.getElementById('prod-id').value = id;

        if (window.toggleInlineAddCategory) toggleInlineAddCategory(false);

        document.getElementById('prod-modal-title').textContent = 'تعديل بيانات المنتج ✏️';
        document.getElementById('prod-submit-btn').innerHTML = '<span>تحديث وحفظ التعديلات</span> <span>✅</span>';

        const ing = Store.getIngredients().find(i => i.id === id);
        if (!ing) return;

        document.getElementById('prod-name').value = ing.name || '';
        document.getElementById('prod-raw-warehouse-select').value = ing.warehouseId || 'wh1_fixed_id';
        if (window.updateProductModalCategories) window.updateProductModalCategories(ing.warehouseId || 'wh1_fixed_id', ing.categoryId);
        document.getElementById('prod-raw-category-select').value = ing.categoryId || '';
        document.getElementById('prod-raw-unit').value = ing.unit || 'piece';
        document.getElementById('prod-raw-min-threshold').value = ing.minThreshold || 5;
        document.getElementById('prod-cost-price').value = ing.costPrice || 0;
        document.getElementById('prod-raw-has-expiry').value = (ing.hasExpiry === 'no' || ing.hasExpiry === false) ? 'no' : 'yes';

        openModal('add-product-modal');
    };

    window.deleteUnifiedProduct = function(id) {
        const isUsedInRecipe = Store.getRecipes().some(r => r.ingredients.some(ri => ri.ingredientId === id));
        if (isUsedInRecipe) {
            alert('لا يمكن حذف هذا المنتج لأنه مستخدم في وصفات حالية.');
            return;
        }
        if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
            Store.deleteIngredient(id);
            renderAll();
            showToast('تم حذف المنتج بنجاح! 🗑️');
        }
    };

    document.getElementById('product-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const name = document.getElementById('prod-name').value.trim();
        const warehouseId = document.getElementById('prod-raw-warehouse-select').value || 'wh1_fixed_id';
        const categoryId = document.getElementById('prod-raw-category-select').value;
        const unit = document.getElementById('prod-raw-unit').value;
        const minThreshold = parseFloat(document.getElementById('prod-raw-min-threshold').value) || 5;
        const costPrice = parseFloat(document.getElementById('prod-cost-price')?.value) || 0;
        const hasExpiry = document.getElementById('prod-raw-has-expiry').value;

        if (!name) {
            alert('يرجى إدخال اسم المنتج!');
            return;
        }

        if (!categoryId) {
            alert('يرجى اختيار فئة المنتج أو إنشاء فئة جديدة من الزر أعلاه.');
            return;
        }

        Store.saveIngredient({
            id: id ? id : undefined,
            name,
            categoryId,
            warehouseId,
            unit,
            minThreshold,
            costPrice,
            hasExpiry
        });

        closeModal('add-product-modal');
        renderAll();
        showToast(`تم حفظ المنتج (${name}) بنجاح! 📦✅`);
    });

    document.getElementById('prod-filter-category')?.addEventListener('change', renderProductsTab);
    document.getElementById('prod-filter-warehouse')?.addEventListener('change', renderProductsTab);
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

    window.selectPurchasesNavTab = function(tabId) {
        const purMenu = document.getElementById('purchases-dropdown-menu');
        const purChevron = document.getElementById('purchases-dropdown-chevron');
        if (purMenu) {
            purMenu.style.display = 'none';
            purMenu.classList.add('hidden');
        }
        if (purChevron) purChevron.style.transform = 'rotate(0deg)';

        switchTab(tabId);

        if (tabId === 'purchases-tab') {
            renderPurchasesTab();
        } else if (tabId === 'external-purchases-tab') {
            renderExternalPurchasesTab();
        }
    };

    window.togglePurchasesDropdown = function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const purMenu = document.getElementById('purchases-dropdown-menu');
        const purChevron = document.getElementById('purchases-dropdown-chevron');
        if (!purMenu) return;

        // Close other dropdown if open
        const invMenu = document.getElementById('inventory-dropdown-menu');
        const invChevron = document.getElementById('inventory-dropdown-chevron');
        if (invMenu) {
            invMenu.style.display = 'none';
            invMenu.classList.add('hidden');
        }
        if (invChevron) invChevron.style.transform = 'rotate(0deg)';

        const isVisible = (purMenu.style.display === 'block' || (!purMenu.classList.contains('hidden') && purMenu.style.display !== 'none'));
        if (isVisible) {
            purMenu.style.display = 'none';
            purMenu.classList.add('hidden');
            if (purChevron) purChevron.style.transform = 'rotate(0deg)';
        } else {
            purMenu.style.display = 'block';
            purMenu.classList.remove('hidden');
            if (purChevron) purChevron.style.transform = 'rotate(180deg)';
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

        // Close purchases dropdown if open
        const purMenu = document.getElementById('purchases-dropdown-menu');
        const purChevron = document.getElementById('purchases-dropdown-chevron');
        if (purMenu) {
            purMenu.style.display = 'none';
            purMenu.classList.add('hidden');
        }
        if (purChevron) purChevron.style.transform = 'rotate(0deg)';

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

    // Close desktop dropdowns on click outside
    document.addEventListener('click', (e) => {
        const invWrapper = document.getElementById('inventory-dropdown-wrapper');
        const invMenu = document.getElementById('inventory-dropdown-menu');
        const invChevron = document.getElementById('inventory-dropdown-chevron');
        if (invMenu && (invMenu.style.display === 'block' || !invMenu.classList.contains('hidden'))) {
            if (invWrapper && !invWrapper.contains(e.target)) {
                invMenu.style.display = 'none';
                invMenu.classList.add('hidden');
                if (invChevron) invChevron.style.transform = 'rotate(0deg)';
            }
        }

        const purWrapper = document.getElementById('purchases-dropdown-wrapper');
        const purMenu = document.getElementById('purchases-dropdown-menu');
        const purChevron = document.getElementById('purchases-dropdown-chevron');
        if (purMenu && (purMenu.style.display === 'block' || !purMenu.classList.contains('hidden'))) {
            if (purWrapper && !purWrapper.contains(e.target)) {
                purMenu.style.display = 'none';
                purMenu.classList.add('hidden');
                if (purChevron) purChevron.style.transform = 'rotate(0deg)';
            }
        }
    });

    // ================= 7. INDEPENDENT WAREHOUSE SECTIONS (مخزن المشتريات المحلية & مخزن المشتريات الخارجية) =================
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
                targetWh = warehouses[0] || { id: 'wh1_fixed_id', name: 'مخزن المشتريات المحلية', categoryIds: ["cat_1", "cat_2", "cat_3", "cat_4", "cat_5", "cat_6", "cat_7", "cat_8", "cat_9", "cat_10"] };
            } else {
                targetWh = warehouses[1] || { id: 'wh2_fixed_id', name: 'مخزن المشتريات الخارجية', categoryIds: ["cat_wh2_syrup", "cat_wh2_topping", "cat_wh2_drinkware", "cat_wh2_foodpack", "cat_wh2_dry", "cat_wh2_frozen", "cat_wh2_dairy", "cat_wh2_coffee", "cat_wh2_tea"] };
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
                const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + ing.unit) : '';
                    const unitName = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (ing.unit || 'حبة');

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
                                <p class="text-xs text-slate-500 mt-0.5">متابعة المواد والكميات المسحوبة من مخزن المشتريات الخارجية والموزعة على أرفف الفروع (طحنه، كثيب، زعفل)</p>
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
                <span>📦 الرصيد المسجل بالمخزن المشتريات الخارجية: <strong class="text-slate-900">${rem} ${unit}</strong></span>
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

        // ================= SHELVES WAREHOUSE TAB (إدارة ومتابعة مخزن الأرفف وسجل السحب) =================
    window.activeShelfSubTab = window.activeShelfSubTab || 'inventory'; // 'inventory' or 'transfers'

    window.setShelfSubTab = function(subTab) {
        window.activeShelfSubTab = subTab;
        renderShelvesTab();
    };

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

        const activeSubTab = window.activeShelfSubTab || 'inventory';
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

        // Calculate shelf quantities (Transfers + Opening Balances from Last Month)
        const monthKey = getCurrentMonthKey();
        const openingBalances = Store.getOpeningBalances(monthKey) || {};

        const shelfItems = wh2Ingredients.map(ing => {
            const itemTransfers = allTransfers.filter(t => t.ingredientId === ing.id);

            const tahnahTransferred = itemTransfers.filter(t => t.branch === 'tahnah').reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);
            const katheebTransferred = itemTransfers.filter(t => t.branch === 'katheeb').reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);
            const zafalTransferred = itemTransfers.filter(t => t.branch === 'zafal').reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);

            const tahnahOpening = parseFloat(openingBalances['shelf-tahnah']?.[ing.id] || openingBalances['tahnah']?.[ing.id] || 0);
            const katheebOpening = parseFloat(openingBalances['shelf-katheeb']?.[ing.id] || openingBalances['katheeb']?.[ing.id] || 0);
            const zafalOpening = parseFloat(openingBalances['shelf-zafal']?.[ing.id] || openingBalances['zafal']?.[ing.id] || 0);

            const tahnahTotal = tahnahOpening + tahnahTransferred;
            const katheebTotal = katheebOpening + katheebTransferred;
            const zafalTotal = zafalOpening + zafalTransferred;
            const allShelvesTotal = tahnahTotal + katheebTotal + zafalTotal;

            let currentBranchQty = allShelvesTotal;
            if (activeBranch === 'tahnah') currentBranchQty = tahnahTotal;
            else if (activeBranch === 'katheeb') currentBranchQty = katheebTotal;
            else if (activeBranch === 'zafal') currentBranchQty = zafalTotal;

            const shelfThreshold = parseFloat(ing.minShelfThreshold) || parseFloat(ing.minThreshold) || 5;
            const whThreshold = parseFloat(ing.minWarehouseThreshold) || parseFloat(ing.minThreshold) || 20;
            const whRemaining = parseFloat(inventory[ing.id]?.remaining) || 0;

            return {
                ...ing,
                currentBranchQty,
                tahnahTransferred: tahnahTotal,
                katheebTransferred: katheebTotal,
                zafalTransferred: zafalTotal,
                totalTransferredAll: allShelvesTotal,
                shelfThreshold,
                whThreshold,
                whRemaining
            };
        });

        // Filter items for stock table
        let displayShelfItems = shelfItems;
        if (activeCategory !== 'all') {
            displayShelfItems = displayShelfItems.filter(i => i.categoryId === activeCategory);
        }
        if (searchQuery) {
            displayShelfItems = displayShelfItems.filter(i => (i.name || '').toLowerCase().includes(searchQuery));
        }

        // Filter items for transfers history
        const activeTransferBranchFilter = window.shelfTransferFilter || 'all';
        let filteredTransfers = allTransfers.slice().reverse();
        if (activeTransferBranchFilter !== 'all') {
            filteredTransfers = filteredTransfers.filter(t => t.branch === activeTransferBranchFilter);
        }
        if (searchQuery && activeSubTab === 'transfers') {
            filteredTransfers = filteredTransfers.filter(t => {
                const ing = ingredients.find(i => i.id === t.ingredientId);
                const name = ing ? ing.name.toLowerCase() : '';
                return name.includes(searchQuery) || (t.transferredBy || '').toLowerCase().includes(searchQuery) || (t.discrepancyReason || '').toLowerCase().includes(searchQuery);
            });
        }

        // Stats calculation
        const totalItemsCount = wh2Ingredients.length;
        const totalQtyOnShelves = shelfItems.reduce((acc, i) => acc + (parseFloat(i.currentBranchQty) || 0), 0);
        const lowStockShelfCount = shelfItems.filter(i => i.currentBranchQty <= i.shelfThreshold).length;

        container.innerHTML = `
            <div class="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 hover:shadow-md transition space-y-6">
                <!-- 1. Header with Title, Top Sub-Nav Buttons & Action -->
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-5 border-b border-slate-100">
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
                                <span class="badge-pill bg-amber-50 text-amber-900 border border-amber-200 font-bold">🚚 المتوفر على الرفوف: ${totalQtyOnShelves.toFixed(1)}</span>
                                <span class="badge-pill bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold">📜 حركات السحب المسجلة: ${allTransfers.length}</span>
                                ${lowStockShelfCount > 0 ? `
                                    <span class="badge-pill bg-rose-50 text-rose-700 border border-rose-200 font-bold animate-pulse">⚠️ ${lowStockShelfCount} مواد تحت حد الرف</span>
                                ` : '<span class="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">✅ جميع الرفوف ممتلئة</span>'}
                            </div>
                        </div>
                    </div>

                    <!-- Top Direct Action Buttons -->
                    <div class="flex items-center gap-2.5 w-full lg:w-auto flex-wrap">
                        <button onclick="openTransferShelfModal(null, '${activeBranch !== 'all' ? activeBranch : 'tahnah'}')" class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black px-5 py-3 rounded-2xl shadow-md hover:shadow-lg text-sm transition flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5">
                            <span class="text-base">➕</span> <span>تسجيل سحب جديد للرف</span>
                        </button>
                        <button onclick="switchTab('stocktake-tab'); if(typeof switchStocktakeSection==='function') switchStocktakeSection('shelves');" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-3 rounded-2xl border border-indigo-200 text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer">
                            <span>📋</span> <span>الجرد الشهري</span>
                        </button>
                    </div>
                </div>

                <!-- 2. TOP LEVEL MODE TABS: [📦 أرصدة وكميات الأرفف] vs [📜 سجل عمليات السحب والنقل] -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-amber-500/10 via-slate-50 to-indigo-50/50 p-2.5 rounded-2xl border border-amber-200/80">
                    <div class="flex items-center gap-2 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs w-full sm:w-auto">
                        <button onclick="setShelfSubTab('inventory')" class="flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-2 ${activeSubTab === 'inventory' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}">
                            <span>📦</span> <span>أرصدة وكميات الأرفف</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] ${activeSubTab === 'inventory' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}">(${wh2Ingredients.length})</span>
                        </button>
                        <button onclick="setShelfSubTab('transfers')" class="flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-2 ${activeSubTab === 'transfers' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}">
                            <span>📜</span> <span>سجل عمليات السحب والنقل</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] ${activeSubTab === 'transfers' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900 font-bold'}">(${allTransfers.length})</span>
                        </button>
                    </div>

                    <!-- Search Input -->
                    <div class="relative w-full sm:w-72">
                        <input type="text" value="${searchQuery}" oninput="setShelfSearchQuery(this.value)" placeholder="${activeSubTab === 'inventory' ? '🔍 بحث في مواد وأرفف المحلات...' : '🔍 بحث في سجل السحب والتوريد...'}" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-2xs">
                    </div>
                </div>

                ${activeSubTab === 'inventory' ? `
                    <!-- ================= VIEW 1: SHELF INVENTORY TABLE ================= -->
                    <!-- Branch Filter Bar -->
                    <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-bold">
                        <span class="text-slate-500 whitespace-nowrap">🏬 تصفية حسب الفرع:</span>
                        <button onclick="setShelfBranchFilter('all')" class="px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeBranch === 'all' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🌟 جميع أرفف المحلات
                        </button>
                        <button onclick="setShelfBranchFilter('tahnah')" class="px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeBranch === 'tahnah' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🏪 رف محل طحنه
                        </button>
                        <button onclick="setShelfBranchFilter('katheeb')" class="px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeBranch === 'katheeb' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🏪 رف محل كثيب
                        </button>
                        <button onclick="setShelfBranchFilter('zafal')" class="px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeBranch === 'zafal' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                            🏪 رف محل زعفل
                        </button>
                    </div>

                    <!-- Category Filter Chips -->
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

                    <!-- Shelves Inventory Table -->
                    <div class="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                        <table class="w-full text-right text-xs">
                            <thead class="bg-amber-50/60 text-amber-900 font-black border-b border-amber-200">
                                <tr>
                                    <th class="px-4 py-3.5">المادة / المنتج</th>
                                    <th class="px-4 py-3.5">الفئة</th>
                                    <th class="px-4 py-3.5">الرف / المحل</th>
                                    <th class="px-4 py-3.5 bg-amber-100/60 text-amber-950 font-black">الكمية على الرف</th>
                                    <th class="px-4 py-3.5">حد الرف الأدنى</th>
                                    <th class="px-4 py-3.5">المتوفر بالستور الرئيسي</th>
                                    <th class="px-4 py-3.5">حالة الرف</th>
                                    <th class="px-4 py-3.5 text-center">إجراء السحب</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                ${displayShelfItems.length === 0 ? `
                                    <tr>
                                        <td colspan="8" class="text-center py-12 text-slate-400 font-bold">
                                            <div class="text-4xl mb-2">🏪</div>
                                            <p class="text-sm font-bold text-slate-600">لا توجد مواد مطابقة في أرفف المحلات حالياً.</p>
                                        </td>
                                    </tr>
                                ` : displayShelfItems.map(ing => {
                                    const cat = categories.find(c => c.id === ing.categoryId);
                                    const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + ing.unit) : '';
                    const unitName = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (ing.unit || 'حبة');

                                    let statusBadge = '';
                                    if (ing.currentBranchQty <= 0) {
                                        statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">❌ الرف فارغ</span>';
                                    } else if (ing.currentBranchQty <= ing.shelfThreshold) {
                                        statusBadge = `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">⚠️ تعبئة (${ing.currentBranchQty}/${ing.shelfThreshold})</span>`;
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
                                            <td class="px-4 py-3 font-black text-amber-900 bg-amber-50/40 text-sm">${ing.currentBranchQty} ${unitName}</td>
                                            <td class="px-4 py-3 font-bold text-slate-600 text-xs">${ing.shelfThreshold} ${unitName}</td>
                                            <td class="px-4 py-3 font-black text-slate-700 text-xs">${ing.whRemaining} ${unitName}</td>
                                            <td class="px-4 py-3">${statusBadge}</td>
                                            <td class="px-4 py-3 text-center">
                                                <button onclick="openTransferShelfModal('${ing.id}', '${activeBranch !== 'all' ? activeBranch : 'tahnah'}')" class="text-amber-800 hover:text-white hover:bg-amber-600 font-black text-xs cursor-pointer px-3.5 py-1.5 bg-amber-100/80 rounded-xl border border-amber-300 transition flex items-center justify-center gap-1 mx-auto shadow-2xs" title="سحب وتزويد الرف من مخزن المشتريات الخارجية">
                                                    <span>📦</span> <span>سحب للرف</span>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <!-- ================= VIEW 2: SHELF TRANSFERS HISTORY LOG (DIRECT TOP VIEW) ================= -->
                    <div class="space-y-4">
                        <!-- Sub Branch History Filter Tabs -->
                        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold max-w-full">
                                <span class="text-slate-500 whitespace-nowrap">🏬 تصفية السجل:</span>
                                <button onclick="setShelfTransferFilter('all')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeTransferBranchFilter === 'all' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                                    🌟 جميع الرفوف (${allTransfers.length})
                                </button>
                                <button onclick="setShelfTransferFilter('tahnah')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeTransferBranchFilter === 'tahnah' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                                    🏪 رف محل طحنه (${allTransfers.filter(t => t.branch === 'tahnah').length})
                                </button>
                                <button onclick="setShelfTransferFilter('katheeb')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeTransferBranchFilter === 'katheeb' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                                    🏪 رف محل كثيب (${allTransfers.filter(t => t.branch === 'katheeb').length})
                                </button>
                                <button onclick="setShelfTransferFilter('zafal')" class="px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${activeTransferBranchFilter === 'zafal' ? 'bg-amber-500 text-white shadow-2xs font-black' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
                                    🏪 رف محل زعفل (${allTransfers.filter(t => t.branch === 'zafal').length})
                                </button>
                            </div>
                            <span class="text-xs font-bold text-slate-500">عدد العمليات: ${filteredTransfers.length}</span>
                        </div>

                        <!-- Shelf Transfers History Table -->
                        <div class="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                            <table class="w-full text-right text-xs">
                                <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                    <tr>
                                        <th class="px-4 py-3">التاريخ والوقت</th>
                                        <th class="px-4 py-3">المحل / الرف المستهدف</th>
                                        <th class="px-4 py-3">المادة المسحوبة</th>
                                        <th class="px-4 py-3 text-amber-900 font-black">الكمية المسحوبة</th>
                                        <th class="px-4 py-3">فحص رصيد الستور (فعلي / مسجل)</th>
                                        <th class="px-4 py-3">مطابقة الرصيد / سبب الفرق</th>
                                        <th class="px-4 py-3">المسؤول عن السحب</th>
                                        <th class="px-4 py-3 text-center">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-medium">
                                    ${filteredTransfers.length === 0 ? `
                                        <tr>
                                            <td colspan="8" class="text-center py-14 text-slate-400 font-bold">
                                                <div class="text-4xl mb-2">📦</div>
                                                <p class="text-sm font-bold text-slate-600 mb-2">لا توجد حركات سحب مسجلة لرفوف المحلات حتى الآن.</p>
                                                <button onclick="openTransferShelfModal(null, '${activeBranch !== 'all' ? activeBranch : 'tahnah'}')" class="mt-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs">
                                                    <span>➕</span> <span>تسجيل أول حركة سحب للرف الآن</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ` : filteredTransfers.map(t => {
                                        const ing = ingredients.find(i => i.id === t.ingredientId);
                                        const unitName = ing ? ((typeof getI18nText === 'function' ? getI18nText('unit_' + ing.unit) : ing.unit) || ing.unit) : '';
                                        const dateStr = t.date ? new Date(t.date).toLocaleString('ar-OM', { dateStyle: 'medium', timeStyle: 'short' }) : 'غير محدد';
                                        const hasDiscrepancy = Math.abs(parseFloat(t.discrepancy || 0)) >= 0.0001;

                                        return `
                                            <tr class="hover:bg-slate-50 transition">
                                                <td class="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">${dateStr}</td>
                                                <td class="px-4 py-3 font-bold">
                                                    <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] border ${branchMap[t.branch]?.cls || 'bg-slate-100 text-slate-700'}">
                                                        <span>🏪</span> <span>${branchMap[t.branch]?.name || t.branch}</span>
                                                    </span>
                                                </td>
                                                <td class="px-4 py-3 font-bold text-slate-900">${ing ? ing.name : 'مادة محذوفة'}</td>
                                                <td class="px-4 py-3 font-black text-amber-900 bg-amber-50/50 text-sm">
                                                    -${t.quantity} ${unitName}
                                                </td>
                                                <td class="px-4 py-3 text-slate-600 text-xs">
                                                    فعلي: <strong class="text-slate-900">${t.actualStockBeforePull ?? '-'}</strong> / مسجل: <strong>${t.systemStockBeforePull ?? '-'}</strong> ${unitName}
                                                </td>
                                                <td class="px-4 py-3">
                                                    ${hasDiscrepancy ? `
                                                        <div class="flex flex-col gap-0.5">
                                                            <span class="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                                                ⚠️ فرق: ${t.discrepancy > 0 ? '+' : ''}${t.discrepancy} ${unitName}
                                                            </span>
                                                            <span class="text-[10px] text-slate-500 italic max-w-xs truncate" title="${t.discrepancyReason || ''}">
                                                                ${t.discrepancyReason || 'تمت التسوية'}
                                                            </span>
                                                        </div>
                                                    ` : `
                                                        <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            ✅ مطابق
                                                        </span>
                                                    `}
                                                </td>
                                                <td class="px-4 py-3 text-slate-700 text-xs font-bold">${t.transferredBy || 'المشرف'}</td>
                                                <td class="px-4 py-3 text-center">
                                                    <button onclick="deleteShelfTransferRecord('${t.id}')" class="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer" title="حذف حركة السحب">
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `}
            </div>
        `;
    }


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

    // ================= SIDEBAR NAVIGATION & SEARCH HELPERS =================
    window.toggleSidebarAccordion = function(accId) {
        const content = document.getElementById(accId + '-content');
        const chevron = document.getElementById(accId + '-chevron');
        if (!content) return;

        const isHidden = content.classList.contains('hidden') || content.style.display === 'none';
        if (isHidden) {
            content.classList.remove('hidden');
            content.style.display = 'block';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('hidden');
            content.style.display = 'none';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    };

    window.toggleSidebarMenu = function() {
        const navContainer = document.getElementById('sidebar-nav-container');
        const toggleIcon = document.getElementById('mobile-sidebar-toggle-icon');
        if (!navContainer) return;

        if (navContainer.classList.contains('hidden') || navContainer.style.display === 'none') {
            navContainer.classList.remove('hidden');
            navContainer.style.display = 'block';
            navContainer.classList.add('mobile-open');
            if (toggleIcon) toggleIcon.textContent = '✕';
        } else {
            navContainer.classList.add('hidden');
            navContainer.style.display = 'none';
            navContainer.classList.remove('mobile-open');
            if (toggleIcon) toggleIcon.textContent = '☰';
        }
    };

    window.filterSidebarNav = function(query) {
        const q = (query || '').trim().toLowerCase();
        const navBtns = document.querySelectorAll('.sidebar-nav-btn');
        const accordions = document.querySelectorAll('.sidebar-accordion');
        const groups = document.querySelectorAll('.nav-group');

        if (!q) {
            navBtns.forEach(btn => btn.style.display = 'flex');
            accordions.forEach(acc => {
                const content = acc.querySelector('[id$="-content"]');
                if (content) {
                    content.classList.remove('hidden');
                    content.style.display = 'block';
                }
            });
            groups.forEach(g => g.style.display = 'block');
            return;
        }

        navBtns.forEach(btn => {
            const text = (btn.textContent || '').toLowerCase();
            const match = text.includes(q);
            btn.style.display = match ? 'flex' : 'none';

            // If match inside accordion, make sure accordion is open
            if (match) {
                const parentAccordion = btn.closest('.sidebar-accordion');
                if (parentAccordion) {
                    const content = parentAccordion.querySelector('[id$="-content"]');
                    if (content) {
                        content.classList.remove('hidden');
                        content.style.display = 'block';
                    }
                }
            }
        });
    };

    


    // ================= 9. MONTHLY STOCKTAKE CONTROLLER & RENDERING =================
    window.activeStocktakeSection = window.activeStocktakeSection || 'wh1';
    window.activeStocktakeShelf = window.activeStocktakeShelf || 'tahnah';

    window.switchStocktakeSection = function(section) {
        window.activeStocktakeSection = section;

        const tabs = {
            wh1: document.getElementById('st-main-tab-wh1'),
            shelves: document.getElementById('st-main-tab-shelves'),
            wh2: document.getElementById('st-main-tab-wh2')
        };
        const panels = {
            wh1: document.getElementById('st-section-wh1'),
            shelves: document.getElementById('st-section-shelves'),
            wh2: document.getElementById('st-section-wh2')
        };

        Object.keys(tabs).forEach(k => {
            if (tabs[k]) {
                if (k === section) {
                    tabs[k].className = 'st-section-tab active px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition flex items-center gap-2 bg-white text-indigo-900 shadow-2xs';
                } else {
                    tabs[k].className = 'st-section-tab px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:text-slate-900 transition flex items-center gap-2';
                }
            }
            if (panels[k]) {
                if (k === section) {
                    panels[k].classList.remove('hidden');
                } else {
                    panels[k].classList.add('hidden');
                }
            }
        });

        renderStocktakeTab();
    };

    window.switchStocktakeShelf = function(shelfBranch) {
        window.activeStocktakeShelf = shelfBranch;

        const shelfBtns = {
            tahnah: document.getElementById('st-shelf-tab-tahnah'),
            katheeb: document.getElementById('st-shelf-tab-katheeb'),
            zafal: document.getElementById('st-shelf-tab-zafal')
        };

        Object.keys(shelfBtns).forEach(k => {
            if (shelfBtns[k]) {
                if (k === shelfBranch) {
                    shelfBtns[k].className = 'st-shelf-btn active flex-1 py-2 rounded-xl font-black text-xs sm:text-sm transition bg-white text-indigo-900 shadow-2xs text-center';
                } else {
                    shelfBtns[k].className = 'st-shelf-btn flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm transition text-slate-600 hover:text-slate-900 text-center';
                }
            }
        });

        renderStocktakeTab();
    };

    function renderStocktakeTab() {
        const ingredients = Store.getIngredients();
        const categories = Store.getCategories();
        const warehouses = Store.getWarehouses();
        const inventory = calculateInventory('all', 'all');
        const monthKey = getCurrentMonthKey();

        // Month Names in Arabic
        const monthNamesAr = {
            '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
            '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
            '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
        };
        const [curYear, curMonth] = monthKey.split('-');
        const monthArName = (monthNamesAr[curMonth] || curMonth) + ' ' + curYear;

        // 1. Update Month Labels
        const lblWh1 = document.getElementById('st-wh1-month-label');
        if (lblWh1) lblWh1.textContent = `كشف جرد مواد مخزن المشتريات المحلية - لشهر: ${monthArName}`;

        const lblWh2 = document.getElementById('st-wh2-month-label');
        if (lblWh2) lblWh2.textContent = `كشف جرد مواد مخزن المشتريات الخارجية - لشهر: ${monthArName}`;

        const branchNames = { tahnah: 'طحنه', katheeb: 'كثيب', zafal: 'زعفل' };
        const lblShelf = document.getElementById('st-shelf-active-label');
        if (lblShelf) {
            lblShelf.textContent = `كشف جرد رف ${branchNames[window.activeStocktakeShelf] || 'المحل'} (شامل كافة مواد المشتريات المحلية والمشتريات الخارجية) - لشهر: ${monthArName}`;
        }

        // Get Existing Saved Draft
        const stocktakes = Store.getStocktakes() || [];
        const currentDraft = stocktakes.find(s => s.monthKey === monthKey) || { wh1: {}, wh2: {}, shelves: {} };

        const wh1 = warehouses.find(w => w.id === 'wh1_fixed_id') || warehouses[0] || { id: 'wh1_fixed_id' };
        const wh2 = warehouses.find(w => w.id === 'wh2_fixed_id') || warehouses[1] || { id: 'wh2_fixed_id' };

        const wh1Ingredients = ingredients.filter(i => i.warehouseId === 'wh1_fixed_id' || i.warehouseId === 'wh1' || (wh1.categoryIds && wh1.categoryIds.includes(i.categoryId)));
        const wh2Ingredients = ingredients.filter(i => i.warehouseId === 'wh2_fixed_id' || i.warehouseId === 'wh2' || (wh2.categoryIds && wh2.categoryIds.includes(i.categoryId)));

        // ================= A. RENDER WAREHOUSE 1 TABLE =================
        const wh1Body = document.getElementById('stocktake-wh1-body');
        if (wh1Body) {
            if (wh1Ingredients.length === 0) {
                wh1Body.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 font-bold">لا توجد مواد في مخزن المشتريات المحلية</td></tr>`;
            } else {
                wh1Body.innerHTML = wh1Ingredients.map(ing => {
                    const rem = inventory[ing.id]?.remaining || 0;
                    const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + ing.unit) : '';
                    const unitName = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (ing.unit || 'حبة');
                    const draftItem = currentDraft.wh1?.[ing.id] || {};
                    const actualVal = draftItem.actual !== undefined ? draftItem.actual : '';
                    const reasonVal = draftItem.reason || '';
                    const isConfirmed = !!draftItem.confirmed;

                    return `
                        <tr class="hover:bg-slate-50 transition" data-ing-id="${ing.id}">
                            <td class="px-4 py-3 font-bold text-slate-900 text-sm">
                                ${ing.name}
                                <span class="block text-[11px] text-slate-400 font-normal">الوحدة: ${unitName}</span>
                            </td>
                            <td class="px-4 py-3 font-black text-indigo-900 bg-indigo-50/30 text-sm">
                                <span id="st-wh1-sys-${ing.id}">${rem}</span> ${unitName}
                            </td>
                            <td class="px-4 py-3 bg-emerald-50/30">
                                <input type="number" step="any" min="0" value="${actualVal}" placeholder="${rem}" 
                                    oninput="calculateStocktakeRowMatch('wh1', '${ing.id}', ${rem})"
                                    id="st-wh1-act-${ing.id}" 
                                    class="w-full bg-white border border-emerald-300 rounded-xl p-2 font-black text-emerald-950 text-center text-sm focus:border-emerald-600 focus:outline-none shadow-2xs">
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex flex-col gap-1">
                                    <div id="st-wh1-status-${ing.id}" class="text-xs font-bold">
                                        ${actualVal === '' ? '<span class="text-slate-400">بانتظار إدخال العد الفعلي...</span>' : 
                                          (Math.abs(parseFloat(actualVal) - rem) < 0.0001 ? '<span class="text-emerald-700 font-black">✅ مطابق تماماً</span>' : 
                                          `<span class="text-rose-700 font-black">⚠️ يوجد فرق: ${(parseFloat(actualVal) - rem) > 0 ? '+' : ''}${(parseFloat(actualVal) - rem).toFixed(2)}</span>`)}
                                    </div>
                                    <input type="text" id="st-wh1-reason-${ing.id}" value="${reasonVal}" placeholder="اكتب سبب الفرق أو ملاحظات الجرد..." 
                                        class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:border-indigo-500">
                                </div>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <label class="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" id="st-wh1-conf-${ing.id}" ${isConfirmed ? 'checked' : ''} class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500">
                                    <span class="text-xs font-bold text-slate-700">معتمد</span>
                                </label>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // ================= B. RENDER WAREHOUSE 2 TABLE =================
        const wh2Body = document.getElementById('stocktake-wh2-body');
        if (wh2Body) {
            if (wh2Ingredients.length === 0) {
                wh2Body.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400 font-bold">لا توجد مواد في مخزن المشتريات الخارجية</td></tr>`;
            } else {
                wh2Body.innerHTML = wh2Ingredients.map(ing => {
                    const rem = inventory[ing.id]?.remaining || 0;
                    const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + ing.unit) : '';
                    const unitName = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (ing.unit || 'حبة');
                    const draftItem = currentDraft.wh2?.[ing.id] || {};
                    const actualVal = draftItem.actual !== undefined ? draftItem.actual : '';
                    const reasonVal = draftItem.reason || '';
                    const isConfirmed = !!draftItem.confirmed;

                    return `
                        <tr class="hover:bg-slate-50 transition" data-ing-id="${ing.id}">
                            <td class="px-4 py-3 font-bold text-slate-900 text-sm">
                                ${ing.name}
                                <span class="block text-[11px] text-slate-400 font-normal">الوحدة: ${unitName}</span>
                            </td>
                            <td class="px-4 py-3 font-black text-indigo-900 bg-indigo-50/30 text-sm">
                                <span id="st-wh2-sys-${ing.id}">${rem}</span> ${unitName}
                            </td>
                            <td class="px-4 py-3 bg-emerald-50/30">
                                <input type="number" step="any" min="0" value="${actualVal}" placeholder="${rem}" 
                                    oninput="calculateStocktakeRowMatch('wh2', '${ing.id}', ${rem})"
                                    id="st-wh2-act-${ing.id}" 
                                    class="w-full bg-white border border-emerald-300 rounded-xl p-2 font-black text-emerald-950 text-center text-sm focus:border-emerald-600 focus:outline-none shadow-2xs">
                            </td>
                            <td class="px-4 py-3">
                                <div class="flex flex-col gap-1">
                                    <div id="st-wh2-status-${ing.id}" class="text-xs font-bold">
                                        ${actualVal === '' ? '<span class="text-slate-400">بانتظار إدخال العد الفعلي...</span>' : 
                                          (Math.abs(parseFloat(actualVal) - rem) < 0.0001 ? '<span class="text-emerald-700 font-black">✅ مطابق تماماً</span>' : 
                                          `<span class="text-rose-700 font-black">⚠️ يوجد فرق: ${(parseFloat(actualVal) - rem) > 0 ? '+' : ''}${(parseFloat(actualVal) - rem).toFixed(2)}</span>`)}
                                    </div>
                                    <input type="text" id="st-wh2-reason-${ing.id}" value="${reasonVal}" placeholder="اكتب سبب الفرق أو ملاحظات الجرد..." 
                                        class="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 focus:border-indigo-500">
                                </div>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <label class="inline-flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" id="st-wh2-conf-${ing.id}" ${isConfirmed ? 'checked' : ''} class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500">
                                    <span class="text-xs font-bold text-slate-700">معتمد</span>
                                </label>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // ================= C. RENDER SHELVES TABLE =================
        const shelvesBody = document.getElementById('stocktake-shelves-body');
        if (shelvesBody) {
            const activeBranch = window.activeStocktakeShelf || 'tahnah';
            const allTransfers = (typeof Store.getShelfTransfers === 'function' ? Store.getShelfTransfers() : []) || [];
            const openingBalances = Store.getOpeningBalances(monthKey) || {};

            // All ingredients (WH1 + WH2)
            shelvesBody.innerHTML = ingredients.map(ing => {
                const itemTransfers = allTransfers.filter(t => t.ingredientId === ing.id && t.branch === activeBranch);
                const transferredQty = itemTransfers.reduce((acc, t) => acc + (parseFloat(t.quantity) || 0), 0);

                const openQty = parseFloat(openingBalances[`shelf-${activeBranch}`]?.[ing.id] || openingBalances[activeBranch]?.[ing.id] || 0);
                const availableOnShelf = openQty + transferredQty;

                const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + ing.unit) : '';
                    const unitName = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (ing.unit || 'حبة');
                const whName = ing.warehouseId === 'wh1_fixed_id' ? 'المشتريات المحلية' : 'المشتريات الخارجية';

                const draftShelf = currentDraft.shelves?.[activeBranch]?.[ing.id] || {};
                const actualVal = draftShelf.actual !== undefined ? draftShelf.actual : '';
                const notesVal = draftShelf.notes || '';
                const isConfirmed = !!draftShelf.confirmed;

                const actualNum = parseFloat(actualVal);
                const usedQty = !isNaN(actualNum) ? Math.max(0, availableOnShelf - actualNum) : 0;
                const surplusQty = !isNaN(actualNum) ? actualNum : availableOnShelf;

                return `
                    <tr class="hover:bg-amber-50/20 transition" data-ing-id="${ing.id}">
                        <td class="px-3.5 py-3 font-bold text-slate-900">${ing.name}</td>
                        <td class="px-3.5 py-3 text-[11px] text-slate-500 font-bold">${whName}</td>
                        <td class="px-3.5 py-3 text-xs font-bold">${unitName}</td>
                        <td class="px-3.5 py-3 font-bold text-slate-600 bg-slate-50">${openQty}</td>
                        <td class="px-3.5 py-3 font-bold text-indigo-700 bg-indigo-50/30">+${transferredQty}</td>
                        <td class="px-3.5 py-3 font-black text-slate-900 bg-slate-100/60" id="st-sh-avail-${activeBranch}-${ing.id}">${availableOnShelf}</td>
                        <td class="px-3.5 py-3 bg-emerald-50/40">
                            <input type="number" step="any" min="0" value="${actualVal}" placeholder="${availableOnShelf}"
                                oninput="calculateShelfStocktakeRow('${activeBranch}', '${ing.id}', ${availableOnShelf})"
                                id="st-sh-act-${activeBranch}-${ing.id}"
                                class="w-28 bg-white border border-emerald-400 rounded-xl p-1.5 font-black text-emerald-950 text-center text-xs focus:border-emerald-600 focus:outline-none shadow-2xs">
                        </td>
                        <td class="px-3.5 py-3 font-black text-amber-900 bg-amber-50/50 text-xs" id="st-sh-used-${activeBranch}-${ing.id}">
                            ${usedQty} ${unitName}
                        </td>
                        <td class="px-3.5 py-3">
                            <input type="text" id="st-sh-notes-${activeBranch}-${ing.id}" value="${notesVal}" placeholder="ملاحظات الاستهلاك..." 
                                class="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:border-amber-500">
                        </td>
                        <td class="px-3.5 py-3 font-black text-emerald-800 bg-emerald-50/50 text-xs" id="st-sh-surplus-${activeBranch}-${ing.id}">
                            ${surplusQty} ${unitName}
                        </td>
                        <td class="px-3.5 py-3 text-center">
                            <input type="checkbox" id="st-sh-conf-${activeBranch}-${ing.id}" ${isConfirmed ? 'checked' : ''} class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500">
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ================= D. RENDER ROLLOVER HISTORY =================
        const historyBody = document.getElementById('rollover-history-body');
        if (historyBody) {
            const rollovers = (typeof Store.getMonthlyRollovers === 'function' ? Store.getMonthlyRollovers() : []) || [];
            if (rollovers.length === 0) {
                historyBody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-400 font-bold text-xs">لا يوجد أرشيف جرد شهري سابق حتى الآن</td></tr>`;
            } else {
                historyBody.innerHTML = rollovers.slice().reverse().map(r => {
                    const dateFormatted = r.date ? new Date(r.date).toLocaleString('ar-OM') : '-';
                    return `
                        <tr class="hover:bg-slate-50 transition">
                            <td class="px-4 py-2.5 font-bold text-indigo-900">${r.monthKey || '-'}</td>
                            <td class="px-4 py-2.5 text-xs text-slate-500">${dateFormatted}</td>
                            <td class="px-4 py-2.5 font-bold text-emerald-700">${r.totalSurplusItems || 0} صنف مرحل</td>
                            <td class="px-4 py-2.5 font-black font-mono text-slate-800">${parseFloat(r.totalCostValue || 0).toFixed(3)} ر.ع</td>
                            <td class="px-4 py-2.5 text-xs font-bold text-slate-700">${r.approvedBy || 'المدير العام'}</td>
                            <td class="px-4 py-2.5">
                                <span class="badge-pill bg-emerald-100 text-emerald-800 text-[10px] font-bold">معتمد ومرحل ✅</span>
                            </td>
                            <td class="px-4 py-2.5">
                                <button onclick="deleteRolloverRecord('${r.id}')" class="text-rose-500 hover:text-rose-700 p-1 font-bold text-xs">حذف 🗑️</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
    }
    window.renderStocktakeTab = renderStocktakeTab;

    window.calculateStocktakeRowMatch = function(whKey, ingId, sysQty) {
        const input = document.getElementById(`st-${whKey}-act-${ingId}`);
        const statusDiv = document.getElementById(`st-${whKey}-status-${ingId}`);
        if (!input || !statusDiv) return;

        const valStr = input.value.trim();
        if (valStr === '') {
            statusDiv.innerHTML = '<span class="text-slate-400">بانتظار إدخال العد الفعلي...</span>';
            return;
        }

        const actQty = parseFloat(valStr);
        const diff = actQty - sysQty;
        if (Math.abs(diff) < 0.0001) {
            statusDiv.innerHTML = '<span class="text-emerald-700 font-black">✅ مطابق تماماً</span>';
        } else {
            statusDiv.innerHTML = `<span class="text-rose-700 font-black">⚠️ يوجد فرق: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}</span>`;
        }
    };

    window.calculateShelfStocktakeRow = function(branch, ingId, availableQty) {
        const actInput = document.getElementById(`st-sh-act-${branch}-${ingId}`);
        const usedDiv = document.getElementById(`st-sh-used-${branch}-${ingId}`);
        const surplusDiv = document.getElementById(`st-sh-surplus-${branch}-${ingId}`);
        if (!actInput) return;

        const valStr = actInput.value.trim();
        const actQty = valStr !== '' ? parseFloat(valStr) : availableQty;
        const used = Math.max(0, availableQty - actQty);

        if (usedDiv) usedDiv.textContent = `${used.toFixed(2)}`;
        if (surplusDiv) surplusDiv.textContent = `${actQty.toFixed(2)}`;
    };

    window.saveStocktakeDraft = function() {
        const ingredients = Store.getIngredients();
        const monthKey = getCurrentMonthKey();

        const draft = {
            monthKey,
            wh1: {},
            wh2: {},
            shelves: { tahnah: {}, katheeb: {}, zafal: {} },
            updatedAt: new Date().toISOString()
        };

        // Read WH1
        ingredients.forEach(ing => {
            const act = document.getElementById(`st-wh1-act-${ing.id}`);
            const reason = document.getElementById(`st-wh1-reason-${ing.id}`);
            const conf = document.getElementById(`st-wh1-conf-${ing.id}`);
            if (act && act.value !== '') {
                draft.wh1[ing.id] = {
                    actual: parseFloat(act.value),
                    reason: reason ? reason.value.trim() : '',
                    confirmed: conf ? conf.checked : false
                };
            }
        });

        // Read WH2
        ingredients.forEach(ing => {
            const act = document.getElementById(`st-wh2-act-${ing.id}`);
            const reason = document.getElementById(`st-wh2-reason-${ing.id}`);
            const conf = document.getElementById(`st-wh2-conf-${ing.id}`);
            if (act && act.value !== '') {
                draft.wh2[ing.id] = {
                    actual: parseFloat(act.value),
                    reason: reason ? reason.value.trim() : '',
                    confirmed: conf ? conf.checked : false
                };
            }
        });

        // Read Shelves
        ['tahnah', 'katheeb', 'zafal'].forEach(branch => {
            ingredients.forEach(ing => {
                const act = document.getElementById(`st-sh-act-${branch}-${ing.id}`);
                const notes = document.getElementById(`st-sh-notes-${branch}-${ing.id}`);
                const conf = document.getElementById(`st-sh-conf-${branch}-${ing.id}`);
                if (act && act.value !== '') {
                    draft.shelves[branch][ing.id] = {
                        actual: parseFloat(act.value),
                        notes: notes ? notes.value.trim() : '',
                        confirmed: conf ? conf.checked : false
                    };
                }
            });
        });

        Store.saveStocktake(draft);
        showToast('تم حفظ مسودة الجرد بنجاح في النظام 💾✅');
    };

    window.deleteRolloverRecord = function(id) {
        if (confirm('هل أنت متأكد من حذف هذا السجل من أرشيف الجرد؟')) {
            let rollovers = (typeof Store.getMonthlyRollovers === 'function' ? Store.getMonthlyRollovers() : []) || [];
            rollovers = rollovers.filter(r => r.id !== id);
            Store._set(Store.KEYS.MONTHLY_ROLLOVERS, rollovers);
            renderStocktakeTab();
            showToast('تم حذف السجل من الأرشيف بنجاح 🗑️');
        }
    };


        
    // ================= 10. RECIPES & PRODUCTION BLUEPRINTS =================
    window.activeRecipeBranch = window.activeRecipeBranch || 'all';

    window.renderRecipesTab = function() {
        const container = document.getElementById('recipes-container') || document.getElementById('recipes-list-container');
        if (!container) return;

        const recipes = Store.getRecipes();
        const ingredients = Store.getIngredients();
        const filterBranch = window.activeRecipeBranch || 'all';
        const searchInput = document.getElementById('recipe-search-input');
        const searchQ = searchInput ? searchInput.value.trim().toLowerCase() : '';

        // Update Branch Filter Buttons styling
        ['all', 'tahnah', 'katheeb', 'zafal'].forEach(b => {
            const btn = document.getElementById('rec-filter-btn-' + b) || document.getElementById('recipe-chip-' + b);
            if (btn) {
                if (b === filterBranch) {
                    btn.className = 'rec-filter-btn px-3.5 py-2 rounded-xl font-black text-xs bg-indigo-600 text-white shadow-2xs transition cursor-pointer';
                } else {
                    btn.className = 'rec-filter-btn px-3.5 py-2 rounded-xl font-bold text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer';
                }
            }
        });

        let filtered = recipes;
        if (filterBranch !== 'all') {
            filtered = filtered.filter(r => r.branch === filterBranch || r.branch === 'all' || !r.branch);
        }
        if (searchQ) {
            filtered = filtered.filter(r => (r.name || '').toLowerCase().includes(searchQ));
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-2xs">
                    <div class="text-4xl mb-2">📖</div>
                    <p class="font-bold text-slate-700 mb-1">لا توجد وصفات مسجلة حالياً</p>
                    <p class="text-xs text-slate-400 mb-4">اضغط على زر "إنشاء وصفة جديدة" لإضافة وصفات الأطعمة والمشروبات وتحديد مكوناتها</p>
                    <button type="button" onclick="openAddRecipeModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition shadow-xs cursor-pointer">
                        + إنشاء وصفة جديدة
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(rec => {
            const branchName = rec.branch === 'tahnah' ? 'طحنه' : (rec.branch === 'katheeb' ? 'كثيب' : (rec.branch === 'zafal' ? 'زعفل' : 'جميع المحلات'));
            const branchBadgeClass = rec.branch === 'tahnah' ? 'badge-branch-tahnah' : (rec.branch === 'katheeb' ? 'badge-branch-katheeb' : (rec.branch === 'zafal' ? 'badge-branch-zafal' : 'badge-branch-all'));
            const yieldCount = parseInt(rec.yield) || 1;

            const ingRows = (rec.ingredients || []).map(ri => {
                const ing = ingredients.find(i => i.id === ri.ingredientId);
                const ingName = ing ? ing.name : 'مكون محذوف';
                const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + (ing?.unit || '')) : '';
                const unit = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (ing?.unit || 'حبة');
                return `
                    <div class="flex justify-between items-center text-xs py-1 border-b border-slate-100 last:border-0">
                        <span class="font-bold text-slate-700">📦 ${ingName}</span>
                        <span class="font-black text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md">${ri.quantityPerUnit} ${unit}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between">
                    <div class="p-4 sm:p-5">
                        <div class="flex justify-between items-start gap-2 mb-3">
                            <div>
                                <span class="badge-pill ${branchBadgeClass} text-[10px] mb-1.5 inline-block font-bold">🏪 فرع ${branchName}</span>
                                <h3 class="font-black text-slate-900 text-base leading-snug">${rec.name}</h3>
                            </div>
                            <span class="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-black text-xs flex items-center gap-1 shrink-0">
                                <span>🧁</span> <span>${yieldCount} قطع/مقدار</span>
                            </span>
                        </div>

                        ${rec.image ? `
                            <div class="w-full h-32 rounded-2xl overflow-hidden mb-3 bg-slate-100 border border-slate-100">
                                <img src="${rec.image}" alt="${rec.name}" class="w-full h-full object-cover">
                            </div>
                        ` : ''}

                        <div class="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                            <h4 class="font-bold text-slate-500 text-[11px] mb-2">المكونات المطلوبة للمقدار:</h4>
                            <div class="space-y-1">
                                ${ingRows || '<p class="text-slate-400 text-xs font-medium">لم تحدد مكونات</p>'}
                            </div>
                        </div>
                    </div>

                    <div class="p-3 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center gap-2">
                        <button type="button" onclick="editRecipe('${rec.id}')" class="flex-1 py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer">
                            <span>✏️</span> <span>تعديل</span>
                        </button>
                        <button type="button" onclick="deleteRecipe('${rec.id}')" class="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center cursor-pointer">
                            <span>🗑️</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    };

        window.openAddRecipeModal = function() {
        const form = document.getElementById('recipe-form');
        if (form) form.reset();
        const recId = document.getElementById('rec-id');
        if (recId) recId.value = '';
        const b64 = document.getElementById('rec-image-base64');
        if (b64) b64.value = '';
        const list = document.getElementById('recipe-ingredients-list');
        if (list) {
            list.innerHTML = '';
            addRecipeIngredientRow();
        }
        openModal('add-recipe-modal');
    };

    window.addRecipeIngredientRow = function(data = null) {
        const list = document.getElementById('recipe-ingredients-list');
        if (!list) return;

        const warehouses = Store.getWarehouses();
        const ingredients = Store.getIngredients();
        const rowId = 'rec-ing-row-' + Math.random().toString(36).substr(2, 9);

        let initialWhId = '';
        let initialCatId = '';
        let initialIngId = '';

        if (data && data.ingredientId) {
            initialIngId = data.ingredientId;
            const foundIng = ingredients.find(i => i.id === data.ingredientId);
            if (foundIng) {
                initialCatId = foundIng.categoryId;
                initialWhId = foundIng.warehouseId;
                if (!initialWhId) {
                    initialWhId = (foundIng.categoryId && foundIng.categoryId.startsWith('cat_wh2_')) ? 'wh2_fixed_id' : 'wh1_fixed_id';
                }
            }
        }

        const row = document.createElement('div');
        row.className = 'recipe-ing-row bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-2xs';
        row.id = rowId;

        row.innerHTML = `
            <div class="flex justify-between items-center pb-1.5 border-b border-slate-200/70">
                <span class="font-black text-xs text-indigo-900 flex items-center gap-1.5">
                    <span>🥣</span> <span>مادة خام للوصفة</span>
                </span>
                <button type="button" class="text-rose-600 hover:text-rose-800 font-bold text-xs px-2.5 py-1 rounded-xl hover:bg-rose-50 transition border border-transparent hover:border-rose-200 cursor-pointer" onclick="this.closest('.recipe-ing-row').remove()">
                    ✕ حذف المادة
                </button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                    <label class="block font-bold text-slate-700 text-[11px] mb-1">1. المخزن أولاً *</label>
                    <select class="row-wh-select w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-xs text-indigo-950 focus:border-indigo-500 shadow-2xs cursor-pointer" onchange="filterRecipeRowCategories(this)" required>
                        <option value="">-- اختر المخزن --</option>
                        <option value="wh1_fixed_id" ${initialWhId === 'wh1_fixed_id' || initialWhId === 'wh-1' ? 'selected' : ''}>🏬 مخزن المشتريات المحلية</option>
                        <option value="wh2_fixed_id" ${initialWhId === 'wh2_fixed_id' || initialWhId === 'wh-2' ? 'selected' : ''}>🏢 مخزن المشتريات الخارجية</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 text-[11px] mb-1">2. فئة المخزن *</label>
                    <select class="row-cat-select w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-xs text-slate-800 focus:border-indigo-500 shadow-2xs cursor-pointer" onchange="filterRecipeRowIngredients(this)" required disabled>
                        <option value="">اختر المخزن أولاً</option>
                    </select>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 text-[11px] mb-1">3. المادة الخام (المنتج) *</label>
                    <select class="row-ing-select w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-xs text-slate-900 focus:border-indigo-500 shadow-2xs cursor-pointer" onchange="updateRecipeRowUnitDisplay(this)" required disabled>
                        <option value="">اختر الفئة أولاً</option>
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                    <label class="block font-bold text-slate-700 text-[11px] mb-1">الكمية المطلوبة لكل مقدار *</label>
                    <input type="number" step="any" min="0.0001" class="row-qty-input w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900 text-xs shadow-2xs" placeholder="مثال: 0.5" value="${data ? data.quantityPerUnit : ''}" required>
                </div>
                <div>
                    <label class="block font-bold text-slate-700 text-[11px] mb-1">وحدة القياس</label>
                    <input type="text" class="row-unit-display w-full bg-slate-100 border border-slate-200 rounded-xl p-2 font-bold text-slate-600 text-xs" readonly value="حبة">
                </div>
            </div>
        `;

        list.appendChild(row);

        const whSelect = row.querySelector('.row-wh-select');
        if (initialWhId) {
            filterRecipeRowCategories(whSelect, initialCatId, initialIngId);
        }
    };

    window.filterRecipeRowCategories = function(whSelectEl, prefillCatId = null, prefillIngId = null) {
        const row = whSelectEl.closest('.recipe-ing-row');
        if (!row) return;
        const catSelect = row.querySelector('.row-cat-select');
        const ingSelect = row.querySelector('.row-ing-select');
        const whId = whSelectEl.value;

        const warehouses = Store.getWarehouses();
        const categories = Store.getCategories();

        if (!whId) {
            catSelect.innerHTML = '<option value="">اختر المخزن أولاً</option>';
            catSelect.disabled = true;
            ingSelect.innerHTML = '<option value="">اختر الفئة أولاً</option>';
            ingSelect.disabled = true;
            updateRecipeRowUnitDisplay(ingSelect);
            return;
        }

        const targetWh = warehouses.find(w => w.id === whId);
        let allowedCatIds = (targetWh && targetWh.categoryIds) ? targetWh.categoryIds : [];

        let filteredCats = categories.filter(c => allowedCatIds.includes(c.id));
        if (filteredCats.length === 0) {
            if (whId === 'wh1_fixed_id' || whId === 'wh-1') {
                filteredCats = categories.filter(c => !c.id.startsWith('cat_wh2_'));
            } else {
                filteredCats = categories.filter(c => c.id.startsWith('cat_wh2_'));
            }
        }

        catSelect.innerHTML = '<option value="">-- اختر الفئة --</option>' +
            filteredCats.map(c => `<option value="${c.id}" ${prefillCatId === c.id ? 'selected' : ''}>🏷️ ${c.name}</option>`).join('');
        catSelect.disabled = false;

        if (prefillCatId) {
            catSelect.value = prefillCatId;
            filterRecipeRowIngredients(catSelect, prefillIngId);
        } else {
            ingSelect.innerHTML = '<option value="">اختر الفئة أولاً</option>';
            ingSelect.disabled = true;
            updateRecipeRowUnitDisplay(ingSelect);
        }
    };

    window.filterRecipeRowIngredients = function(catSelectEl, prefillIngId = null) {
        const row = catSelectEl.closest('.recipe-ing-row');
        if (!row) return;
        const ingSelect = row.querySelector('.row-ing-select');
        const catId = catSelectEl.value;
        const ingredients = Store.getIngredients();

        if (!catId) {
            ingSelect.innerHTML = '<option value="">اختر الفئة أولاً</option>';
            ingSelect.disabled = true;
            updateRecipeRowUnitDisplay(ingSelect);
            return;
        }

        const filtered = ingredients.filter(i => i.categoryId === catId);
        if (filtered.length === 0) {
            ingSelect.innerHTML = '<option value="">لا توجد مواد مسجلة في هذه الفئة</option>';
            ingSelect.disabled = true;
            updateRecipeRowUnitDisplay(ingSelect);
        } else {
            ingSelect.innerHTML = '<option value="">-- اختر المادة الخام --</option>' +
                filtered.map(i => `<option value="${i.id}" ${prefillIngId === i.id ? 'selected' : ''}>📦 ${i.name}</option>`).join('');
            ingSelect.disabled = false;
            if (prefillIngId) {
                ingSelect.value = prefillIngId;
            }
            updateRecipeRowUnitDisplay(ingSelect);
        }
    };

    window.updateRecipeRowUnitDisplay = function(ingSelectEl) {
        const row = ingSelectEl.closest('.recipe-ing-row');
        if (!row) return;
        const unitInput = row.querySelector('.row-unit-display');
        const ingId = ingSelectEl.value;
        if (!ingId) {
            if (unitInput) unitInput.value = 'حبة';
            return;
        }
        const ing = Store.getIngredients().find(i => i.id === ingId);
        if (ing && unitInput) {
            const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + ing.unit) : '';
            unitInput.value = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (ing.unit || 'حبة');
        }
    };

        window.editRecipe = function(recipeId) {
        const rec = Store.getRecipes().find(r => r.id === recipeId);
        if (!rec) return;

        document.getElementById('rec-id').value = rec.id;
        document.getElementById('rec-name').value = rec.name;
        document.getElementById('rec-yield').value = rec.yield || 1;
        document.getElementById('rec-branch').value = rec.branch || 'tahnah';
        document.getElementById('rec-image-base64').value = rec.image || '';

        const list = document.getElementById('recipe-ingredients-list');
        list.innerHTML = '';

        if (rec.ingredients && rec.ingredients.length > 0) {
            rec.ingredients.forEach(ri => {
                addRecipeIngredientRow(ri);
            });
        } else {
            addRecipeIngredientRow();
        }

        openModal('add-recipe-modal');
    };

    window.deleteRecipe = function(recipeId) {
        if (!confirm('هل أنت متأكد من حذف هذه الوصفة نهائياً؟')) return;
        Store.deleteRecipe(recipeId);
        renderRecipesTab();
        showToast('تم حذف الوصفة بنجاح 🗑️');
    };

    // Recipe image upload preview
    document.getElementById('rec-image-input')?.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            const base64 = await getBase64(e.target.files[0]);
            document.getElementById('rec-image-base64').value = base64;
        }
    });

    // Add ingredient row button listener
    document.getElementById('add-recipe-ing-btn')?.addEventListener('click', () => {
        addRecipeIngredientRow();
    });

    // ================= RECIPE SAVE HANDLER =================
    window.saveRecipeForm = async function(event) {
        if (event && event.preventDefault) event.preventDefault();

        const nameInput = document.getElementById('rec-name');
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
            alert('⚠️ يرجى كتابة اسم المنتج / الوصفة أولاً');
            if (nameInput) nameInput.focus();
            return;
        }

        const yieldInput = document.getElementById('rec-yield');
        const yieldVal = parseInt(yieldInput ? yieldInput.value : '1') || 1;

        const branchSelect = document.getElementById('rec-branch');
        const branch = branchSelect ? branchSelect.value : 'tahnah';

        const id = document.getElementById('rec-id')?.value || '';
        const image = document.getElementById('rec-image-base64')?.value || null;

        const rows = document.querySelectorAll('.recipe-ing-row');
        const ingredients = [];

        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            const ingSelect = r.querySelector('.row-ing-select');
            const qtyInput = r.querySelector('.row-qty-input');
            const ingId = ingSelect ? ingSelect.value : '';
            const qty = parseFloat(qtyInput ? qtyInput.value : '0');

            if (!ingId) {
                alert(`⚠️ يرجى اختيار المادة الخام في السطر رقم (${i + 1})`);
                if (ingSelect) ingSelect.focus();
                return;
            }
            if (isNaN(qty) || qty <= 0) {
                alert(`⚠️ يرجى تحديد الكمية المطلوبة للمادة الخام في السطر رقم (${i + 1})`);
                if (qtyInput) qtyInput.focus();
                return;
            }

            ingredients.push({
                ingredientId: ingId,
                quantityPerUnit: qty
            });
        }

        if (ingredients.length === 0) {
            alert('⚠️ يرجى إضافة مادة خام واحدة على الأقل وتحديد الكمية قبل حفظ الوصفة');
            return;
        }

        const recipeData = {
            id: id || Store._generateId(),
            name,
            yield: yieldVal,
            branch,
            image,
            ingredients
        };

        Store.saveRecipe(recipeData);
        try {
            await Store._syncToServer();
        } catch(e) {
            console.warn("sync error on recipe save:", e);
        }

        closeModal('add-recipe-modal');
        renderRecipesTab();
        renderDashboard();
        showToast('✅ تم حفظ الوصفة بنجاح في النظام!');
    };

    // Attach submit listener to form as well
    document.getElementById('recipe-form')?.addEventListener('submit', (e) => {
        window.saveRecipeForm(e);
    });


        // ================= 11. KITCHEN ORDERS TAB =================
    window.renderOrdersTab = function() {
        const container = document.getElementById('orders-list-container');
        if (!container) return;

        const orders = Store.getProductionOrders();
        const recipes = Store.getRecipes();

        const pendingList = document.getElementById('orders-pending-list');
        const inProgressList = document.getElementById('orders-inprogress-list');
        const deliveredList = document.getElementById('orders-delivered-list');

        const filterBranch = document.getElementById('order-filter-branch')?.value || 'all';

        let filtered = orders;
        if (filterBranch !== 'all') {
            filtered = filtered.filter(o => o.branch === filterBranch);
        }

        const renderOrderCard = (order) => {
            const recipe = recipes.find(r => r.id === order.recipeId);
            const recipeName = recipe ? recipe.name : (order.recipeName || 'وصفة');
            const branchName = order.branch === 'tahnah' ? 'طحنه' : (order.branch === 'katheeb' ? 'كثيب' : 'زعفل');
            const branchClass = order.branch === 'tahnah' ? 'badge-branch-tahnah' : (order.branch === 'katheeb' ? 'badge-branch-katheeb' : 'badge-branch-zafal');

            return `
                <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="badge-pill ${branchClass} text-[10px] mb-1 font-bold">🏪 ${branchName}</span>
                            <h4 class="font-black text-slate-900 text-sm">${recipeName}</h4>
                        </div>
                        <span class="px-2 py-0.5 bg-indigo-50 text-indigo-900 rounded-lg font-black text-xs">
                            ${order.quantity} قطع
                        </span>
                    </div>
                    ${order.notes ? `<p class="text-xs text-slate-500 bg-slate-50 p-2 rounded-xl">📝 ${order.notes}</p>` : ''}
                    <div class="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                        <span>🕒 ${new Date(order.date || Date.now()).toLocaleTimeString('ar-OM', { hour: '2-digit', minute: '2-digit' })}</span>
                        <div class="flex gap-1">
                            ${order.status === 'pending' ? `
                                <button type="button" onclick="updateOrderStatus('${order.id}', 'in_progress')" class="px-2.5 py-1 bg-amber-500 text-white rounded-lg font-bold text-xs hover:bg-amber-600 transition">
                                    بدء التحضير ⏳
                                </button>
                            ` : ''}
                            ${order.status === 'in_progress' ? `
                                <button type="button" onclick="updateOrderStatus('${order.id}', 'delivered')" class="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition">
                                    اكتمال وتسليم ✅
                                </button>
                            ` : ''}
                            ${order.status === 'delivered' ? `
                                <span class="badge-pill bg-emerald-100 text-emerald-800 text-xs font-bold">تم التسليم بنجاح ✅</span>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        };

        if (pendingList) {
            const pOrders = filtered.filter(o => o.status === 'pending');
            pendingList.innerHTML = pOrders.length > 0 ? pOrders.map(renderOrderCard).join('') : '<p class="text-slate-400 text-xs text-center py-6">لا توجد طلبات جديدة</p>';
        }
        if (inProgressList) {
            const ipOrders = filtered.filter(o => o.status === 'in_progress');
            inProgressList.innerHTML = ipOrders.length > 0 ? ipOrders.map(renderOrderCard).join('') : '<p class="text-slate-400 text-xs text-center py-6">لا توجد طلبات قيد التحضير</p>';
        }
        if (deliveredList) {
            const dOrders = filtered.filter(o => o.status === 'delivered');
            deliveredList.innerHTML = dOrders.length > 0 ? dOrders.map(renderOrderCard).join('') : '<p class="text-slate-400 text-xs text-center py-6">لا توجد طلبات مكتملة</p>';
        }
    };

    window.openAddOrderModal = function() {
        const recipes = Store.getRecipes();
        const select = document.getElementById('order-recipe-select');
        if (select) {
            if (recipes.length === 0) {
                select.innerHTML = '<option value="">لا توجد وصفات مسجلة</option>';
            } else {
                select.innerHTML = recipes.map(r => `<option value="${r.id}">${r.name} (${r.yield || 1} قطع)</option>`).join('');
            }
        }
        openModal('add-order-modal');
    };

    window.updateOrderStatus = function(orderId, newStatus) {
        Store.updateOrderStatus(orderId, newStatus);
        renderOrdersTab();
        renderDashboard();
        showToast('تم تحديث حالة الطلب بنجاح 👨‍🍳');
    };

    document.getElementById('order-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const branch = document.getElementById('order-branch').value;
        const recipeId = document.getElementById('order-recipe-select').value;
        const qty = parseInt(document.getElementById('order-quantity').value) || 1;
        const notes = document.getElementById('order-notes').value.trim();

        if (!recipeId) {
            alert('⚠️ يرجى اختيار الوصفة أولاً');
            return;
        }

        const newOrder = {
            id: Store._generateId(),
            branch,
            recipeId,
            quantity: qty,
            notes,
            status: 'pending',
            date: new Date().toISOString()
        };

        Store.addProductionOrder(newOrder);
        closeModal('add-order-modal');
        renderOrdersTab();
        renderDashboard();
        showToast('🚀 تم إرسال طلب الإنتاج للمطبخ بنجاح!');
    });

    // ================= 12. POS USAGE TAB =================
    window.renderUsagePOS = function() {
        const grid = document.getElementById('pos-products-grid');
        if (!grid) return;

        const recipes = Store.getRecipes();
        const searchInput = document.getElementById('pos-search-input');
        const searchQ = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const branchFilter = document.getElementById('pos-filter-branch')?.value || 'all';

        let filtered = recipes;
        if (branchFilter !== 'all') {
            filtered = filtered.filter(r => r.branch === branchFilter || r.branch === 'all' || !r.branch);
        }
        if (searchQ) {
            filtered = filtered.filter(r => (r.name || '').toLowerCase().includes(searchQ));
        }

        if (filtered.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-400 font-bold">لا توجد منتجات مسجلة</div>';
            return;
        }

        grid.innerHTML = filtered.map(rec => {
            return `
                <div class="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between cursor-pointer" onclick="recordPOSUsage('${rec.id}')">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <h4 class="font-black text-slate-900 text-sm leading-snug">${rec.name}</h4>
                            <span class="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-bold">⚡ استهلاك</span>
                        </div>
                        <p class="text-xs text-slate-400 font-medium">خصم فوري للمواد الخام من المخزون</p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                        <span class="text-xs font-bold text-slate-500">المقدار: ${rec.yield || 1} قطع</span>
                        <button type="button" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition">
                            تسجيل استهلاك 🛒
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    };

    window.recordPOSUsage = function(recipeId) {
        const recipe = Store.getRecipes().find(r => r.id === recipeId);
        if (!recipe) return;

        const qtyStr = prompt(`كم عدد القطع المستهلكة من "${recipe.name}"؟`, recipe.yield || 1);
        if (!qtyStr) return;
        const qty = parseFloat(qtyStr);
        if (isNaN(qty) || qty <= 0) return;

        Store.addUsageLog({
            id: Store._generateId(),
            recipeId: recipe.id,
            recipeName: recipe.name,
            quantityProduced: qty,
            date: new Date().toISOString()
        });

        renderUsagePOS();
        renderDashboard();
        showToast(`✅ تم تسجيل استهلاك ${qty} قطع من (${recipe.name}) وخصم المواد من المخزون!`);
    };

    // ================= 13. WASTE TAB =================
    window.renderWasteTab = function() {
        const tbody = document.getElementById('waste-table-body');
        if (!tbody) return;

        const rawWaste = Store.getRawWasteLogs() || [];
        const ingredients = Store.getIngredients();

        if (rawWaste.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400 font-bold">لا توجد سجلات تالف مسجلة</td></tr>';
            return;
        }

        tbody.innerHTML = rawWaste.map(w => {
            const ing = ingredients.find(i => i.id === w.ingredientId);
            const ingName = ing ? ing.name : (w.ingredientName || 'مادة');
            const unitLookup = (typeof getI18nText === 'function') ? getI18nText('unit_' + (ing?.unit || '')) : '';
            const unit = (unitLookup && !unitLookup.startsWith('unit_')) ? unitLookup : (ing?.unit || 'حبة');

            return `
                <tr class="hover:bg-slate-50 transition">
                    <td class="px-4 py-3 font-bold text-slate-900">${ingName}</td>
                    <td class="px-4 py-3 font-black text-rose-600">${w.quantity} ${unit}</td>
                    <td class="px-4 py-3 font-medium text-slate-600">${w.reason || 'هدر وتلف'}</td>
                    <td class="px-4 py-3 text-xs text-slate-400">${new Date(w.date || Date.now()).toLocaleDateString('ar-OM')}</td>
                    <td class="px-4 py-3 text-xs font-bold text-slate-700">${w.loggedBy || 'المسؤول'}</td>
                </tr>
            `;
        }).join('');
    };

    window.openAddWasteModal = function() {
        const ingredients = Store.getIngredients();
        const select = document.getElementById('waste-ingredient-select');
        if (select) {
            select.innerHTML = '<option value="">-- اختر المادة الخام التالفة --</option>' +
                ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        }
        openModal('add-waste-modal');
    };

    document.getElementById('waste-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const ingId = document.getElementById('waste-ingredient-select')?.value;
        const qty = parseFloat(document.getElementById('waste-quantity')?.value) || 0;
        const reason = document.getElementById('waste-reason')?.value.trim() || 'تالف عادي';

        if (!ingId || qty <= 0) {
            alert('⚠️ يرجى تحديد المادة والكمية التالفة بشكل صحيح');
            return;
        }

        const ing = Store.getIngredients().find(i => i.id === ingId);

        Store.addRawWasteLog({
            id: Store._generateId(),
            ingredientId: ingId,
            ingredientName: ing ? ing.name : '',
            quantity: qty,
            reason: reason,
            loggedBy: Store.getLoggedInUser()?.name || 'المسؤول',
            date: new Date().toISOString()
        });

        closeModal('add-waste-modal');
        renderWasteTab();
        renderDashboard();
        showToast('🗑️ تم تسجيل التالف وخصم الكمية من المخزون بنجاح!');
    });

    // ================= 14. STAFF & TASKS TAB =================
    window.renderStaffAndTasks = function() {
        const empTbody = document.getElementById('employees-table-body');
        const tasksContainer = document.getElementById('tasks-board-container');
        const deptsContainer = document.getElementById('departments-list-container');

        const employees = Store.getEmployees();
        const departments = Store.getDepartments();
        const tasks = Store.getTasks();

        if (empTbody) {
            empTbody.innerHTML = employees.map(emp => {
                const dept = departments.find(d => d.id === emp.departmentId);
                const roleBadge = emp.role === 'admin' ? '<span class="badge-pill bg-purple-100 text-purple-800 font-bold">مسؤول عام 👑</span>' : '<span class="badge-pill bg-slate-100 text-slate-700 font-bold">موظف 👤</span>';
                return `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="px-4 py-3 font-bold text-slate-900">${emp.name}</td>
                        <td class="px-4 py-3 font-medium text-slate-600" dir="ltr">${emp.username || emp.phone || '-'}</td>
                        <td class="px-4 py-3 text-xs font-bold text-slate-600">${dept ? dept.name : 'عام'}</td>
                        <td class="px-4 py-3">${roleBadge}</td>
                    </tr>
                `;
            }).join('');
        }

        if (tasksContainer) {
            if (tasks.length === 0) {
                tasksContainer.innerHTML = '<div class="col-span-full text-center py-8 text-slate-400 font-bold">لا توجد مهام حالية</div>';
            } else {
                tasksContainer.innerHTML = tasks.map(t => {
                    const emp = employees.find(e => e.id === t.assignedTo);
                    return `
                        <div class="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                            <div class="flex justify-between items-start">
                                <h4 class="font-black text-slate-900 text-sm">${t.title}</h4>
                                <span class="badge-pill bg-indigo-50 text-indigo-900 text-xs font-bold">${t.status === 'done' ? 'مكتملة ✅' : 'قيد التنفيذ ⏳'}</span>
                            </div>
                            ${t.description ? `<p class="text-xs text-slate-500">${t.description}</p>` : ''}
                            <div class="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-50">
                                <span>👤 ${emp ? emp.name : 'الجميع'}</span>
                                ${t.status !== 'done' ? `
                                    <button type="button" onclick="completeTask('${t.id}')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition">
                                        إتمام المهمة ✅
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
    };

    window.completeTask = function(taskId) {
        Store.updateTaskStatus(taskId, 'done');
        renderStaffAndTasks();
        showToast('✅ تم إتمام المهمة بنجاح!');
    };

    // ================= 15. ARCHIVE & PRODUCT REPORT TABS =================
    window.renderArchiveTab = function() {
        const tbody = document.getElementById('archive-table-body');
        if (!tbody) return;
        const archived = Store.getArchivedIngredients();
        if (archived.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-400 font-bold">لا توجد منتجات مؤرشفة</td></tr>';
            return;
        }
        tbody.innerHTML = archived.map(item => `
            <tr class="hover:bg-slate-50 transition">
                <td class="px-4 py-3 font-bold text-slate-900">${item.name}</td>
                <td class="px-4 py-3 font-medium text-slate-600">${item.unit || 'حبة'}</td>
                <td class="px-4 py-3 text-xs text-slate-400">${item.archivedAt ? new Date(item.archivedAt).toLocaleDateString('ar-OM') : '-'}</td>
                <td class="px-4 py-3">
                    <button type="button" onclick="restoreIngredient('${item.id}')" class="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-black text-xs transition">
                        استعادة للمخزن 🔄
                    </button>
                </td>
            </tr>
        `).join('');
    };

    window.restoreIngredient = function(id) {
        Store.restoreIngredient(id);
        renderArchiveTab();
        renderProductsTab();
        renderDashboard();
        showToast('تمت استعادة المنتج للمخزن بنجاح 🔄✅');
    };

    window.renderProductReportTab = function() {
        const select = document.getElementById('report-product-select');
        const container = document.getElementById('product-report-details-container');
        if (!select || !container) return;

        const ingredients = Store.getIngredients();
        if (select.options.length <= 1) {
            select.innerHTML = '<option value="">-- اختر المنتج لعرض تقرير حركته --</option>' +
                ingredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
        }

        const selectedId = select.value;
        if (!selectedId) {
            container.innerHTML = '<div class="text-center py-12 text-slate-400 font-bold">يرجى اختيار مادة من القائمة أعلاه لعرض تحليل حركتها</div>';
            return;
        }

        const ing = ingredients.find(i => i.id === selectedId);
        if (!ing) return;

        const purchases = Store.getPurchases();
        const usageLogs = Store.getUsageLogs();
        const wasteLogs = Store.getRawWasteLogs();

        let totalPurQty = 0;
        purchases.forEach(p => {
            if (p.items) {
                p.items.forEach(it => {
                    if (it.ingredientId === ing.id) totalPurQty += (parseFloat(it.quantity) || 0);
                });
            } else if (p.ingredientId === ing.id) {
                totalPurQty += (parseFloat(p.quantity) || 0);
            }
        });

        const totalWasteQty = wasteLogs.filter(w => w.ingredientId === ing.id).reduce((s, w) => s + (parseFloat(w.quantity) || 0), 0);

        container.innerHTML = `
            <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
                <div class="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                        <span class="badge-pill bg-indigo-50 text-indigo-900 font-bold text-xs mb-1">📦 تقرير حركة المنتج</span>
                        <h3 class="text-lg font-black text-slate-900">${ing.name}</h3>
                    </div>
                    <span class="px-3 py-1 bg-slate-100 rounded-xl font-bold text-xs text-slate-700">الوحدة: ${ing.unit || 'حبة'}</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                        <span class="block text-xs font-bold text-emerald-800 mb-1">إجمالي المشتريات</span>
                        <span class="text-xl font-black text-emerald-950">${totalPurQty} ${ing.unit || 'حبة'}</span>
                    </div>
                    <div class="p-4 bg-rose-50 rounded-2xl border border-rose-200">
                        <span class="block text-xs font-bold text-rose-800 mb-1">إجمالي التالف المسجل</span>
                        <span class="text-xl font-black text-rose-950">${totalWasteQty} ${ing.unit || 'حبة'}</span>
                    </div>
                    <div class="p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
                        <span class="block text-xs font-bold text-indigo-800 mb-1">الرصيد المتبقي الإجمالي</span>
                        <span class="text-xl font-black text-indigo-950">${calculateInventory('all', 'all')[ing.id]?.remaining || 0} ${ing.unit || 'حبة'}</span>
                    </div>
                </div>
            </div>
        `;
    };


    // ================= 16. MASTER RENDER (HIGH-SPEED LAZY RENDERING) =================
    window.renderAll = function() {
        if (typeof renderActiveUserHeader === 'function') {
            try { renderActiveUserHeader(); } catch (e) {}
        }
        if (typeof renderDropdowns === 'function') {
            try { renderDropdowns(); } catch (e) {}
        }

        const activeTabId = window.activeNavTab || 'dashboard-tab';

        if (activeTabId === 'dashboard-tab') {
            if (typeof renderDashboard === 'function') try { renderDashboard(); } catch (e) {}
        } else if (activeTabId === 'purchases-tab') {
            if (typeof renderPurchasesTab === 'function') try { renderPurchasesTab(); } catch (e) {}
        } else if (activeTabId === 'external-purchases-tab') {
            if (typeof renderExternalPurchasesTab === 'function') try { renderExternalPurchasesTab(); } catch (e) {}
        } else if (activeTabId === 'warehouse-1-tab' || activeTabId === 'warehouse-2-tab') {
            if (typeof renderWarehousesTab === 'function') try { renderWarehousesTab(); } catch (e) {}
        } else if (activeTabId === 'products-tab') {
            if (typeof renderProductsTab === 'function') try { renderProductsTab(); } catch (e) {}
        } else if (activeTabId === 'shelves-tab') {
            if (typeof renderShelvesTab === 'function') try { renderShelvesTab(); } catch (e) {}
        } else if (activeTabId === 'archive-tab') {
            if (typeof renderArchiveTab === 'function') try { renderArchiveTab(); } catch (e) {}
        } else if (activeTabId === 'product-report-tab') {
            if (typeof renderProductReportTab === 'function') try { renderProductReportTab(); } catch (e) {}
        } else if (activeTabId === 'recipes-tab') {
            if (typeof renderRecipesTab === 'function') try { renderRecipesTab(); } catch (e) {}
        } else if (activeTabId === 'orders-tab') {
            if (typeof renderOrdersTab === 'function') try { renderOrdersTab(); } catch (e) {}
        } else if (activeTabId === 'usage-tab') {
            if (typeof renderUsagePOS === 'function') try { renderUsagePOS(); } catch (e) {}
        } else if (activeTabId === 'waste-tab') {
            if (typeof renderWasteTab === 'function') try { renderWasteTab(); } catch (e) {}
        } else if (activeTabId === 'stocktake-tab') {
            if (typeof renderStocktakeTab === 'function') try { renderStocktakeTab(); } catch (e) {}
        } else if (activeTabId === 'staff-tasks-tab') {
            if (typeof renderStaffAndTasks === 'function') try { renderStaffAndTasks(); } catch (e) {}
        } else {
            if (typeof renderDashboard === 'function') try { renderDashboard(); } catch (e) {}
        }
    };

});
