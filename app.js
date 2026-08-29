/**
 * HackSync SpendGuard - Master Controller
 * UI Architecture, Supabase Realtime Synchronization, Pure Local Logic Categorization & Leakage Radar
 */

// Application State
const state = {
    user: JSON.parse(localStorage.getItem('spendguard_supabase_user') || 'null'),
    currentPage: 'dashboard',
    authMode: 'signin', // 'signin' | 'signup'
    expenses: [],
    categories: [
        { name: 'Food', icon: '🍽️', color: '#f59e0b' },
        { name: 'Transport', icon: '🚕', color: '#3b82f6' },
        { name: 'Entertainment', icon: '🎬', color: '#a855f7' },
        { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
        { name: 'Utilities', icon: '💡', color: '#06b6d4' },
        { name: 'Other', icon: '📦', color: '#10b981' }
    ],
    monthlyBudget: 35000,
    categoryBudgets: {
        'Food': 12000,
        'Transport': 6000,
        'Entertainment': 4000,
        'Shopping': 6000,
        'Utilities': 4000,
        'Other': 3000
    },
    savingsGoal: JSON.parse(localStorage.getItem('spendguard_savings_goal') || 'null') || {
        title: 'Emergency Fund & Tech Upgrade',
        target: 50000,
        saved: 21000
    },
    simulatedDailyAmount: 150,
    currency: localStorage.getItem('spendguard_currency') || '₹',
    activeTimeframe: 'month',
    activeTrendView: 'daily',
    activeCategoryFilter: 'ALL',
    searchQuery: '',
    theme: localStorage.getItem('spendguard_theme') || 'dark',
    charts: {
        dashboardCategory: null,
        dashboardTrend: null,
        analyticsCategory: null,
        analyticsTrend: null
    }
};

// ==================== INITIALIZATION & ROUTER ====================

async function initApp() {
    applyTheme(state.theme);
    setDateTimeNow();
    updateAuthUI();

    // 1. Auto-load Supabase credentials from .env via backend API (local server or Render production backend)
    try {
        const DEFAULT_PROD_BACKEND = 'https://spendguard-backend-mt5m.onrender.com';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const backendBase = isLocalhost ? '' : (window.BACKEND_API_URL || localStorage.getItem('backend_api_url') || DEFAULT_PROD_BACKEND);
        
        const cfgResp = await fetch(`${backendBase}/api/config`);
        if (cfgResp.ok) {
            const cfg = await cfgResp.json();
            if (cfg.supabase && cfg.supabase.isConfigured && cfg.supabase.url && cfg.supabase.anonKey) {
                localStorage.setItem('supabase_url', cfg.supabase.url);
                localStorage.setItem('supabase_anon_key', cfg.supabase.anonKey);
                if (window.SupabaseClient) {
                    window.SupabaseClient.init(cfg.supabase.url, cfg.supabase.anonKey);
                }
            }
        }
    } catch (e) {
        console.log('Backend config fetch notice, using cached client configuration.');
    }

    updateSupabaseBadge();

    // 2. Load all user data and saved budgets into state BEFORE router renders views
    await loadInitialData();

    // 3. Setup router and navigate to appropriate page with clean loaded state
    setupRouter();
    setupEventListeners();

    // 4. Subscribe to Supabase Realtime updates
    if (window.SupabaseClient) {
        window.SupabaseClient.subscribeRealtime(() => {
            loadInitialData().then(() => refreshAllUI());
        });
    }

    refreshAllUI();
}

function setupRouter() {
    const sessionToken = localStorage.getItem('sessionToken');
    const user = localStorage.getItem('spendguard_supabase_user');
    const hash = window.location.hash.replace('#', '');

    // If not authenticated, open Login page first (#auth)
    if (!sessionToken || !user) {
        navigateTo('auth', true);
    } else {
        const target = (hash && hash !== 'auth') ? hash : 'dashboard';
        navigateTo(target, false);
    }

    window.addEventListener('hashchange', () => {
        const currentToken = localStorage.getItem('sessionToken');
        let target = window.location.hash.replace('#', '') || 'auth';

        // Protect internal pages: redirect to auth if not logged in
        if (!currentToken && target !== 'landing' && target !== 'auth') {
            target = 'auth';
        }
        navigateTo(target, false);
    });
}

function navigateTo(pageId, updateHash = true) {
    const validPages = ['landing', 'auth', 'dashboard', 'analytics', 'budget', 'leakage-report', 'profile'];
    if (!validPages.includes(pageId)) pageId = 'auth';

    // Route guard: if trying to open dashboard/analytics/budget without login, redirect to auth
    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken && pageId !== 'landing' && pageId !== 'auth') {
        pageId = 'auth';
    }

    state.currentPage = pageId;
    if (updateHash) {
        window.location.hash = pageId;
    }

    // Toggle active view
    document.querySelectorAll('.page-view').forEach(view => {
        view.classList.remove('active');
    });
    const targetView = document.getElementById(`page-${pageId}`);
    if (targetView) targetView.classList.add('active');

    // Update desktop nav
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.getElementById(`nav-${pageId}`);
    if (activeLink) activeLink.classList.add('active');

    // Update mobile bottom nav
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeMobLink = document.getElementById(`mob-nav-${pageId}`);
    if (activeMobLink) activeMobLink.classList.add('active');

    // View specific lifecycle
    if (pageId === 'dashboard') {
        renderDashboardCharts();
    } else if (pageId === 'analytics') {
        renderAnalyticsView();
    } else if (pageId === 'budget') {
        renderBudgetView();
    } else if (pageId === 'leakage-report') {
        renderLeakageReportView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== DATA SYNC & SUPABASE INTEGRATION (STEP 8) ====================

async function loadInitialData() {
    const userId = localStorage.getItem('userId') || state.user?.id || '00000000-0000-0000-0000-000000000000';
    const storageKey = `expenses_data_${userId}`;

    // 1. Always load user-specific saved budget preferences first
    const storedBudget = localStorage.getItem(`monthly_budget_${userId}`) || localStorage.getItem('monthly_budget');
    const storedCatBudgets = localStorage.getItem(`category_budgets_${userId}`) || localStorage.getItem('category_budgets');

    if (storedBudget) {
        state.monthlyBudget = Number(storedBudget);
    }
    if (storedCatBudgets) {
        try {
            const parsed = JSON.parse(storedCatBudgets);
            if (parsed && typeof parsed === 'object') {
                state.categoryBudgets = { ...state.categoryBudgets, ...parsed };
            }
        } catch (e) { }
    }

    // Load user-scoped savings goal
    const storedGoal = localStorage.getItem(`spendguard_savings_goal_${userId}`) || localStorage.getItem('spendguard_savings_goal');
    if (storedGoal) {
        try { state.savingsGoal = JSON.parse(storedGoal); } catch (e) { }
    } else {
        // Fresh accounts start with clean customizable goal
        state.savingsGoal = {
            title: 'Emergency Cushion Fund',
            target: 50000,
            saved: 0
        };
    }

    // 2. Load Expenses: Try Supabase live sync first
    let loadedFromRemote = false;
    if (window.SupabaseClient) {
        try {
            const allExpenses = await window.SupabaseClient.getAllExpenses(userId, 100);
            if (Array.isArray(allExpenses)) {
                state.expenses = allExpenses;
                loadedFromRemote = true;
                updateSupabaseBadge(true);
            }
        } catch (e) {
            console.warn('Supabase getAllExpenses notice:', e.message);
        }
    }

    // 3. Fallback to user-scoped LocalStorage if remote was not loaded
    if (!loadedFromRemote) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try { state.expenses = JSON.parse(stored); } catch (e) { state.expenses = []; }
        } else {
            state.expenses = [];
        }
    }

    // 4. Save clean snapshot
    saveExpensesToLocal();
}

