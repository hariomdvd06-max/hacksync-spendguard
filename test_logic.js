/**
 * Automated Verification for Local Logic Engine & Supabase Adapter
 */

const LeakageDetector = require('./leakage_detector.js');

function testLocalLogic() {
    console.log('🧪 Starting Local Logic Engine & Categorizer Automated Verification...\n');

    // 1. Test Semantic Categorization
    const testCases = [
        { input: 'Cutting Chai & Bun Maska', expected: 'Food' },
        { input: 'Uber Auto Surge to Office', expected: 'Transport' },
        { input: 'Netflix 4K Ultra Subscription', expected: 'Entertainment' },
        { input: 'Zara Summer Cotton T-Shirt', expected: 'Shopping' },
        { input: 'Electricity Bill & Fiber Broadband', expected: 'Utilities' },
        { input: 'Random Hardware Screws & Bolts', expected: 'Other' }
    ];

    let catPassed = 0;
    for (const tc of testCases) {
        const cat = LeakageDetector.categorize(tc.input);
        const match = cat === tc.expected;
        if (match) catPassed++;
        console.log(`[${match ? 'PASS' : 'FAIL'}] "${tc.input}" -> ${cat} (Expected: ${tc.expected})`);
    }
    console.log(`\n✅ Categorization Tests: ${catPassed}/${testCases.length} Passed!`);

    // 2. Test Financial Leakage Detection
    const sample = LeakageDetector.getSampleDatasets().urbanProfessional;
    const leakageResult = LeakageDetector.analyzeLeakage(sample.expenses, sample.monthlyBudget);

    console.log('\n--- Financial Leakage Analysis Results ---');
    console.log('Score:', leakageResult.healthScore, `/ 100 (${leakageResult.healthGrade} - ${leakageResult.healthLabel})`);
    console.log('Avoidable Monthly Leakage:', `₹${leakageResult.totalLeakageMonthly}/mo`);
    console.log('Daily Drip Waste:', `₹${leakageResult.dailyDripWaste}/day`);
    console.log('Detected Leaks Count:', leakageResult.leaks.length);

    leakageResult.leaks.forEach((leak, idx) => {
        console.log(`  ${idx + 1}. [${leak.severity.toUpperCase()}] ${leak.title} -> ${leak.impact}`);
    });

    // 3. Test Month-End Prediction
    const pred = LeakageDetector.predictMonthEndSpend(sample.expenses, sample.monthlyBudget);
    console.log('\n--- Month-End Spend Forecast ---');
    console.log('Projected Spend:', `₹${pred.projectedTotal}`);
    console.log('Safe Daily Limit:', `₹${pred.safeDailyLimit}/day`);
    console.log('Daily Burn Rate:', `₹${pred.dailyBurnRate}/day`);
    console.log('Status:', pred.status, `(${pred.statusMessage})`);

    // 4. Test Long-Term Compounding Impact (PS Requirement)
    const impact = LeakageDetector.calculateLongTermImpact([], 150, 0.12);
    console.log('\n--- Long-Term Compounding Impact (₹150/day) ---');
    console.log('1 Month Outflow:', impact.periods['1_month'].formatted);
    console.log('1 Year Accumulation:', impact.periods['1_year'].formatted);
    console.log('5 Years Compounded @ 12%:', impact.periods['5_years'].formatted);
    console.log('10 Years Compounded @ 12%:', impact.periods['10_years'].formatted);

    const allPassed = catPassed === testCases.length &&
                      typeof leakageResult.healthScore === 'number' &&
                      leakageResult.healthScore >= 0 && leakageResult.healthScore <= 100 &&
                      leakageResult.leaks.length > 0 &&
                      typeof pred.projectedTotal === 'number' &&
                      impact.periods['5_years'].raw > 0;

    if (allPassed) {
        console.log('\n🎉 ALL LOCAL LOGIC, LEAKAGE DETECTION & PS REQUIREMENT TESTS PASSED!\n');
        process.exit(0);
    } else {
        console.error('\n❌ Verification Failed.');
        process.exit(1);
    }
}

testLocalLogic();
