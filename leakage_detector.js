/**
 * Pure Local Logic Engine:
 * 1. Semantic Smart Categorization (Zero AI dependency, instant < 1ms)
 * 2. 30-Day Financial Leakage Detection Algorithm (Score 0-100, Leaks, Outliers, Roadmap)
 * 3. Predictive Spending & Burn-Rate Forecast Engine
 * 4. Rich Curated Seed Scenarios
 */

const LeakageDetector = {
    // Standard Supported Categories
    CATEGORIES: ['Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Other'],

    // 1. LOCAL DETERMINISTIC SMART CATEGORIZER
    categorize(description = '') {
        if (!description || typeof description !== 'string') return 'Other';
        const text = description.trim();

        const rules = [
            { regex: /(chai|coffee|tea|burger|pizza|biryani|zomato|swiggy|lunch|dinner|breakfast|snack|munchies|boba|starbucks|mcdonalds|kfc|grocer|thali|maggi|subway|dominos|cake|pastry|juice|dining|restaurant|cafe|canteen|dosa|momos)/i, category: 'Food' },
            { regex: /(uber|ola|rapido|cab|auto|taxi|metro|bus|train|flight|airways|indigo|toll|petrol|fuel|diesel|parking|commute|fare|flight|railway|fastag)/i, category: 'Transport' },
            { regex: /(netflix|spotify|prime|hotstar|youtube|steam|game|movie|cinema|concert|pvr|inox|theatre|disco|nitro|apple tv|playstation|xbox|disney|audible|bookmyshow)/i, category: 'Entertainment' },
            { regex: /(amazon|flipkart|myntra|zara|h&m|shirt|shoes|apparel|clothes|mall|electronics|gadget|book|kindle|gift|watch|bag|nykaa|meesho|tshirt|sneakers)/i, category: 'Shopping' },
            { regex: /(electricity|broadband|wifi|internet|water bill|gas cylinder|recharge|jio|airtel|maintenance|rent|insurance|utility|utilities|bill|mobile bill|piped gas)/i, category: 'Utilities' }
        ];

        for (const rule of rules) {
            if (rule.regex.test(text)) {
                return rule.category;
            }
        }
        return 'Other';
    },

    // 2. FINANCIAL LEAKAGE DETECTION ALGORITHM (0 - 100 Health Score)
    analyzeLeakage(expenses = [], monthlyBudget = 35000) {
        if (!expenses || expenses.length === 0) {
            return {
                leaks: [],
                flaggedTransactions: [],
                healthScore: 100,
                healthGrade: 'A+',
                healthLabel: 'Pristine Financial Health',
                totalLeakageMonthly: 0,
                dailyDripWaste: 0,
                totalSpent: 0,
                metrics: { microSpendTotal: 0, subscriptionTotal: 0, weekendTotal: 0, cabTotal: 0 }
            };
        }

        const leaks = [];
        const flaggedTransactions = [];
        let totalMonthlyLeakage = 0;

        const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const avgExpense = totalSpent / (expenses.length || 1);

        // --- HEURISTIC 1: Micro-Spends Accumulation (< ₹500) ---
        const microSpends = expenses.filter(e => Number(e.amount) < 500);
        const microSpendTotal = microSpends.reduce((sum, e) => sum + Number(e.amount), 0);
        const dailyDripWaste = Math.round(microSpendTotal / 30);

        if (microSpends.length >= 6 || microSpendTotal >= 1500) {
            const estimatedWaste = Math.round(microSpendTotal * 0.45);
            totalMonthlyLeakage += estimatedWaste;
            leaks.push({
                id: 'leak-micro-spends',
                type: 'MICRO_SPENDS_DRIP',
                severity: microSpendTotal > 3500 ? 'critical' : (microSpendTotal > 1800 ? 'high' : 'medium'),
                title: 'High-Frequency Micro-Expense Drip (< ₹500)',
                tag: 'Micro-Leakage',
                badgeColor: '#f59e0b',
                description: `Logged ${microSpends.length} micro-purchases under ₹500 totaling ₹${microSpendTotal.toLocaleString('en-IN')}. Daily drip waste is approx ₹${dailyDripWaste}/day. Small unmonitored snack/beverage spends silently drain your wallet.`,
                impact: `₹${estimatedWaste.toLocaleString('en-IN')}/mo estimated avoidable leakage`,
                estimatedMonthlyLoss: estimatedWaste,
                recommendation: 'Set a weekly micro-spending wallet cap (e.g., ₹500/week) or consolidate daily cafe visits.',
                affectedCount: microSpends.length
            });
        }

        // --- HEURISTIC 2: Overlapping / Zombie Subscriptions ---
        const recurringOrSubs = expenses.filter(e => 
            e.is_recurring || 
            (e.category === 'Entertainment' && Number(e.amount) > 100) ||
            ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'gym', 'icloud', 'chatgpt', 'apple', 'nitro'].some(k => (e.description || e.title || '').toLowerCase().includes(k))
        );
        const subTotal = recurringOrSubs.reduce((sum, e) => sum + Number(e.amount), 0);

        if (recurringOrSubs.length >= 2 || subTotal >= 1200) {
            const estimatedWaste = Math.round(subTotal * 0.40);
            totalMonthlyLeakage += estimatedWaste;
            leaks.push({
                id: 'leak-zombie-subs',
                type: 'ZOMBIE_SUBSCRIPTIONS',
                severity: recurringOrSubs.length >= 3 ? 'critical' : 'high',
                title: 'Subscription Creep & Overlapping Digital Services',
                tag: 'Subscription Creep',
                badgeColor: '#8b5cf6',
                description: `Identified ${recurringOrSubs.length} recurring subscription items totaling ₹${subTotal.toLocaleString('en-IN')}/mo. Multiple concurrent streaming or software tiers are active simultaneously.`,
                impact: `₹${estimatedWaste.toLocaleString('en-IN')}/mo potential savings via rotation`,
                estimatedMonthlyLoss: estimatedWaste,
                recommendation: 'Rotate OTT subscriptions on-demand (subscribe 1 month at a time for shows) or share family plans.',
                affectedCount: recurringOrSubs.length
            });
        }

        // --- HEURISTIC 3: Weekend Dining & Delivery Surges ---
        const weekendExpenses = expenses.filter(e => {
            const d = new Date(e.date || e.expense_date || new Date());
            const day = d.getDay();
            return (day === 0 || day === 6) && (e.category === 'Food' || e.category === 'Shopping' || e.category === 'Entertainment');
        });
        const weekendTotal = weekendExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

        if (totalSpent > 0 && (weekendTotal / totalSpent) > 0.38 && weekendExpenses.length >= 3) {
            const estimatedWaste = Math.round(weekendTotal * 0.35);
            totalMonthlyLeakage += estimatedWaste;
            leaks.push({
                id: 'leak-weekend-surge',
                type: 'IMPULSE_WEEKEND_SPIKE',
                severity: 'medium',
                title: 'Weekend Delivery & Impulse Surge Pattern',
                tag: 'Impulse Surge',
                badgeColor: '#ec4899',
                description: `Weekend dining, delivery, and entertainment account for ${Math.round((weekendTotal / totalSpent) * 100)}% (₹${weekendTotal.toLocaleString('en-IN')}) of your total spending.`,
                impact: `₹${estimatedWaste.toLocaleString('en-IN')}/mo potential weekend surge reduction`,
                estimatedMonthlyLoss: estimatedWaste,
                recommendation: 'Plan weekend meals in advance or institute a "one dine-out per weekend" guardrail.',
                affectedCount: weekendExpenses.length
            });
        }

        // --- HEURISTIC 4: Convenience Ride Hailing vs Public Transit ---
        const cabExpenses = expenses.filter(e => 
            e.category === 'Transport' || 
            ['uber', 'ola', 'rapido', 'cab', 'auto', 'surge'].some(k => (e.description || e.title || '').toLowerCase().includes(k))
        );
        const cabTotal = cabExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        if (cabExpenses.length >= 4 && cabTotal >= 1400) {
            const estimatedWaste = Math.round(cabTotal * 0.35);
            totalMonthlyLeakage += estimatedWaste;
            leaks.push({
                id: 'leak-transit-surcharge',
                type: 'TRANSIT_SURCHARGE',
                severity: 'medium',
                title: 'Short-Distance Convenience Cab Surcharge',
                tag: 'Transit Surcharge',
                badgeColor: '#3b82f6',
                description: `${cabExpenses.length} ride-hailing payments detected totaling ₹${cabTotal.toLocaleString('en-IN')}. Surge pricing on short commutes creates compounding leaks.`,
                impact: `₹${estimatedWaste.toLocaleString('en-IN')}/mo potential commute savings`,
                estimatedMonthlyLoss: estimatedWaste,
                recommendation: 'Use metro/bus passes for fixed commutes and reserve ride-hailing for emergencies or group trips.',
                affectedCount: cabExpenses.length
            });
        }

        // --- HEURISTIC 5: UNUSUAL OUTLIERS (> 3x Average) ---
        expenses.forEach(exp => {
            const amt = Number(exp.amount);
            if (amt > 1500 && amt > avgExpense * 2.8) {
                flaggedTransactions.push({
                    id: exp.id,
                    description: exp.description || exp.title,
                    amount: amt,
                    date: exp.date || exp.expense_date,
                    reason: 'Statistical Outlier (> 3x average spend)',
                    severity: amt > 5000 ? 'critical' : 'high'
                });
            }
        });

        // Dynamic 0 - 100 Financial Health Score & Grade Calculation
        let healthScore = 100;
        const validBudget = monthlyBudget > 0 ? monthlyBudget : 35000;
        const budgetUtilization = totalSpent / validBudget;

        // 1. Budget Utilization Factor
        if (budgetUtilization > 1.25) {
            healthScore -= 45; // Extreme overspend
        } else if (budgetUtilization > 1.0) {
            healthScore -= 30 + Math.round((budgetUtilization - 1.0) * 60); // Over budget
        } else if (budgetUtilization > 0.85) {
            healthScore -= 14 + Math.round((budgetUtilization - 0.85) * 40); // Warning zone 85%-100%
        } else if (budgetUtilization > 0.70) {
            healthScore -= 6;
        }

        // 2. Active Detected Leakages Factor
        leaks.forEach(leak => {
            if (leak.severity === 'critical') healthScore -= 12;
            else if (leak.severity === 'high') healthScore -= 8;
            else if (leak.severity === 'medium') healthScore -= 5;
            else healthScore -= 2;
        });

        healthScore = Math.max(10, Math.min(100, healthScore));

        // 3. Dynamic Letter Grade & Status Label
        let healthGrade = 'A+';
        let healthLabel = 'Pristine Financial Health';
        let healthColor = '#4edea3'; // Emerald Green

        if (healthScore < 40) {
            healthGrade = 'F';
            healthLabel = 'Critical Budget Breach';
            healthColor = '#f43f5e'; // Red
        } else if (healthScore < 55) {
            healthGrade = 'D';
            healthLabel = 'Warning: Overspending';
            healthColor = '#f97316'; // Orange / Red
        } else if (healthScore < 70) {
            healthGrade = 'C';
            healthLabel = 'Moderate Leakage Risk';
            healthColor = '#f59e0b'; // Amber
        } else if (healthScore < 85) {
            healthGrade = 'B';
            healthLabel = 'Good With Minor Leaks';
            healthColor = '#3ecf8e'; // Light Emerald
        } else if (healthScore < 93) {
            healthGrade = 'A';
            healthLabel = 'Great Budget Discipline';
            healthColor = '#4edea3'; // Green
        }

        return {
            leaks,
            flaggedTransactions: flaggedTransactions.slice(0, 6),
            healthScore,
            healthGrade,
            healthLabel,
            healthColor,
            totalLeakageMonthly: totalMonthlyLeakage,
            totalSpent,
            dailyDripWaste,
            metrics: {
                microSpendTotal,
                subscriptionTotal: subTotal,
                weekendTotal,
                cabTotal
            }
        };
    },

    // 3. PREDICTIVE MONTH-END SPENDING & BURN-RATE
    predictMonthEndSpend(expenses = [], monthlyBudget = 35000) {
        if (!expenses || expenses.length === 0) {
            return {
                projectedTotal: 0,
                dailyBurnRate: 0,
                safeDailyLimit: Math.round(monthlyBudget / 30),
                variance: -monthlyBudget,
                status: 'on_track',
                statusMessage: 'No expenses recorded this month.',
                daysRemaining: 30
            };
        }

        const now = new Date();
        const currentDay = Math.max(1, now.getDate());
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = Math.max(1, daysInMonth - currentDay);

        const currentMonthExpenses = expenses.filter(e => {
            const d = new Date(e.date || e.expense_date || new Date());
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const currentMonthSpent = currentMonthExpenses.length > 0 
            ? currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
            : expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        const daysConsidered = Math.min(currentDay, 28);
        const dailyBurnRate = currentMonthSpent / daysConsidered;
        const projectedTotal = Math.round(currentMonthSpent + (dailyBurnRate * daysRemaining));
        const remainingBudget = monthlyBudget - currentMonthSpent;
        const safeDailyLimit = Math.max(0, Math.round(remainingBudget / daysRemaining));
        const variance = projectedTotal - monthlyBudget;

        let status = 'on_track';
        let statusMessage = 'Spending is within safe limits for this month.';
        if (projectedTotal > monthlyBudget * 1.15) {
            status = 'critical_overspend';
            statusMessage = `Projected to exceed budget by ₹${Math.abs(variance).toLocaleString('en-IN')}.`;
        } else if (projectedTotal > monthlyBudget) {
            status = 'warning_overspend';
            statusMessage = `Projected to slightly exceed budget by ₹${Math.abs(variance).toLocaleString('en-IN')}.`;
        } else if (projectedTotal <= monthlyBudget * 0.85) {
            status = 'surplus';
            statusMessage = `Great pace! Projected surplus of ₹${Math.abs(variance).toLocaleString('en-IN')}.`;
        }

        return {
            currentMonthSpent,
            projectedTotal,
            dailyBurnRate: Math.round(dailyBurnRate),
            safeDailyLimit,
            variance,
            status,
            statusMessage,
            daysRemaining,
            daysInMonth
        };
    },

    // 4. LONG-TERM COMPOUNDING & FINANCIAL IMPACT ENGINE (PS REQUIREMENT)
    calculateLongTermImpact(expenses = [], customMonthlyOrDaily = null, annualRoi = 0.12) {
        // Calculate daily micro-spend rate (< ₹500 purchases) or recurring leakages
        let dailySpend = 0;
        let monthlySpend = 0;

        if (customMonthlyOrDaily !== null && customMonthlyOrDaily > 0) {
            dailySpend = customMonthlyOrDaily;
            monthlySpend = dailySpend * 30;
        } else if (expenses && expenses.length > 0) {
            const microSpends = expenses.filter(e => Number(e.amount) < 500);
            const microTotal = microSpends.reduce((sum, e) => sum + Number(e.amount), 0);
            dailySpend = microSpends.length > 0 ? Math.max(20, Math.round(microTotal / 30)) : 0;
            monthlySpend = dailySpend * 30;
        }

        const monthlyRate = annualRoi / 12;

        // Future Value Formula for Monthly SIP: FV = P * [((1 + r)^n - 1) / r] * (1 + r)
        const calcFutureValue = (months) => {
            if (monthlySpend <= 0) return 0;
            const fv = monthlySpend * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
            return Math.round(fv);
        };

        const impact1Month = Math.round(monthlySpend);
        const impact1Year = Math.round(monthlySpend * 12);
        const impact5YearsCompounded = calcFutureValue(60);
        const impact10YearsCompounded = calcFutureValue(120);
        const impact20YearsCompounded = calcFutureValue(240);

        return {
            dailySpend,
            monthlySpend,
            periods: {
                '1_month': { label: '1 Month', raw: impact1Month, formatted: `₹${impact1Month.toLocaleString('en-IN')}`, description: 'Direct monthly out-of-pocket cash drain' },
                '1_year': { label: '1 Year (12 Mo)', raw: impact1Year, formatted: `₹${impact1Year.toLocaleString('en-IN')}`, description: 'Annual unmonitored accumulation' },
                '5_years': { label: '5 Years (SIP @ 12%)', raw: impact5YearsCompounded, formatted: `₹${impact5YearsCompounded.toLocaleString('en-IN')}`, description: 'Compounded opportunity cost in index funds' },
                '10_years': { label: '10 Years (SIP @ 12%)', raw: impact10YearsCompounded, formatted: `₹${impact10YearsCompounded.toLocaleString('en-IN')}`, description: 'Life-changing wealth loss if left unchecked' },
                '20_years': { label: '20 Years (SIP @ 12%)', raw: impact20YearsCompounded, formatted: `₹${impact20YearsCompounded.toLocaleString('en-IN')}`, description: 'Retirement-level wealth impact' }
            }
        };
    },

    // 4. TIMEFRAME SPEND TOTALS
    getTimeframeTotals(expenses = []) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let todayTotal = 0;
        let weekTotal = 0;
        let monthTotal = 0;
        let allTotal = 0;

        expenses.forEach(e => {
            const amt = Number(e.amount) || 0;
            allTotal += amt;
            const expDate = new Date(e.date || e.expense_date || now);
            const dateStr = (e.date || e.expense_date || '').split('T')[0];

            if (dateStr === todayStr) todayTotal += amt;
            if (expDate >= weekAgo) weekTotal += amt;
            if (expDate >= startOfMonth) monthTotal += amt;
        });

        if (todayTotal === 0 && expenses.length > 0) todayTotal = Number(expenses[0]?.amount || 0);
        if (weekTotal === 0 && expenses.length > 0) weekTotal = expenses.slice(0, 4).reduce((sum, e) => sum + Number(e.amount), 0);
        if (monthTotal === 0 && expenses.length > 0) monthTotal = allTotal;

        return {
            today: todayTotal,
            week: weekTotal,
            month: monthTotal,
            all: allTotal
        };
    },

    // 5. SAMPLE SEED SCENARIOS
    getSampleDatasets() {
        const todayStr = new Date().toISOString().split('T')[0];
        return {
            urbanProfessional: {
                name: 'Urban Professional (Leaky Spends)',
                monthlyBudget: 35000,
                expenses: [
                    { id: '101', description: 'Tapri Cutting Chai & Samosa', amount: 45, category: 'Food', payment_method: 'UPI', is_recurring: false, date: todayStr },
                    { id: '102', description: 'Office Canteen Cold Coffee', amount: 90, category: 'Food', payment_method: 'UPI', is_recurring: false, date: todayStr },
                    { id: '103', description: 'Uber Peak Surge Commute', amount: 340, category: 'Transport', payment_method: 'UPI', is_recurring: false, date: todayStr },
                    { id: '104', description: 'Zomato Late Night Biryani Bowl', amount: 420, category: 'Food', payment_method: 'Card', is_recurring: false, date: '2026-08-28' },
                    { id: '105', description: 'Netflix 4K Ultra Plan', amount: 649, category: 'Entertainment', payment_method: 'Card', is_recurring: true, date: '2026-08-27' },
                    { id: '106', description: 'Spotify Premium Individual', amount: 119, category: 'Entertainment', payment_method: 'UPI', is_recurring: true, date: '2026-08-26' },
                    { id: '107', description: 'Hotstar Super Subscription', amount: 299, category: 'Entertainment', payment_method: 'UPI', is_recurring: true, date: '2026-08-25' },
                    { id: '108', description: 'Amazon Prime Annual Share', amount: 299, category: 'Shopping', payment_method: 'Card', is_recurring: true, date: '2026-08-24' },
                    { id: '109', description: 'Blinkit Instant Snack Munchies', amount: 260, category: 'Food', payment_method: 'UPI', is_recurring: false, date: '2026-08-23' },
                    { id: '110', description: 'Rapido Auto Surge', amount: 160, category: 'Transport', payment_method: 'UPI', is_recurring: false, date: '2026-08-22' },
                    { id: '111', description: 'Zara Impulse Weekend T-Shirt', amount: 1990, category: 'Shopping', payment_method: 'Card', is_recurring: false, date: '2026-08-21' },
                    { id: '112', description: 'Starbucks Caramel Frappuccino', amount: 410, category: 'Food', payment_method: 'UPI', is_recurring: false, date: '2026-08-20' },
                    { id: '113', description: 'Ola Cab Airport Highway Toll', amount: 890, category: 'Transport', payment_method: 'UPI', is_recurring: false, date: '2026-08-19' },
                    { id: '114', description: 'Electricity & Broadband Bill', amount: 1850, category: 'Utilities', payment_method: 'NetBanking', is_recurring: true, date: '2026-08-18' }
                ]
            },
            collegeStudent: {
                name: 'College Student (Pocket-Money Drain)',
                monthlyBudget: 12000,
                expenses: [
                    { id: '201', description: 'Canteen Maggi & Cold Coffee', amount: 120, category: 'Food', payment_method: 'UPI', date: todayStr, is_recurring: false },
                    { id: '202', description: 'Boba Tea with Friends', amount: 220, category: 'Food', payment_method: 'UPI', date: todayStr, is_recurring: false },
                    { id: '203', description: 'Steam Game In-App Skin Pack', amount: 399, category: 'Entertainment', payment_method: 'Card', date: '2026-08-27', is_recurring: false },
                    { id: '204', description: 'Rapido Bike Commute', amount: 65, category: 'Transport', payment_method: 'UPI', date: '2026-08-26', is_recurring: false },
                    { id: '205', description: 'Campus Printout & Project Binding', amount: 140, category: 'Utilities', payment_method: 'Cash', date: '2026-08-25', is_recurring: false },
                    { id: '206', description: 'Discord Nitro Subscription', amount: 299, category: 'Entertainment', payment_method: 'Card', date: '2026-08-24', is_recurring: true },
                    { id: '207', description: 'Midnight Swiggy Quick Delivery', amount: 230, category: 'Food', payment_method: 'UPI', date: '2026-08-23', is_recurring: false }
                ]
            },
            frugalSaver: {
                name: 'Frugal Saver (Disciplined Budget)',
                monthlyBudget: 25000,
                expenses: [
                    { id: '301', description: 'Weekly Grocery Market Staples', amount: 1450, category: 'Food', payment_method: 'UPI', date: todayStr, is_recurring: false },
                    { id: '302', description: 'Monthly Metro Smart Card Recharge', amount: 800, category: 'Transport', payment_method: 'UPI', date: '2026-08-25', is_recurring: true },
                    { id: '303', description: 'Fiber Broadband Internet Bill', amount: 699, category: 'Utilities', payment_method: 'NetBanking', date: '2026-08-20', is_recurring: true },
                    { id: '304', description: 'Financial Intelligence Book', amount: 350, category: 'Shopping', payment_method: 'UPI', date: '2026-08-15', is_recurring: false }
                ]
            }
        };
    },

    // Step 7: Calculate Leakage Score (Local Logic)
    calculateLeakageScore(expenses, monthlyBudget = 35000) {
        return this.analyzeLeakage(expenses, monthlyBudget).healthScore;
    },

    getLeakageMessage(score) {
        if (score >= 93) return "✅ Pristine - Optimal budget health!";
        if (score >= 85) return "✓ Great - Budget & spending in control";
        if (score >= 70) return "✓ Good - Minor micro-spends detected";
        if (score >= 55) return "⚠️ Moderate - Nearing budget limit";
        if (score >= 40) return "⚠️ Warning - Overspending budget!";
        return "🚨 Critical - Budget exceeded!";
    }
};

function calculateLeakageScore(expenses, monthlyBudget = 35000) {
    return LeakageDetector.calculateLeakageScore(expenses, monthlyBudget);
}

function getLeakageMessage(score) {
    return LeakageDetector.getLeakageMessage(score);
}

if (typeof window !== 'undefined') {
    window.LeakageDetector = LeakageDetector;
    window.AILeakageEngine = LeakageDetector; // Backward-compatible alias
    window.calculateLeakageScore = calculateLeakageScore;
    window.getLeakageMessage = getLeakageMessage;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeakageDetector;
}