function saveExpensesToLocal() {
    const userId = localStorage.getItem('userId') || state.user?.id || '00000000-0000-0000-0000-000000000000';
    localStorage.setItem(`expenses_data_${userId}`, JSON.stringify(state.expenses));
    localStorage.setItem(`monthly_budget_${userId}`, String(state.monthlyBudget));
    localStorage.setItem(`category_budgets_${userId}`, JSON.stringify(state.categoryBudgets));
    localStorage.setItem('expenses_data', JSON.stringify(state.expenses));
    localStorage.setItem('monthly_budget', String(state.monthlyBudget));
    localStorage.setItem('category_budgets', JSON.stringify(state.categoryBudgets));
}

// ==================== FORM & REAL-TIME LOCAL CATEGORIZATION ====================

function handleDescriptionInput(value) {
    if (!value || value.trim().length < 2) return;

    // Pure Local Logic Semantic Categorization (< 1ms)
    const detectedCategory = window.LeakageDetector.categorize(value);
    const catSelect = document.getElementById('expenseCategory');
    const badge = document.getElementById('autoCatBadge');

    if (catSelect && detectedCategory && detectedCategory !== 'Other') {
        catSelect.value = detectedCategory;
        if (badge) {
            badge.style.display = 'inline-flex';
            badge.textContent = `Auto: ${detectedCategory}`;
            setTimeout(() => { badge.style.display = 'none'; }, 2500);
        }
    }
}

function handleAmountInput(e) {
    const val = parseFloat(e.target.value);
    const preview = document.getElementById('amountPreviewText');
    const hint = document.getElementById('amountValidationHint');

    if (isNaN(val) || val <= 0) {
        preview.textContent = `Formatted: ${state.currency}0`;
        preview.style.color = 'var(--text-muted)';
        hint.textContent = 'Enter positive amount';
        hint.style.color = 'var(--accent-rose)';
    } else {
        preview.textContent = `Formatted: ${state.currency}${val.toLocaleString('en-IN')}`;
        preview.style.color = 'var(--accent-cyan)';

        if (val < 500) {
            hint.textContent = '⚡ Micro-Spend (< ₹500)';
            hint.style.color = 'var(--accent-amber)';
        } else if (val >= 5000) {
            hint.textContent = '🚨 Large Spend Alert';
            hint.style.color = 'var(--accent-rose)';
        } else {
            hint.textContent = '✓ Valid Amount';
            hint.style.color = 'var(--accent-emerald)';
        }
    }
}

function setDateTimeNow() {
    const dtInput = document.getElementById('dateInput') || document.getElementById('expenseDateTime');
    if (!dtInput) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    dtInput.value = todayStr;
}

function handleDescriptionInput(val) {
    const autoBadge = document.getElementById('autoCatBadge');
    const categorySelect = document.getElementById('categoryDropdown') || document.getElementById('expenseCategory');
    if (!val || val.length < 2) {
        if (autoBadge) autoBadge.style.display = 'none';
        return;
    }

    if (window.LeakageDetector && window.LeakageDetector.categorizeExpense) {
        const detected = window.LeakageDetector.categorizeExpense(val);
        if (detected && categorySelect) {
            categorySelect.value = detected;
            if (autoBadge) {
                autoBadge.textContent = `Auto: ${detected}`;
                autoBadge.style.display = 'inline-block';
            }
        }
    }
}

async function handleAddExpense(e) {
    if (e) e.preventDefault();

    const titleInput = document.getElementById('descriptionInput') || document.getElementById('expenseTitle');
    const amountInput = document.getElementById('amountInput') || document.getElementById('expenseAmount');
    const categorySelect = document.getElementById('categoryDropdown') || document.getElementById('expenseCategory');
    const paymentMethodSelect = document.getElementById('expensePaymentMethod');
    const isRecurringCheck = document.getElementById('expenseRecurring');
    const dateInput = document.getElementById('dateInput') || document.getElementById('expenseDateTime');
    const addExpenseBtn = document.getElementById('addExpenseBtn');

    const description = titleInput ? titleInput.value.trim() : '';
    const amount = amountInput ? parseFloat(amountInput.value) : NaN;
    const category = categorySelect ? categorySelect.value : 'Food';
    const payment_method = paymentMethodSelect ? paymentMethodSelect.value : 'UPI';
    const is_recurring = isRecurringCheck ? isRecurringCheck.checked : false;

    let rawDate = dateInput ? dateInput.value : '';
    let date = rawDate ? (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate) : new Date().toISOString().split('T')[0];

    // Step 5: Validate amountInput.value <= 0
    if (!description || isNaN(amount) || amount <= 0) {
        showToast('⚠️ Please enter a valid description and positive amount (> 0).', 'error');
        if (amountInput) amountInput.focus();
        return;
    }

    // Step 5: Show loading spinner on button
    if (addExpenseBtn) {
        addExpenseBtn.disabled = true;
        addExpenseBtn.style.opacity = '0.75';
        addExpenseBtn.innerHTML = '<span>⏳</span> Adding Expense...';
    }

    const newExpense = {
        id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        description,
        amount,
        category,
        payment_method,
        is_recurring,
        date,
        created_at: new Date().toISOString()
    };

    try {
        // Step 4: Run addExpense query
        if (window.SupabaseClient) {
            const res = await window.SupabaseClient.addExpense(newExpense);
            if (res && res.data && res.data.id) {
                newExpense.id = res.data.id;
            }
        }

        // Instant local state update
        state.expenses.unshift(newExpense);
        saveExpensesToLocal();

        // Step 4 On Success: Clear form
        if (titleInput) titleInput.value = '';
        if (amountInput) amountInput.value = '';
        if (isRecurringCheck) isRecurringCheck.checked = false;
        const autoBadge = document.getElementById('autoCatBadge');
        if (autoBadge) autoBadge.style.display = 'none';

        setDateTimeNow();
        const preview = document.getElementById('amountPreviewText');
        if (preview) preview.textContent = `Formatted: ${state.currency}0`;
        const hint = document.getElementById('amountValidationHint');
        if (hint) hint.textContent = 'Enter amount';

        // Step 4 On Success: Refresh table & stats
        refreshAllUI();
        showToast('Expense added!', 'success');
    } catch (err) {
        showToast('Error adding expense: ' + err.message, 'error');
    } finally {
        if (addExpenseBtn) {
            addExpenseBtn.disabled = false;
            addExpenseBtn.style.opacity = '1';
            addExpenseBtn.innerHTML = '<span>➕</span> Add Expense';
        }
    }
}

function applyQuickPreset(description, amount, category, paymentMethod = 'UPI', isRecurring = false) {
    const titleInput = document.getElementById('descriptionInput') || document.getElementById('expenseTitle');
    const amountInput = document.getElementById('amountInput') || document.getElementById('expenseAmount');
    const catSelect = document.getElementById('categoryDropdown') || document.getElementById('expenseCategory');
    const paySelect = document.getElementById('expensePaymentMethod');
    const recCheck = document.getElementById('expenseRecurring');

    if (titleInput) titleInput.value = description;
    if (amountInput) amountInput.value = amount;
    if (catSelect) catSelect.value = category;
    if (paySelect) paySelect.value = paymentMethod;
    if (recCheck) recCheck.checked = isRecurring;

    const preview = document.getElementById('amountPreviewText');
    if (preview) preview.textContent = `Formatted: ${state.currency}${amount.toLocaleString('en-IN')}`;
    const hint = document.getElementById('amountValidationHint');
    if (hint) hint.textContent = '⚡ Preset Applied';

    setDateTimeNow();
    handleAddExpense(null);
}

// Step 6: Delete Expense Query & Refresh
async function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense record?')) {
        try {
            // Delete from Supabase
            if (window.SupabaseClient) {
                await window.SupabaseClient.deleteExpense(id);
            }

            state.expenses = state.expenses.filter(e => e.id !== id && String(e.id) !== String(id));
            saveExpensesToLocal();

            // Refresh table & stats
            refreshAllUI();
            showToast('Expense deleted!', 'info');
        } catch (err) {
            showToast('Error deleting expense: ' + err.message, 'error');
        }
    }
}

// ==================== UI RENDERING ====================

function refreshAllUI() {
    renderDashboardTopCards();
    renderDashboardCharts();
    renderRecentTransactionsTable();
    if (state.currentPage === 'analytics') renderAnalyticsView();
    if (state.currentPage === 'budget') renderBudgetView();
    if (state.currentPage === 'leakage-report') renderLeakageReportView();
}

// 1. Dashboard Top Stats Cards
function renderDashboardTopCards() {
    const timeframeTotals = window.LeakageDetector.getTimeframeTotals(state.expenses);
    const analysis = window.LeakageDetector.analyzeLeakage(state.expenses, state.monthlyBudget);
    const prediction = window.LeakageDetector.predictMonthEndSpend(state.expenses, state.monthlyBudget);

    // 1. [Total Today - Blue Card]
    const elSpentToday = document.getElementById('totalToday') || document.getElementById('cardSpentToday');
    if (elSpentToday) elSpentToday.textContent = `${state.currency}${timeframeTotals.today.toLocaleString('en-IN')}`;
    const elTodayTxns = document.getElementById('cardTodayTxnCount');
    const todayCount = state.expenses.filter(e => (e.date || e.expense_date || '').startsWith(new Date().toISOString().slice(0, 10))).length;
    if (elTodayTxns) elTodayTxns.textContent = `${todayCount} transaction${todayCount === 1 ? '' : 's'}`;

    // 2. [This Week - Purple Card]
    const elSpentWeek = document.getElementById('totalWeek') || document.getElementById('cardSpentWeek');
    if (elSpentWeek) elSpentWeek.textContent = `${state.currency}${timeframeTotals.week.toLocaleString('en-IN')}`;
    const elWeekAvg = document.getElementById('cardWeekAvgText');
    if (elWeekAvg) elWeekAvg.textContent = `~${state.currency}${Math.round(timeframeTotals.week / 7).toLocaleString('en-IN')}/day`;

    // 3. [This Month - Green Card & Budget Tracker]
    const totalSpentMonth = timeframeTotals.month;
    const elSpentMonth = document.getElementById('totalMonth') || document.getElementById('cardSpentMonth');
    if (elSpentMonth) elSpentMonth.textContent = `${state.currency}${totalSpentMonth.toLocaleString('en-IN')}`;

    const budgetPercent = state.monthlyBudget > 0 ? Math.round((totalSpentMonth / state.monthlyBudget) * 100) : 0;
    const progressBar = document.getElementById('budgetProgressBar');
    if (progressBar) progressBar.style.width = `${Math.min(100, budgetPercent)}%`;

    const statusBadge = document.getElementById('metricBudgetStatusBadge');
    if (statusBadge && progressBar) {
        if (budgetPercent > 100) {
            statusBadge.className = 'badge badge-critical';
            statusBadge.textContent = 'Exceeded (100%+)';
            progressBar.style.background = 'linear-gradient(90deg, #f43f5e, #e11d48)';
        } else if (budgetPercent > 80) {
            statusBadge.className = 'badge badge-warning';
            statusBadge.textContent = 'Warning (80%+)';
            progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        } else {
            statusBadge.className = 'badge badge-healthy';
            statusBadge.textContent = 'On Track';
            progressBar.style.background = 'linear-gradient(90deg, #3ecf8e, #06b6d4)';
        }
    }

    const elBudgetSpent = document.getElementById('metricBudgetSpentText');
    if (elBudgetSpent) elBudgetSpent.textContent = `Spent: ${state.currency}${totalSpentMonth.toLocaleString('en-IN')}`;
    const elBudgetLimit = document.getElementById('metricBudgetLimitText');
    if (elBudgetLimit) elBudgetLimit.textContent = `Budget: ${state.currency}${state.monthlyBudget.toLocaleString('en-IN')}`;

    // 4. [Leakage & Health Score: Dynamic calculation from Budget & Expenses]
    const score = analysis.healthScore;
    const scoreMsg = analysis.healthLabel;
    const scoreGrade = analysis.healthGrade;
    const scoreColor = analysis.healthColor || '#4edea3';

    const elScore = document.getElementById('leakageScore') || document.getElementById('healthScoreDisplay');
    if (elScore) elScore.innerHTML = `${score}<span style="font-size: 14px; color: var(--text-muted);">/100</span>`;

    const elLabel = document.getElementById('leakageMessage') || document.getElementById('healthScoreLabel');
    if (elLabel) elLabel.textContent = scoreMsg;

    const elGrade = document.getElementById('healthGradeBadge');
    if (elGrade) elGrade.textContent = scoreGrade;

    const elLeakBadge = document.getElementById('leakCountBadge');
    const microCount = state.expenses.filter(e => Number(e.amount) < 500).length;
    if (elLeakBadge) elLeakBadge.textContent = `${microCount} Micro-Spend${microCount === 1 ? '' : 's'}`;

    const elLeakRate = document.getElementById('metricLeakageRate');
    if (elLeakRate) elLeakRate.textContent = `${state.currency}${analysis.totalLeakageMonthly.toLocaleString('en-IN')}/mo`;

    let scoreGlow = scoreColor === '#f43f5e' ? 'rgba(244, 63, 94, 0.35)' : (scoreColor === '#f59e0b' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(78, 222, 163, 0.35)');

    if (elScore) elScore.style.color = scoreColor;
    if (elLabel) elLabel.style.color = scoreColor;
    const elRing = document.getElementById('healthScoreRing');
    if (elRing) elRing.style.borderColor = scoreColor;

    const elScoreCard = document.getElementById('leakageScoreCard');
    if (elScoreCard) {
        elScoreCard.style.borderLeftColor = scoreColor;
        elScoreCard.style.setProperty('--card-glow', scoreGlow);
    }

    renderSavingsGoal();

    // Dynamically calculate user's real daily micro-spend or use default
    const userMicroSpends = state.expenses.filter(e => Number(e.amount) < 500);
    const userMicroTotal = userMicroSpends.reduce((s, e) => s + Number(e.amount), 0);
    const userDailyAvg = userMicroSpends.length > 0 ? Math.round(userMicroTotal / Math.max(1, userMicroSpends.length)) : (state.simulatedDailyAmount || 150);

    simulateDailyImpact(state.simulatedDailyAmount || userDailyAvg);
}

// Savings Goal Tracker Handler (PS Requirement)
function renderSavingsGoal() {
    const goal = state.savingsGoal || { title: 'Emergency Fund & Tech Upgrade', target: 50000, saved: 21000 };
    const titleEl = document.getElementById('goalTitleDisplay');
    const percentEl = document.getElementById('goalPercentDisplay');
    const progressEl = document.getElementById('goalProgressBar');
    const savedEl = document.getElementById('goalSavedAmountText');
    const targetEl = document.getElementById('goalTargetAmountText');
    const messageEl = document.getElementById('goalRunwayMessage');

    const percent = goal.target > 0 ? Math.min(100, Math.round((goal.saved / goal.target) * 100)) : 0;
    const remaining = Math.max(0, goal.target - goal.saved);

    if (titleEl) titleEl.textContent = goal.title;
    if (percentEl) percentEl.textContent = `${percent}%`;
    if (progressEl) progressEl.style.width = `${percent}%`;
    if (savedEl) savedEl.textContent = `${state.currency}${goal.saved.toLocaleString('en-IN')}`;
    if (targetEl) targetEl.textContent = `${state.currency}${goal.target.toLocaleString('en-IN')}`;

    // Calculate runway based on monthly budget savings
    const currentMonthSpent = state.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const monthlySurplus = Math.max(1500, state.monthlyBudget - currentMonthSpent);
    const monthsNeeded = (remaining / monthlySurplus).toFixed(1);

    if (messageEl) {
        if (percent >= 100) {
            messageEl.textContent = '🎉 Goal Achieved! Great financial discipline.';
        } else {
            messageEl.textContent = `On track to complete goal in ~${monthsNeeded} months with current savings pace (surplus ~${state.currency}${Math.round(monthlySurplus).toLocaleString('en-IN')}/mo)!`;
        }
    }
}

// Savings Goal Modal & Customization Handlers (PS Requirement)
function promptNewSavingsGoal() {
    openModal('savingsGoalModal');
    const goal = state.savingsGoal || { title: 'Emergency Cushion Fund', target: 50000, saved: 0 };
    const nameInput = document.getElementById('goalNameInput');
    const targetInput = document.getElementById('goalTargetInput');
    const savedInput = document.getElementById('goalSavedInput');

    if (nameInput) nameInput.value = goal.title || '';
    if (targetInput) targetInput.value = goal.target || 50000;
    if (savedInput) savedInput.value = goal.saved !== undefined ? goal.saved : 0;
}

function setGoalPreset(name, target) {
    const nameInput = document.getElementById('goalNameInput');
    const targetInput = document.getElementById('goalTargetInput');
    if (nameInput) nameInput.value = name;
    if (targetInput) targetInput.value = target;
}

function saveSavingsGoalFromModal() {
    const nameInput = document.getElementById('goalNameInput');
    const targetInput = document.getElementById('goalTargetInput');
    const savedInput = document.getElementById('goalSavedInput');

    const title = nameInput ? nameInput.value.trim() : 'Emergency Fund';
    const target = parseFloat(targetInput ? targetInput.value : '50000');
    const saved = parseFloat(savedInput ? savedInput.value : '0') || 0;

    if (!title) {
        showToast('Please enter a goal name.', 'error');
        return;
    }
    if (isNaN(target) || target <= 0) {
        showToast('Please enter a valid target amount (> 0).', 'error');
        return;
    }

    state.savingsGoal = {
        title,
        target,
        saved: Math.max(0, saved)
    };

    const userId = localStorage.getItem('userId') || state.user?.id || '00000000-0000-0000-0000-000000000000';
    localStorage.setItem(`spendguard_savings_goal_${userId}`, JSON.stringify(state.savingsGoal));
    localStorage.setItem('spendguard_savings_goal', JSON.stringify(state.savingsGoal));

    renderSavingsGoal();
    closeModal('savingsGoalModal');
    showToast(`🎯 Savings Goal "${title}" updated successfully!`, 'success');
}

// Long-Term Compounding Impact Simulator (PS Requirement)
function simulateDailyImpact(dailyAmount) {
    state.simulatedDailyAmount = Number(dailyAmount) || 150;
    const result = window.LeakageDetector.calculateLongTermImpact([], state.simulatedDailyAmount, 0.12);

    const el1M = document.getElementById('impactVal1M');
    const el1Y = document.getElementById('impactVal1Y');
    const el5Y = document.getElementById('impactVal5Y');
    const el10Y = document.getElementById('impactVal10Y');
    const currentRateEl = document.getElementById('simulatedRateText');

    if (currentRateEl) currentRateEl.textContent = `₹${state.simulatedDailyAmount}/day`;
    if (el1M) el1M.textContent = result.periods['1_month'].formatted;
    if (el1Y) el1Y.textContent = result.periods['1_year'].formatted;
    if (el5Y) el5Y.textContent = result.periods['5_years'].formatted;
    if (el10Y) el10Y.textContent = result.periods['10_years'].formatted;

    // Update active pill button state
    document.querySelectorAll('.sim-pill-btn').forEach(btn => {
        const val = btn.getAttribute('data-val');
        if (Number(val) === Number(state.simulatedDailyAmount)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// 2. Charts Rendering (Chart.js: categoryPieChart & trendLineChart)
function renderDashboardCharts() {
    // 1. Data Source: categoryData (Spending by Category)
    const categoryTotals = { 'Food': 0, 'Transport': 0, 'Entertainment': 0, 'Shopping': 0, 'Utilities': 0, 'Other': 0 };
    state.expenses.forEach(e => {
        const cat = e.category || 'Other';
        if (categoryTotals[cat] !== undefined) categoryTotals[cat] += Number(e.amount);
        else categoryTotals['Other'] += Number(e.amount);
    });

    const categoryLabels = Object.keys(categoryTotals).filter(k => categoryTotals[k] > 0);
    const categoryData = categoryLabels.map(k => categoryTotals[k]);
    const categoryColors = categoryLabels.map(label => {
        const cat = state.categories.find(c => c.name === label);
        return cat ? cat.color : '#64748b';
    });

    let topCat = 'None';
    let maxVal = 0;
    categoryLabels.forEach(l => {
        if (categoryTotals[l] > maxVal) {
            maxVal = categoryTotals[l];
            topCat = l;
        }
    });
    const topBadge = document.getElementById('topCatBadge');
    if (topBadge) topBadge.textContent = maxVal > 0 ? `Top: ${topCat}` : 'No Data';

    // 1. Render Pie Chart - Name: categoryPieChart
    const ctxPie = (document.getElementById('categoryPieChart') || document.getElementById('dashboardCategoryChart'))?.getContext('2d');
    if (ctxPie) {
        if (state.charts.dashboardCategory) state.charts.dashboardCategory.destroy();
        state.charts.dashboardCategory = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: categoryLabels.length ? categoryLabels : ['No Data'],
                datasets: [{
                    data: categoryData.length ? categoryData : [1],
                    backgroundColor: categoryColors.length ? categoryColors : ['#334155'],
                    borderWidth: 2,
                    borderColor: 'rgba(15, 23, 42, 0.6)',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: state.theme === 'light' ? '#475569' : '#94a3b8', boxWidth: 10, font: { size: 11 } }
                    }
                }
            }
        });
    }

    // 2. Data Source: trendData (Daily Spending 30 Days)
    const dailyMap = {};
    const now = new Date();

    // Generate past 30 days continuous timeline
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(5, 10);
        dailyMap[key] = 0;
    }

    // Populate actual spends into trendData
    state.expenses.forEach(e => {
        const dateStr = (e.date || e.expense_date || '').slice(5, 10);
        if (dateStr && dailyMap[dateStr] !== undefined) {
            dailyMap[dateStr] += Number(e.amount);
        }
    });

    const trendLabels = Object.keys(dailyMap);
    const trendData = trendLabels.map(d => dailyMap[d]);

    // 2. Render Line Chart - Name: trendLineChart
    const ctxLine = (document.getElementById('trendLineChart') || document.getElementById('dashboardTrendChart'))?.getContext('2d');
    if (ctxLine) {
        if (state.charts.dashboardTrend) state.charts.dashboardTrend.destroy();
        const isLight = state.theme === 'light';
        state.charts.dashboardTrend = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Daily Spend (₹)',
                    data: trendData,
                    borderColor: '#3ecf8e',
                    backgroundColor: 'rgba(62, 207, 142, 0.15)',
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    pointBackgroundColor: '#3ecf8e',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            color: isLight ? '#64748b' : '#94a3b8',
                            font: { size: 9 },
                            maxTicksLimit: 8
                        },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: isLight ? '#64748b' : '#94a3b8',
                            font: { size: 10 }
                        },
                        grid: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                return ` Spent: ${state.currency}${context.parsed.y.toLocaleString('en-IN')}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// 3. Transactions Table (expensesTable)
function renderRecentTransactionsTable() {
    const tbody = document.getElementById('expensesTableBody') || document.getElementById('recentTransactionsBody');
    if (!tbody) return;

    const recent = state.expenses.slice(0, 8);
    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 24px; color: var(--text-muted);">
                    No expenses logged yet. Use the form above to record your first transaction!
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = recent.map(exp => {
        const cat = state.categories.find(c => c.name === exp.category) || { color: '#64748b', icon: '🏷️' };
        const isMicro = Number(exp.amount) < 500;

        return `
            <tr>
                <!-- Column 1: Description -->
                <td>
                    <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(exp.description || exp.title)}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${exp.is_recurring ? '🔁 Monthly Recurring' : '⚡ Single Spend'}</div>
                </td>
                <!-- Column 2: Amount -->
                <td>
                    <span style="font-weight: 800; font-family: 'JetBrains Mono', monospace; color: ${isMicro ? 'var(--accent-amber)' : 'var(--text-primary)'};">
                        ${state.currency}${Number(exp.amount).toLocaleString('en-IN')}
                    </span>
                    ${isMicro ? '<span title="Micro-spend < ₹500" style="font-size:10px; margin-left:4px;">⚡</span>' : ''}
                </td>
                <!-- Column 3: Category -->
                <td>
                    <span class="category-tag" style="border-left: 3px solid ${cat.color};">
                        <span>${cat.icon}</span>
                        <span>${exp.category}</span>
                    </span>
                </td>
                <!-- Column 4: Date -->
                <td>
                    <span style="font-size: 12px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace;">
                        ${exp.date || exp.expense_date}
                    </span>
                </td>
                <!-- Column 5: Actions (Delete Button) -->
                <td style="text-align: right;">
                    <button class="btn btn-danger btn-sm" onclick="deleteExpense('${exp.id}')" title="Delete Expense">
                        ❌ Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ==================== PAGE 3: ANALYTICS VIEW ====================

async function handleAnalyticsFilterChange() {
    await renderAnalyticsView();
}

async function renderAnalyticsView() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const selectedMonth = monthSelect ? monthSelect.value : '08';
    const selectedYear = yearSelect ? yearSelect.value : '2026';
    const monthPrefix = `${selectedYear}-${selectedMonth}`;

    const monthNames = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec' };
    const monthLabel = `${monthNames[selectedMonth] || selectedMonth} ${selectedYear}`;

    const summaryLabel = document.getElementById('summaryMonthLabel');
    if (summaryLabel) summaryLabel.textContent = monthLabel;

    // 1. Calculate Monthly Totals directly from active user expenses state
    const catTotals = { 'Food': 0, 'Transport': 0, 'Entertainment': 0, 'Shopping': 0, 'Utilities': 0, 'Other': 0 };
    (state.expenses || [])
        .filter(e => (e.date || e.expense_date || '').startsWith(monthPrefix))
        .forEach(e => {
            const cat = e.category || 'Other';
            if (catTotals[cat] !== undefined) catTotals[cat] += Number(e.amount || 0);
            else catTotals['Other'] += Number(e.amount || 0);
        });

    const totalMonthSpend = Object.values(catTotals).reduce((sum, val) => sum + val, 0);

    const monthBadge = document.getElementById('analyticsMonthTotalBadge');
    if (monthBadge) monthBadge.textContent = `Total: ${state.currency}${totalMonthSpend.toLocaleString('en-IN')}`;

    // 2. Render 3. Bar Chart - Name: analyticsBarChart
    const ctxBar = document.getElementById('analyticsBarChart')?.getContext('2d');
    if (ctxBar) {
        if (state.charts.analyticsCategory) state.charts.analyticsCategory.destroy();
        const isLight = state.theme === 'light';
        const labels = Object.keys(catTotals);
        const dataValues = labels.map(l => catTotals[l]);

        state.charts.analyticsCategory = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels.map(l => {
                    const cat = state.categories.find(c => c.name === l);
                    return `${cat?.icon || ''} ${l}`;
                }),
                datasets: [{
                    label: `Spent in ${monthLabel}`,
                    data: dataValues,
                    backgroundColor: [
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(6, 182, 212, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: isLight ? '#64748b' : '#94a3b8', font: { size: 11 } }, grid: { display: false } },
                    y: {
                        ticks: { color: isLight ? '#64748b' : '#94a3b8', font: { size: 10 } },
                        grid: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` Spent: ${state.currency}${ctx.parsed.y.toLocaleString('en-IN')}`
                        }
                    }
                }
            }
        });
    }

    // 3. Render 4. Summary Table - Category | Spent | Budget | Remaining
    const summaryTbody = document.getElementById('analyticsSummaryTableBody');
    if (summaryTbody) {
        summaryTbody.innerHTML = state.categories.map(cat => {
            const spent = catTotals[cat.name] || 0;
            const budget = state.categoryBudgets[cat.name] || Math.round(state.monthlyBudget / 6);
            const remaining = budget - spent;
            const isOver = remaining < 0;

            return `
                <tr>
                    <td>
                        <span class="category-tag" style="border-left: 3px solid ${cat.color};">
                            <span>${cat.icon}</span>
                            <span>${cat.name}</span>
                        </span>
                    </td>
                    <td>
                        <strong style="font-family: 'JetBrains Mono', monospace;">
                            ${state.currency}${spent.toLocaleString('en-IN')}
                        </strong>
                    </td>
                    <td style="color: var(--text-muted); font-family: 'JetBrains Mono', monospace;">
                        ${state.currency}${budget.toLocaleString('en-IN')}
                    </td>
                    <td>
                        <span style="font-weight: 700; font-family: 'JetBrains Mono', monospace; color: ${isOver ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">
                            ${isOver ? '-' : '+'}${state.currency}${Math.abs(remaining).toLocaleString('en-IN')}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 4. Render Transaction Ledger
    const tbody = document.getElementById('fullLedgerTableBody');
    if (!tbody) return;

    let filtered = state.expenses;
    if (state.activeCategoryFilter !== 'ALL') {
        filtered = filtered.filter(e => e.category === state.activeCategoryFilter);
    }
    if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        filtered = filtered.filter(e =>
            (e.description || e.title || '').toLowerCase().includes(q) ||
            (e.category || '').toLowerCase().includes(q) ||
            (e.payment_method && e.payment_method.toLowerCase().includes(q))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 32px; color: var(--text-muted);">
                    No matching transactions found.
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = filtered.map(exp => {
            const cat = state.categories.find(c => c.name === exp.category) || { color: '#64748b', icon: '🏷️' };
            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(exp.description || exp.title)}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${exp.date || exp.expense_date}</div>
                    </td>
                    <td>
                        <span class="category-tag" style="border-left: 3px solid ${cat.color};">
                            <span>${cat.icon}</span>
                            <span>${exp.category}</span>
                        </span>
                    </td>
                    <td>
                        <span style="font-weight: 700; font-family: 'JetBrains Mono', monospace;">
                            ${state.currency}${Number(exp.amount).toLocaleString('en-IN')}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${exp.is_recurring ? 'badge-warning' : 'btn-glass'}">
                            ${exp.is_recurring ? '🔁 Subscription' : 'One-time'}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <button class="btn btn-danger btn-sm" onclick="deleteExpense('${exp.id}')">✕</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// ==================== PAGE 4: BUDGET VIEW ====================

async function saveSingleCategoryBudget(category) {
    const input = document.getElementById(`budgetLimit_${category}`);
    if (!input) return;
    const val = parseFloat(input.value);
    if (!isNaN(val) && val >= 100) {
        state.categoryBudgets[category] = val;

        // Recalculate total monthly budget
        const sumLimits = Object.values(state.categoryBudgets).reduce((a, b) => a + Number(b), 0);
        if (sumLimits > 0) state.monthlyBudget = sumLimits;

        saveExpensesToLocal();

        if (window.SupabaseClient) {
            const currentMonth = new Date().toISOString().slice(0, 7);
            window.SupabaseClient.setBudget(category, val, currentMonth).catch(() => { });
        }

        renderBudgetView();
        renderAnalyticsView();
        renderDashboardTopCards();
        showToast(`Budget for ${category} updated to ${state.currency}${val.toLocaleString('en-IN')}!`, 'success');
    }
}

async function renderBudgetView() {
    const grid = document.getElementById('budgetCategoryGrid');
    if (!grid) return;

    const currentMonth = new Date().toISOString().slice(0, 7);

    const totalInput = document.getElementById('budgetTotalInput');
    if (totalInput) totalInput.value = state.monthlyBudget;

    // Get current month spending per category
    const catActuals = { 'Food': 0, 'Transport': 0, 'Entertainment': 0, 'Shopping': 0, 'Utilities': 0, 'Other': 0 };
    (state.expenses || [])
        .filter(e => (e.date || e.expense_date || '').startsWith(currentMonth))
        .forEach(e => {
            const cat = e.category || 'Other';
            if (catActuals[cat] !== undefined) catActuals[cat] += Number(e.amount || 0);
            else catActuals['Other'] += Number(e.amount || 0);
        });

    grid.innerHTML = state.categories.map(cat => {
        const limit = state.categoryBudgets[cat.name] !== undefined ? state.categoryBudgets[cat.name] : Math.round(state.monthlyBudget / 6);
        const spent = catActuals[cat.name] || 0;
        const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        const remaining = limit - spent;

        let statusBadge = `<span class="badge badge-healthy">On Track (${percent}%)</span>`;
        if (percent >= 100) {
            statusBadge = `<span class="badge badge-critical">Exceeded (${percent}%)</span>`;
        } else if (percent >= 80) {
            statusBadge = `<span class="badge badge-warning">Warning (${percent}%)</span>`;
        }

        return `
            <div class="budget-cat-card" style="border-top: 3px solid ${cat.color};">
                <div class="metric-header">
                    <span style="font-size: 15px; font-weight: 700;">${cat.icon} ${cat.name}</span>
                    ${statusBadge}
                </div>

                <!-- Number Input: Budget limit -->
                <div class="form-group" style="margin-top: 10px;">
                    <label class="form-label" style="font-size: 11px;">Budget Limit (${state.currency})</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="number" id="budgetLimit_${cat.name}" class="input-control cat-budget-input" value="${limit}" min="100" step="500" data-category="${cat.name}">
                        <!-- Button: Save Budget -->
                        <button type="button" class="btn btn-glass btn-sm" onclick="saveSingleCategoryBudget('${cat.name}')">Save</button>
                    </div>
                </div>

                <!-- Progress Bar: Spent/Limit -->
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${Math.min(100, percent)}%; background: ${percent >= 100 ? 'var(--accent-rose)' : (percent >= 80 ? 'var(--accent-amber)' : 'var(--supabase-green)')};"></div>
                </div>

                <!-- Calculations: Spent & Remaining -->
                <div class="metric-sub-row" style="margin-top: 8px;">
                    <span>Spent: <strong>${state.currency}${spent.toLocaleString('en-IN')}</strong></span>
                    <span>Remaining: <strong style="color: ${remaining < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'};">${state.currency}${remaining.toLocaleString('en-IN')}</strong></span>
                </div>
            </div>
        `;
    }).join('');
}

async function saveBudgetSetup() {
    const totalInput = document.getElementById('budgetTotalInput');
    const newTotal = totalInput ? parseFloat(totalInput.value) : NaN;

    document.querySelectorAll('.cat-budget-input').forEach(input => {
        const cat = input.dataset.category;
        const val = parseFloat(input.value);
        if (cat && !isNaN(val) && val >= 100) {
            state.categoryBudgets[cat] = val;
        }
    });

    const sumLimits = Object.values(state.categoryBudgets).reduce((a, b) => a + Number(b), 0);
    if (!isNaN(newTotal) && newTotal >= 1000) {
        state.monthlyBudget = newTotal;
    } else if (sumLimits > 0) {
        state.monthlyBudget = sumLimits;
    }

    saveExpensesToLocal();

    // Persist to Supabase budgets table
    if (window.SupabaseClient) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        window.SupabaseClient.saveCategoryBudgets(state.categoryBudgets, currentMonth).catch(() => { });
    }

    renderBudgetView();
    renderAnalyticsView();
    renderDashboardTopCards();
    showToast('Category budgets saved successfully!', 'success');
}

// ==================== PAGE 5: FINANCIAL LEAKAGE REPORT ====================

function renderLeakageReportView() {
    const analysis = window.LeakageDetector.analyzeLeakage(state.expenses, state.monthlyBudget);

    document.getElementById('reportScoreRingNumber').textContent = analysis.healthScore;
    document.getElementById('reportHealthTitle').textContent = `Financial Health: ${analysis.healthLabel} (Grade ${analysis.healthGrade})`;
    document.getElementById('reportLeakRate').textContent = `Identified ${state.currency}${analysis.totalLeakageMonthly.toLocaleString('en-IN')}/mo in avoidable financial leakage`;
    document.getElementById('reportHealthSummary').textContent = analysis.leaks[0] ? analysis.leaks[0].description : 'Your spending patterns are disciplined and within normal variance.';

    const leaksContainer = document.getElementById('reportLeaksList');
    if (analysis.leaks.length === 0) {
        leaksContainer.innerHTML = `
            <div style="text-align:center; padding: 24px; color: var(--accent-emerald);">
                <div style="font-size: 28px; margin-bottom: 6px;">🛡️</div>
                <div style="font-weight: 700;">No Critical Leakage Detected!</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Your micro-spending, subscriptions, and weekend orders are well managed.</div>
            </div>
        `;
    } else {
        leaksContainer.innerHTML = analysis.leaks.map(leak => `
            <div class="leak-item-card" style="border-left-color: ${leak.badgeColor || 'var(--accent-amber)'};">
                <div class="leak-card-head">
                    <span class="leak-card-title">${leak.title}</span>
                    <span class="badge badge-${leak.severity === 'critical' ? 'critical' : 'warning'}">${leak.tag}</span>
                </div>
                <div class="leak-card-desc">${leak.description}</div>
                <div class="leak-card-action">
                    <span>💡</span>
                    <span><strong>Actionable Fix:</strong> ${leak.recommendation} (Saves ${leak.impact})</span>
                </div>
            </div>
        `).join('');
    }

    const roadmapList = document.getElementById('reportRoadmapList');
    const roadmapItems = analysis.leaks.map(l => l.recommendation).concat([
        "Set an automated 15% salary savings sweep on the 1st of every month.",
        "Review your active OTT subscriptions every 30 days."
    ]);
    roadmapList.innerHTML = roadmapItems.map(step => `
        <div style="display:flex; align-items: flex-start; gap: 8px;">
            <span>⚡</span>
            <span>${step}</span>
        </div>
    `).join('');
}

function runFinancialAudit() {
    const btn = document.getElementById('runAuditBtn');
    if (btn) {
        btn.innerHTML = '🔄 Scanning 30-Day Transactions...';
        btn.disabled = true;
    }

    setTimeout(() => {
        renderLeakageReportView();
        renderDashboardTopCards();
        if (btn) {
            btn.innerHTML = '⚡ Run Diagnostic Audit';
            btn.disabled = false;
        }
        showToast('⚡ Diagnostic Audit Completed! Leakage Radar updated.', 'success');
    }, 600);
}

function loadDemoScenario(scenarioKey) {
    const datasets = window.LeakageDetector.getSampleDatasets();
    const scenario = datasets[scenarioKey];
    if (!scenario) return;

    state.expenses = [...scenario.expenses];
    state.monthlyBudget = scenario.monthlyBudget || 35000;
    saveExpensesToLocal();
    refreshAllUI();
    renderLeakageReportView();
    showToast(`👔 Loaded "${scenario.name}" with realistic leaks!`, 'success');
}

// ==================== AUTHENTICATION (SUPABASE) ====================

// Toggle Password Visibility (Show/Hide Password)
function togglePasswordVisibility(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.textContent = '🙈';
    } else {
        input.type = 'password';
        if (icon) icon.textContent = '👁️';
    }
}

// Full Login/Signup Page Mode Toggle
function toggleAuthPageMode() {
    state.authMode = state.authMode === 'signin' ? 'signup' : 'signin';
    const heading = document.getElementById('authPageHeading');
    const subheading = document.getElementById('authPageSubheading');
    const nameContainer = document.getElementById('nameInputContainer');
    const submitBtn = document.getElementById('submitBtn');
    const toggleLink = document.getElementById('toggleLink');
    const errorMsg = document.getElementById('errorMsg');

    if (errorMsg) errorMsg.style.display = 'none';

    if (state.authMode === 'signup') {
        if (heading) heading.textContent = 'Create SpendGuard Account';
        if (subheading) subheading.textContent = 'Sign up to sync your expenses with live Supabase PostgreSQL.';
        if (nameContainer) nameContainer.style.display = 'block';
        if (submitBtn) submitBtn.textContent = 'Sign Up';
        if (toggleLink) toggleLink.textContent = 'Already have an account? Sign In';
    } else {
        if (heading) heading.textContent = 'Sign In to SpendGuard';
        if (subheading) subheading.textContent = 'Access your real-time financial leakage radar and sync expenses across all devices.';
        if (nameContainer) nameContainer.style.display = 'none';
        if (submitBtn) submitBtn.textContent = 'Sign In';
        if (toggleLink) toggleLink.textContent = "Don't have account? Sign Up";
    }
}

// Full Login/Signup Page Form Submit Handler
async function handleAuthPageSubmit(e) {
    if (e) e.preventDefault();

    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const nameInput = document.getElementById('nameInput');
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    const loadingSpinner = document.getElementById('loadingSpinner');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (errorMsg) errorMsg.style.display = 'none';

    if (!email || !password) {
        if (errorMsg) {
            errorMsg.textContent = 'Please enter both Email and Password.';
            errorMsg.style.display = 'block';
        }
        return;
    }

    // Step 5: Connect Button to Query with setLoading state
    submitBtn.setLoading = function (isLoading) {
        if (isLoading) {
            this.disabled = true;
            this.style.opacity = '0.75';
            this.innerHTML = `<span>⏳</span> ${state.authMode === 'signup' ? 'Creating Account...' : 'Signing In...'}`;
            if (loadingSpinner) loadingSpinner.style.display = 'block';
        } else {
            this.disabled = false;
            this.style.opacity = '1';
            this.innerHTML = state.authMode === 'signup' ? 'Sign Up' : 'Sign In';
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    };

    // Trigger setLoading(true) on click
    submitBtn.setLoading(true);

    try {
        if (state.authMode === 'signup') {
            const res = await window.SupabaseClient.signupUser(email, password, name);
            state.user = res.user;
            showToast(`🎉 Welcome, ${state.user.name}! Account registered in Supabase.`, 'success');
        } else {
            // Trigger loginUser query
            const res = await window.SupabaseClient.loginUser(email, password);
            state.user = res.user;
            showToast(`✅ Welcome back, ${state.user.name}!`, 'success');
        }

        updateAuthUI();
        navigateTo('dashboard');
    } catch (err) {
        const errorText = state.authMode === 'signup'
            ? (err.message || 'Signup failed. Please try again.')
            : 'Invalid email or password';

        if (errorMsg) {
            errorMsg.textContent = errorText;
            errorMsg.style.display = 'block';
        }
        showToast(errorText, 'error');
    } finally {
        // Step 5: Trigger setLoading(false) on complete
        if (submitBtn && typeof submitBtn.setLoading === 'function') {
            submitBtn.setLoading(false);
        }
    }
}

function toggleAuthMode() {
    state.authMode = state.authMode === 'signin' ? 'signup' : 'signin';
    const title = document.getElementById('authModalTitle');
    const desc = document.getElementById('authModalDesc');
    const nameGroup = document.getElementById('signupNameGroup');
    const toggleBtn = document.getElementById('authToggleBtn');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (state.authMode === 'signup') {
        title.textContent = '📝 Create SpendGuard Account';
        desc.textContent = 'Sign up to sync your expenses with Supabase PostgreSQL.';
        nameGroup.style.display = 'block';
        toggleBtn.textContent = 'Switch to Sign In';
        submitBtn.textContent = 'Sign Up';
    } else {
        title.textContent = '🔑 Sign In to SpendGuard';
        desc.textContent = 'Access your real-time financial leakage radar and sync data.';
        nameGroup.style.display = 'none';
        toggleBtn.textContent = 'Switch to Sign Up';
        submitBtn.textContent = 'Sign In';
    }
}

async function handleAuthSubmit() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName')?.value || '';

    if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
    }

    try {
        if (state.authMode === 'signup') {
            const res = await window.SupabaseClient.signUp(email, password, name);
            state.user = res.user;
            showToast(`🎉 Welcome, ${state.user.name}! Account created.`, 'success');
        } else {
            const res = await window.SupabaseClient.signIn(email, password);
            state.user = res.user;
            showToast(`✅ Welcome back, ${state.user.name}!`, 'success');
        }
        closeModal('authModal');
        updateAuthUI();
        navigateTo('dashboard');
    } catch (err) {
        showToast('Authentication Error: ' + err.message, 'error');
    }
}

function handleAuthLogout() {
    if (window.SupabaseClient) {
        window.SupabaseClient.signOut();
    }
    // Clear localStorage and delete session token
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('spendguard_supabase_user');

    state.user = null;
    updateAuthUI();
    showToast('Logged out successfully.', 'info');

    // Navigate to /login (Auth page)
    navigateTo('auth');
}

function updateAuthUI() {
    const userBadge = document.getElementById('userNavBadge');
    const userName = document.getElementById('userNavName');
    const authBtn = document.getElementById('authNavBtn');

    // Retrieve userId & user data
    const user = state.user || JSON.parse(localStorage.getItem('spendguard_supabase_user') || 'null');
    const sessionToken = localStorage.getItem('sessionToken');

    if (user && sessionToken) {
        state.user = user;
        if (userBadge) userBadge.style.display = 'inline-flex';
        if (userName) userName.textContent = `Hi, ${user.name || 'User'}`;
        if (authBtn) {
            authBtn.textContent = 'Logout';
            authBtn.onclick = handleAuthLogout;
            authBtn.className = 'btn btn-glass btn-sm';
            authBtn.title = 'Click to Logout';
        }
        const pName = document.getElementById('profileNameInput');
        const pEmail = document.getElementById('profileEmailInput');
        if (pName) pName.value = user.name || '';
        if (pEmail) pEmail.value = user.email || '';
    } else {
        state.user = null;
        if (userBadge) userBadge.style.display = 'none';
        if (authBtn) {
            authBtn.textContent = 'Sign In';
            authBtn.onclick = () => navigateTo('auth');
            authBtn.className = 'btn btn-primary btn-sm';
            authBtn.title = 'Click to Sign In';
        }
    }
}

// ==================== SUPABASE SETTINGS & CREDENTIALS ====================

function updateSupabaseBadge(isLive = null) {
    const text = document.getElementById('supabaseBadgeText');
    const badge = document.getElementById('supabaseConnectionBadge');
    if (!text || !badge) return;

    const connected = isLive !== null ? isLive : (window.SupabaseClient && window.SupabaseClient.isConnected());
    if (connected) {
        text.textContent = 'Supabase DB Live';
        badge.className = 'badge badge-supabase';
    } else {
        text.textContent = 'Local Mode';
        badge.className = 'badge badge-warning';
    }
}

function saveSupabaseSettings() {
    const url = document.getElementById('cfgSupabaseUrl').value.trim();
    const key = document.getElementById('cfgSupabaseAnonKey').value.trim();

    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);

    if (window.SupabaseClient) {
        const initialized = window.SupabaseClient.init(url, key);
        updateSupabaseBadge(initialized);
        if (initialized) {
            showToast('✅ Supabase connected & initialized!', 'success');
            loadInitialData();
        } else {
            showToast('Saved. Local fallback active.', 'info');
        }
    }
}

function saveModalSupabaseSettings() {
    const url = document.getElementById('modalSupabaseUrl').value.trim();
    const key = document.getElementById('modalSupabaseKey').value.trim();

    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);

    document.getElementById('cfgSupabaseUrl').value = url;
    document.getElementById('cfgSupabaseAnonKey').value = key;

    if (window.SupabaseClient) {
        window.SupabaseClient.init(url, key);
    }
    updateSupabaseBadge();
    closeModal('supabaseConfigModal');
    showToast('Supabase settings updated!', 'success');
}

async function testSupabaseConnection() {
    const url = document.getElementById('cfgSupabaseUrl')?.value.trim() || document.getElementById('modalSupabaseUrl')?.value.trim();
    const key = document.getElementById('cfgSupabaseAnonKey')?.value.trim() || document.getElementById('modalSupabaseKey')?.value.trim();

    if (!url || !key) {
        showToast('Please enter both Supabase URL and Anon Key.', 'error');
        return;
    }

    try {
        const resp = await fetch(`${url}/rest/v1/expenses?select=count`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        if (resp.ok) {
            showToast('✅ Supabase REST API connection verified!', 'success');
            updateSupabaseBadge(true);
        } else {
            showToast(`⚠️ Supabase returned status ${resp.status}. Please check schema.sql`, 'error');
        }
    } catch (err) {
        showToast('Connection failed: ' + err.message, 'error');
    }
}

// ==================== THEME & CONTROLS ====================

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('spendguard_theme', state.theme);
    applyTheme(state.theme);
    renderDashboardCharts();
    if (state.currentPage === 'analytics') renderAnalyticsView();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon && label) {
        icon.textContent = theme === 'light' ? '☀️' : '🌙';
        label.textContent = theme === 'light' ? 'Light' : 'Dark';
    }
}

function setTimeframe(tf) {
    state.activeTimeframe = tf;
    document.querySelectorAll('.timeframe-pills .time-pill').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(tf)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderDashboardTopCards();
}

function setTrendView(view) {
    state.activeTrendView = view;
    document.querySelectorAll('.timeframe-pills .time-pill').forEach(btn => {
        if (btn.textContent.toLowerCase() === view) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderDashboardCharts();
}

function setCategoryFilter(category) {
    state.activeCategoryFilter = category;
    document.querySelectorAll('.category-filter-bar .pill-btn').forEach(btn => {
        if (btn.dataset.category === category) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderAnalyticsView();
}

function handleSearch(e) {
    state.searchQuery = e.target.value;
    renderAnalyticsView();
}

function saveProfileSettings() {
    const name = document.getElementById('profileNameInput').value.trim();
    const email = document.getElementById('profileEmailInput').value.trim();
    if (name && email) {
        state.user = { name, email };
        localStorage.setItem('spendguard_supabase_user', JSON.stringify(state.user));
        updateAuthUI();
        showToast('Profile updated!', 'success');
    }
}

function handleCurrencyChange(e) {
    state.currency = e.target.value;
    localStorage.setItem('spendguard_currency', state.currency);
    refreshAllUI();
    showToast(`Currency set to ${state.currency}`, 'info');
}

function loadScenario(scenarioKey) {
    const datasets = window.LeakageDetector.getSampleDatasets();
    const scenario = datasets[scenarioKey] || datasets.urbanProfessional;
    state.expenses = [...scenario.expenses];
    state.monthlyBudget = scenario.monthlyBudget;
    saveExpensesToLocal();
    refreshAllUI();
    showToast(`Loaded "${scenario.name}" scenario.`, 'info');
    navigateTo('dashboard');
}

// ==================== EXPORT UTILITIES ====================

function exportToCSV() {
    if (state.expenses.length === 0) {
        showToast('No expense records to export.', 'info');
        return;
    }
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Payment Method', 'Is Recurring'];
    const rows = state.expenses.map(e => [
        `"${e.date || e.expense_date}"`,
        `"${(e.description || e.title || '').replace(/"/g, '""')}"`,
        `"${e.category}"`,
        e.amount,
        `"${e.payment_method || 'UPI'}"`,
        e.is_recurring ? 'Yes' : 'No'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `spendguard_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported CSV file successfully!', 'success');
}

function exportToJSON() {
    if (state.expenses.length === 0) {
        showToast('No expense records to export.', 'info');
        return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.expenses, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `spendguard_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported JSON backup file!', 'success');
}

// ==================== TOAST & MODALS ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';
    let icon = '⚡';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2400);
}

function openModal(id) {
    document.getElementById(id)?.classList.add('active');
}
function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });

    const currSelect = document.getElementById('profileCurrencySelect');
    if (currSelect) currSelect.value = state.currency;

    const url = localStorage.getItem('supabase_url') || '';
    const key = localStorage.getItem('supabase_anon_key') || '';

    const urlInput1 = document.getElementById('cfgSupabaseUrl');
    const keyInput1 = document.getElementById('cfgSupabaseAnonKey');
    const urlInput2 = document.getElementById('modalSupabaseUrl');
    const keyInput2 = document.getElementById('modalSupabaseKey');

    if (urlInput1) urlInput1.value = url;
    if (keyInput1) keyInput1.value = key;
    if (urlInput2) urlInput2.value = url;
    if (keyInput2) keyInput2.value = key;
}

// DOM Ready
document.addEventListener('DOMContentLoaded', initApp);
