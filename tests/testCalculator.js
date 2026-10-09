import {
  calculateFinancialPlan,
  simulateYearlySwp,
  reverseEngineerRetirementGoal,
  calculateRequiredRetirementCorpus,
  calculateRequiredMonthlySip
} from '../src/calculator.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error('ASSERTION FAILED: ' + message);
  }
}

console.log('Running 12 validation test cases for Calculator Engine...');

// Test 1: SIP Only
{
  const res = calculateFinancialPlan({ monthlySip: 25000, sipPeriodYears: 10, lumpsum: 0, expectedReturn: 12 });
  assert(res.summary.totalSipInvested === 3000000, 'Test 1: Total SIP Invested mismatch');
  assert(res.summary.initialLumpsum === 0, 'Test 1: Lumpsum should be 0');
  assert(res.accumulationRows.length === 10, 'Test 1: Accumulation rows should be 10');
  assert(!isNaN(res.summary.finalAccumulationCorpus) && res.summary.finalAccumulationCorpus > 3000000, 'Test 1: Corpus invalid');
  console.log('✔ Test 1 (SIP only) Passed');
}

// Test 2: Lumpsum Only
{
  const res = calculateFinancialPlan({ monthlySip: 0, sipPeriodYears: 5, lumpsum: 1000000, expectedReturn: 10 });
  assert(res.summary.totalSipInvested === 0, 'Test 2: Total SIP should be 0');
  assert(res.summary.initialLumpsum === 1000000, 'Test 2: Lumpsum mismatch');
  // Year 1 end should be 1000000 * 1.10 = 1100000
  assert(Math.abs(res.accumulationRows[0].endAmount - 1100000) < 0.01, 'Test 2: Year 1 end amount');
  console.log('✔ Test 2 (Lumpsum only) Passed');
}

// Test 3: SIP + Lumpsum
{
  const res = calculateFinancialPlan({ monthlySip: 35000, sipPeriodYears: 17, lumpsum: 500000, expectedReturn: 12 });
  assert(res.summary.totalInvested === (35000 * 12 * 17) + 500000, 'Test 3: Total invested mismatch');
  assert(res.accumulationRows[0].beginningAmount === 500000 + 420000, 'Test 3: Beg amount should have lumpsum in year 1');
  assert(res.accumulationRows[1].beginningAmount === res.accumulationRows[0].endAmount + 420000, 'Test 3: Beg amount in year 2 must NOT add lumpsum again');
  console.log('✔ Test 3 (SIP + Lumpsum) Passed');
}

// Test 4: Empty return -> 12% default
{
  const res = calculateFinancialPlan({ monthlySip: 10000, sipPeriodYears: 5, expectedReturn: '' });
  assert(res.summary.expectedReturn === 12, 'Test 4: Expected return must default to 12%');
  const resNull = calculateFinancialPlan({ monthlySip: 10000, sipPeriodYears: 5, expectedReturn: null });
  assert(resNull.summary.expectedReturn === 12, 'Test 4: Null return must default to 12%');
  console.log('✔ Test 4 (Empty return -> 12%) Passed');
}

// Test 5: Custom Return
{
  const res = calculateFinancialPlan({ monthlySip: 10000, sipPeriodYears: 5, expectedReturn: 15 });
  assert(res.summary.expectedReturn === 15, 'Test 5: Custom return should be 15%');
  console.log('✔ Test 5 (Custom return) Passed');
}

// Test 6: Custom Inflation
{
  const res = calculateFinancialPlan({ annualExpenses: 1000000, inflation: 7, projectionYears: 5 });
  assert(res.summary.inflationRate === 7, 'Test 6: Inflation rate should be 7%');
  const expY1 = res.retirementRows[0].householdExpense;
  const expY2 = res.retirementRows[1].householdExpense;
  assert(Math.abs(expY2 - expY1 * 1.07) < 0.01, 'Test 6: Expense growth mismatch');
  console.log('✔ Test 6 (Custom inflation) Passed');
}

// Test 7: Custom SWP Return
{
  const res = calculateFinancialPlan({ swpReturn: 8 });
  assert(res.summary.swpReturn === 8, 'Test 7: SWP return mismatch');
  console.log('✔ Test 7 (Custom SWP return) Passed');
}

// Test 8: Different SIP Periods
{
  const res10 = calculateFinancialPlan({ sipPeriodYears: 10 });
  const res30 = calculateFinancialPlan({ sipPeriodYears: 30 });
  assert(res10.accumulationRows.length === 10, 'Test 8: 10 years');
  assert(res30.accumulationRows.length === 30, 'Test 8: 30 years');
  console.log('✔ Test 8 (Different SIP periods) Passed');
}

// Test 9: Corpus Exhaustion
{
  // Small corpus with very high expenses
  const res = calculateFinancialPlan({ monthlySip: 5000, sipPeriodYears: 5, lumpsum: 0, annualExpenses: 5000000, projectionYears: 30 });
  assert(res.summary.isExhaustedEver === true, 'Test 9: Corpus should exhaust');
  assert(res.summary.exhaustionYear !== null, 'Test 9: Exhaustion year should be defined');
  const exhaustedRow = res.retirementRows.find(r => r.yearStatus === 'depleted');
  assert(exhaustedRow !== undefined, 'Test 9: Depleted row should exist');
  console.log('✔ Test 9 (Corpus exhaustion) Passed');
}

// Test 10: Corpus Surviving Entire Projection
{
  // Large corpus, low expense
  const res = calculateFinancialPlan({ monthlySip: 100000, sipPeriodYears: 30, annualExpenses: 600000, inflation: 3, projectionYears: 50 });
  assert(res.summary.isExhaustedEver === false, 'Test 10: Corpus should survive');
  assert(res.summary.exhaustionYear === null, 'Test 10: Exhaustion year should be null');
  console.log('✔ Test 10 (Corpus surviving entire projection) Passed');
}

// Test 11: Zero Lumpsum
{
  const res = calculateFinancialPlan({ monthlySip: 20000, lumpsum: 0, sipPeriodYears: 10 });
  assert(res.summary.initialLumpsum === 0, 'Test 11: Lumpsum should be 0');
  assert(res.summary.totalInvested === res.summary.totalSipInvested, 'Test 11: Total invested should equal SIP');
  console.log('✔ Test 11 (Zero lumpsum) Passed');
}

// Test 12: Zero Annual Expense
{
  const res = calculateFinancialPlan({ annualExpenses: 0, projectionYears: 20 });
  assert(res.summary.initialAnnualExpense === 0, 'Test 12: Expenses should be 0');
  assert(res.summary.isExhaustedEver === false, 'Test 12: Should never exhaust with 0 expenses');
  assert(res.retirementRows[10].endCorpus > res.retirementRows[0].beginningCorpus, 'Test 12: Corpus should grow in retirement with 0 expenses');
  console.log('✔ Test 12 (Zero annual expense) Passed');
}

// Exact match verification against original Excel
{
  const res = calculateFinancialPlan({
    monthlySip: 35000,
    sipPeriodYears: 17,
    lumpsum: 0,
    expectedReturn: 12,
    swpReturn: 9,
    inflation: 0, // original Excel had no inflation
    annualExpenses: 2400000,
    currentAge: 43,
    projectionYears: 29
  });
  
  // Check Year 17 of accumulation
  const yr17 = res.accumulationRows[16];
  assert(Math.abs(yr17.beginningAmount - 19453760.44) < 0.1, `Yr 17 Beg: ${yr17.beginningAmount}`);
  assert(Math.abs(yr17.gain - 2309251.25) < 0.1, `Yr 17 Gain: ${yr17.gain}`);
  assert(Math.abs(yr17.endAmount - 21763011.70) < 0.1, `Yr 17 End: ${yr17.endAmount}`);
  
  // Check Year 1 of retirement (with true month-by-month SWP simulation)
  const retYr1 = res.retirementRows[0];
  assert(Math.abs(retYr1.beginningCorpus - 21763011.70) < 0.1, `Ret Yr 1 Beg: ${retYr1.beginningCorpus}`);
  assert(Math.abs(retYr1.gain - 1921241.96) < 0.1, `Ret Yr 1 Gain: ${retYr1.gain}`);
  assert(Math.abs(retYr1.endCorpus - 21284253.66) < 0.1, `Ret Yr 1 End: ${retYr1.endCorpus}`);
  assert(retYr1.months.length === 12, 'Ret Yr 1 should have 12 monthly detail records');
  assert(Math.abs(retYr1.endCorpus - retYr1.months[11].closingCorpus) < 0.001, 'Ret Yr 1 End Corpus must equal Month 12 closing corpus');
  
  console.log('✔ Test 12 (Accumulation & True Monthly SWP Validation) PASSED!');
}

// User Validation Test Case (Exact prompt specifications)
{
  const startCorpus = 143865708.56;
  const annualExpense = 1346997;
  const annualReturn = 6; // 6%
  const monthlyReturnExpected = (annualReturn / 100) / 12; // 0.5% = 0.005
  const monthlyWithdrawalExpected = annualExpense / 12; // 1,12,249.75

  // We test simulateYearlySwp directly
  const sim = simulateYearlySwp({
    openingCorpus: startCorpus,
    annualExpense: annualExpense,
    annualReturn: annualReturn / 100,
    futureExpense: 0,
  });

  // Verify Month 1
  const m1 = sim.months[0];
  assert(Math.abs(m1.openingCorpus - 143865708.56) < 0.01, `M1 Opening: ${m1.openingCorpus}`);
  assert(Math.abs(m1.monthlyWithdrawal - 112249.75) < 0.01, `M1 Withdrawal: ${m1.monthlyWithdrawal}`);
  assert(Math.abs(m1.remainingAfterWithdrawal - 143753458.81) < 0.01, `M1 Remaining: ${m1.remainingAfterWithdrawal}`);
  assert(Math.abs(m1.monthlyGain - 718767.29) < 0.02, `M1 Gain expected ~718767.29, got ${m1.monthlyGain}`);
  assert(Math.abs(m1.closingCorpus - 144472226.10) < 0.02, `M1 Closing expected ~144472226.10, got ${m1.closingCorpus}`);

  // Verify Month 2 starts with Month 1 closing
  const m2 = sim.months[1];
  assert(Math.abs(m2.openingCorpus - m1.closingCorpus) < 0.00001, 'Month 2 must start with Month 1 closing corpus');

  // Verify Month 12 closing equals Year 1 Ending Corpus
  const m12 = sim.months[11];
  assert(Math.abs(sim.endCorpus - m12.closingCorpus) < 0.00001, 'Year 1 ending corpus must equal Month 12 closing corpus');

  // Verify Year 1 Ending Corpus ≈ ₹15,13,47,443.55
  assert(Math.abs(sim.endCorpus - 151347443.55) < 0.02, `Year 1 End expected 151347443.55, got ${sim.endCorpus}`);

  // Verify Total Annual Withdrawal = ₹13,46,997
  assert(Math.abs(sim.totalAnnualWithdrawal - 1346997) < 0.01, `Total Withdrawal expected 1346997, got ${sim.totalAnnualWithdrawal}`);

  // Verify Total Gain ≈ ₹88,28,731.99
  assert(Math.abs(sim.totalAnnualGain - 8828731.99) < 0.02, `Total Gain expected 8828731.99, got ${sim.totalAnnualGain}`);

  console.log('✔ EXACT USER VALIDATION TEST (Month-by-Month SWP: ₹15,13,47,443.55 & Gain ₹88,28,731.99) PASSED!');
}

// Test 13: Step-Up SIP (% Mode)
{
  const res = calculateFinancialPlan({
    monthlySip: 10000,
    sipPeriodYears: 3,
    lumpsum: 0,
    expectedReturn: 12,
    stepUpEnabled: true,
    stepUpType: 'percent',
    stepUpValue: 10,
  });
  assert(res.accumulationRows[0].monthlySip === 10000, 'Test 13: Year 1 SIP should be 10000');
  assert(res.accumulationRows[1].monthlySip === 11000, 'Test 13: Year 2 SIP should be 11000 (+10%)');
  assert(res.accumulationRows[2].monthlySip === 12100, 'Test 13: Year 3 SIP should be 12100 (+10% of 11000)');
  assert(res.summary.totalSipInvested === 397200, 'Test 13: Total SIP invested mismatch');
  console.log('✔ Test 13 (Step-Up SIP % mode) Passed');
}

// Test 14: Step-Up SIP (Rupees Mode)
{
  const res = calculateFinancialPlan({
    monthlySip: 10000,
    sipPeriodYears: 3,
    lumpsum: 0,
    expectedReturn: 12,
    stepUpEnabled: true,
    stepUpType: 'amount',
    stepUpValue: 1000,
  });
  assert(res.accumulationRows[0].monthlySip === 10000, 'Test 14: Year 1 SIP should be 10000');
  assert(res.accumulationRows[1].monthlySip === 11000, 'Test 14: Year 2 SIP should be 11000 (+1000)');
  assert(res.accumulationRows[2].monthlySip === 12000, 'Test 14: Year 3 SIP should be 12000 (+1000)');
  assert(res.summary.totalSipInvested === 396000, 'Test 14: Total SIP invested mismatch');
  console.log('✔ Test 14 (Step-Up SIP ₹ mode) Passed');
}

// Test 15: Future Expenses Deduction & Compounding
{
  const res = calculateFinancialPlan({
    monthlySip: 10000,
    sipPeriodYears: 3,
    lumpsum: 0,
    expectedReturn: 12,
    startYear: 2026,
    futureExpensesEnabled: true,
    futureExpenses: {
      2027: 50000,
    },
  });
  // Yr 1 (2026): Start=0, Exp=0, Annual SIP=120000, Gain=7200, End=127200
  assert(res.accumulationRows[0].startAmount === 0, 'Test 15: Yr 1 start should be 0');
  assert(res.accumulationRows[0].endAmount === 127200, 'Test 15: Yr 1 end should be 127200');
  
  // Yr 2 (2027): Start=127200, Exp=50000, NetStart=77200, Annual SIP=120000, Gain=(77200*0.12) + (120000*0.06) = 9264 + 7200 = 16464, End = 77200 + 120000 + 16464 = 213664
  const yr2 = res.accumulationRows[1];
  assert(yr2.startAmount === 127200, 'Test 15: Yr 2 start amount should be 127200');
  assert(yr2.futureExpense === 50000, 'Test 15: Yr 2 future expense should be 50000');
  assert(yr2.netStartAmount === 77200, 'Test 15: Yr 2 net start amount should be 77200');
  assert(yr2.hasCorpusError === false, 'Test 15: Should not have corpus error');
  assert(Math.abs(yr2.gain - 16464) < 0.01, `Test 15: Yr 2 gain expected 16464, got ${yr2.gain}`);
  assert(Math.abs(yr2.endAmount - 213664) < 0.01, `Test 15: Yr 2 end expected 213664, got ${yr2.endAmount}`);
  console.log('✔ Test 15 (Future Expenses Deduction & Compounding) Passed');
}

// Test 16: Future Expense Exceeds Opening Corpus (Error Handling)
{
  const res = calculateFinancialPlan({
    monthlySip: 10000,
    sipPeriodYears: 3,
    lumpsum: 0,
    expectedReturn: 12,
    startYear: 2026,
    futureExpensesEnabled: true,
    futureExpenses: {
      2026: 50000, // Year 1 startAmount is 0 (no lumpsum), expense is 50000 > 0
    },
  });
  assert(res.accumulationRows[0].hasCorpusError === true, 'Test 16: Yr 1 must have hasCorpusError=true');
  assert(res.accumulationRows[0].corpusShortfall === 50000, 'Test 16: Shortfall should be 50000');
  assert(res.summary.hasAnyCorpusError === true, 'Test 16: summary must have hasAnyCorpusError=true');
  assert(res.summary.corpusErrorYears.includes(2026), 'Test 16: Error years must include 2026');
  console.log('✔ Test 16 (Insufficient Corpus Error Detection) Passed');
}

// Test 17: Delayed Retirement & SIP Contribution Pause (e.g. 13 Yrs SIP, Retires at Age 60)
{
  const res = calculateFinancialPlan({
    monthlySip: 10000,
    sipPeriodYears: 13,
    currentAge: 43,
    retirementAge: 60,
    expectedReturn: 12,
    startYear: 2026,
    annualExpenses: 1200000,
    projectionYears: 20,
  });

  assert(res.summary.sipActiveYears === 13, 'Test 17: Active SIP years should be 13');
  assert(res.summary.totalAccYears === 17, 'Test 17: Total accumulation years should be 17 (Age 60 - 43)');
  assert(res.summary.growthPauseYears === 4, 'Test 17: Pause growth years should be 4');
  assert(res.summary.retirementStartAge === 60, 'Test 17: Retirement should start at Age 60');
  assert(res.accumulationRows.length === 17, 'Test 17: Accumulation rows should be 17');

  // Year 13 (Age 55) should have active SIP
  const yr13 = res.accumulationRows[12];
  assert(yr13.isSipActive === true, 'Test 17: Yr 13 should have active SIP');
  assert(yr13.annualSip === 120000, 'Test 17: Yr 13 annual SIP should be 120000');
  assert(yr13.age === 55, 'Test 17: Yr 13 age should be 55');

  // Year 14 (Age 56) SIP has stopped, corpus earns pure 12% compounding
  const yr14 = res.accumulationRows[13];
  assert(yr14.isSipActive === false, 'Test 17: Yr 14 SIP should be inactive (paused)');
  assert(yr14.monthlySip === 0, 'Test 17: Yr 14 monthly SIP should be 0');
  assert(yr14.annualSip === 0, 'Test 17: Yr 14 annual SIP should be 0');
  assert(yr14.startAmount === yr13.endAmount, 'Test 17: Yr 14 startAmount should equal yr 13 endAmount');
  assert(Math.abs(yr14.gain - (yr14.startAmount * 0.12)) < 0.01, 'Test 17: Yr 14 gain should be pure 12% of startAmount');
  assert(Math.abs(yr14.endAmount - (yr14.startAmount * 1.12)) < 0.01, 'Test 17: Yr 14 endAmount should be 1.12 * startAmount');

  // Retirement Stage should start at Age 60
  assert(res.retirementRows[0].age === 60, 'Test 17: First retirement row age should be 60');
  assert(res.retirementRows[0].calendarYear === 2026 + 17, 'Test 17: First retirement row year should be 2043');

  console.log('✔ Test 17 (Delayed Retirement & SIP Pause Compounding) Passed');
}

// Test 18: Future Expense Withdrawal during SIP Pause Compounding Years
{
  const res = calculateFinancialPlan({
    monthlySip: 10000,
    sipPeriodYears: 3, // SIP active in 2026, 2027, 2028 (Ages 43, 44, 45)
    currentAge: 43,
    retirementAge: 48, // 5 total accumulation years (2026 to 2030, Ages 43 to 47)
    expectedReturn: 12,
    startYear: 2026,
    futureExpensesEnabled: true,
    futureExpenses: {
      2029: 50000, // Year 4 (Age 46) when SIP is stopped!
    },
  });

  assert(res.accumulationRows.length === 5, 'Test 18: Should have 5 accumulation rows');
  
  // Year 4 (2029): SIP is 0, Expense is 50000
  const yr4 = res.accumulationRows[3];
  const yr3 = res.accumulationRows[2];
  assert(yr4.isSipActive === false, 'Test 18: Yr 4 SIP must be inactive');
  assert(yr4.monthlySip === 0, 'Test 18: Yr 4 monthly SIP must be 0');
  assert(yr4.annualSip === 0, 'Test 18: Yr 4 annual SIP must be 0');
  assert(yr4.startAmount === yr3.endAmount, 'Test 18: Yr 4 startAmount must equal yr 3 end');
  assert(yr4.futureExpense === 50000, 'Test 18: Yr 4 future expense must be 50000');
  assert(yr4.netStartAmount === yr4.startAmount - 50000, 'Test 18: Net start must be start - 50000');
  // Gain = netStartAmount * 12%
  const expectedGain = yr4.netStartAmount * 0.12;
  assert(Math.abs(yr4.gain - expectedGain) < 0.01, 'Test 18: Yr 4 gain should be netStartAmount * 12%');
  assert(Math.abs(yr4.endAmount - (yr4.netStartAmount + expectedGain)) < 0.01, 'Test 18: Yr 4 endAmount mismatch');

  console.log('✔ Test 18 (Future Expense during SIP Pause Years) Passed');
}

// Test 19: Reverse Engineer Goal (1 Cr with 0 initial SIP)
{
  const goal = reverseEngineerRetirementGoal({
    targetCorpus: 10000000,
    currentAge: 43,
    retirementAge: 63, // 20 years
    existingMonthlySip: 0,
    existingSipYears: 0,
    expectedReturn: 12,
  });

  assert(goal.horizonYears === 20, 'Test 19: Horizon should be 20 years');
  assert(goal.pastSipAccumulated === 0, 'Test 19: Past accumulated should be 0');
  assert(goal.requiredMonthlySip > 10000 && goal.requiredMonthlySip < 12000, 'Test 19: Required SIP in expected range');

  // Verify by running forward accumulation with these reverse-engineered figures
  const forwardPlan = calculateFinancialPlan({
    monthlySip: goal.requiredMonthlySip,
    lumpsum: goal.currentTotalLumpsum,
    sipPeriodYears: goal.horizonYears,
    expectedReturn: goal.expectedReturn,
    currentAge: goal.currentAge,
    retirementAge: goal.retirementAge,
  });

  const diff = Math.abs(forwardPlan.summary.finalAccumulationCorpus - 10000000);
  assert(diff < 200, `Test 19: Final corpus must match target 1 Cr within rounding error (diff: ${diff})`);
  console.log('✔ Test 19 (Reverse Engineer Goal: 1 Cr, Zero past SIP) Passed');
}

// Test 20: Reverse Engineer Goal (1 Cr with ongoing SIP of ₹10,000 for 3 years)
{
  const goal = reverseEngineerRetirementGoal({
    targetCorpus: 10000000,
    currentAge: 43,
    retirementAge: 60, // 17 years horizon
    existingMonthlySip: 10000,
    existingSipYears: 3,
    expectedReturn: 12,
  });

  assert(goal.pastSipAccumulated > 400000 && goal.pastSipAccumulated < 450000, 'Test 20: Past SIP accumulated range');
  assert(goal.futureLumpsumCorpus > 2800000 && goal.futureLumpsumCorpus < 3100000, 'Test 20: Future lumpsum corpus range');
  assert(goal.requiredMonthlySip > 10000 && goal.requiredMonthlySip < 13000, 'Test 20: Required SIP range');
  assert(goal.additionalMonthlySip === goal.requiredMonthlySip - 10000, 'Test 20: Additional SIP calculation');

  // Verify by running forward accumulation with lumpsum = past accumulated and monthlySip = required
  const forwardPlan = calculateFinancialPlan({
    monthlySip: goal.requiredMonthlySip,
    lumpsum: goal.pastSipAccumulated,
    sipPeriodYears: goal.horizonYears,
    expectedReturn: goal.expectedReturn,
    currentAge: goal.currentAge,
    retirementAge: goal.retirementAge,
  });

  const diff = Math.abs(forwardPlan.summary.finalAccumulationCorpus - 10000000);
  assert(diff < 200, `Test 20: Forward plan must reach 1 Cr target within rounding (diff: ${diff})`);
  console.log('✔ Test 20 (Reverse Engineer Goal: 1 Cr with 3yr past SIP) Passed');
}

console.log('ALL 20 EXISTING TESTS VERIFIED SUCCESSFULLY!\n');

console.log('========================================================');
console.log('RUNNING VALIDATION FOR CASES 1 - 10 (NEW GOAL-BASED FLOW)');
console.log('========================================================');

// Case 1 — No Lumpsum
// Current age: 40, Retirement age: 60, Current expense: ₹50,000/month, Lumpsum: ₹0, Ret period: 20 yrs
{
  const curAge = 40;
  const retAge = 60;
  const horizon = retAge - curAge; // 20 yrs
  const curMonthlyExp = 50000;
  const preInf = 8;
  const retInf = 6;
  const swpRet = 9;
  const expRet = 12;
  const sustainYears = 20;
  const lumpsum = 0;

  const monthlyExpAtRet = Math.round(curMonthlyExp * Math.pow(1 + preInf / 100, horizon));
  assert(monthlyExpAtRet === 233048, `Case 1: Monthly expense at retirement expected 233048, got ${monthlyExpAtRet}`);
  const annualExpAtRet = monthlyExpAtRet * 12; // 2796576

  const reqCorpus = calculateRequiredRetirementCorpus({
    annualExpensesAtRetirement: annualExpAtRet,
    monthlyExpenseAtRetirement: monthlyExpAtRet,
    retirementInflation: retInf,
    swpReturn: swpRet,
    retirementSustainabilityYears: sustainYears,
  });
  assert(reqCorpus > 40000000 && reqCorpus < 41500000, `Case 1: Required corpus expected ~4.05 Cr, got ${reqCorpus}`);

  const reqSip = calculateRequiredMonthlySip({
    targetCorpus: reqCorpus,
    currentAge: curAge,
    retirementAge: retAge,
    lumpsum: lumpsum,
    expectedReturn: expRet,
  });
  assert(reqSip > 44000 && reqSip < 45000, `Case 1: Required SIP expected ~44,196, got ${reqSip}`);

  // Run forward financial plan to verify full sustainability
  const plan = calculateFinancialPlan({
    monthlySip: reqSip,
    lumpsum: lumpsum,
    sipPeriodYears: horizon,
    expectedReturn: expRet,
    currentAge: curAge,
    retirementAge: retAge,
    annualExpenses: annualExpAtRet,
    inflation: retInf,
    swpReturn: swpRet,
    retirementSustainabilityYears: sustainYears,
  });

  assert(plan.summary.isExhaustedEver === false, 'Case 1: Plan must not exhaust within 20 years');
  assert(plan.retirementRows.length === 20, 'Case 1: SWP must simulate exactly 20 years');
  assert(plan.summary.sustainabilityYears >= 20, 'Case 1: Sustainability must be >= 20 years');
  console.log(`✔ Case 1 (No lumpsum): Req Corpus = ₹${Math.round(reqCorpus).toLocaleString('en-IN')}, Req SIP = ₹${reqSip}/mo (Sustains 20 yrs) Passed`);
}

// Case 2 — With Lumpsum
// Same as above but with ₹5,00,000 lumpsum. Verify required SIP decreases correctly.
{
  const curAge = 40;
  const retAge = 60;
  const horizon = 20;
  const curMonthlyExp = 50000;
  const monthlyExpAtRet = Math.round(curMonthlyExp * Math.pow(1.08, horizon));
  const annualExpAtRet = monthlyExpAtRet * 12;

  const reqCorpus = calculateRequiredRetirementCorpus({
    annualExpensesAtRetirement: annualExpAtRet,
    retirementInflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 20,
  });

  const reqSipNoLump = calculateRequiredMonthlySip({
    targetCorpus: reqCorpus,
    currentAge: curAge,
    retirementAge: retAge,
    lumpsum: 0,
    expectedReturn: 12,
  });

  const reqSipWithLump = calculateRequiredMonthlySip({
    targetCorpus: reqCorpus,
    currentAge: curAge,
    retirementAge: retAge,
    lumpsum: 500000,
    expectedReturn: 12,
  });

  assert(reqSipWithLump < reqSipNoLump, 'Case 2: Required SIP with lumpsum must be lower than without lumpsum');
  const sipReduction = reqSipNoLump - reqSipWithLump;
  assert(sipReduction > 5000 && sipReduction < 5500, `Case 2: Lumpsum reduction expected ~5,263, got ${sipReduction}`);

  const plan = calculateFinancialPlan({
    monthlySip: reqSipWithLump,
    lumpsum: 500000,
    sipPeriodYears: horizon,
    expectedReturn: 12,
    currentAge: curAge,
    retirementAge: retAge,
    annualExpenses: annualExpAtRet,
    inflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 20,
  });
  assert(plan.summary.isExhaustedEver === false, 'Case 2: Plan with lumpsum must sustain 20 years');
  console.log(`✔ Case 2 (With lumpsum ₹5L): Req SIP reduced from ₹${reqSipNoLump} to ₹${reqSipWithLump}/mo (-₹${sipReduction}) Passed`);
}

// Case 3 — Different Retirement Periods (20, 25, 30 years)
// Verify required corpus and SIP change strictly monotonically.
{
  const annualExpAtRet = Math.round(50000 * Math.pow(1.08, 20)) * 12;

  const corpus20 = calculateRequiredRetirementCorpus({
    annualExpensesAtRetirement: annualExpAtRet,
    retirementInflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 20,
  });

  const corpus25 = calculateRequiredRetirementCorpus({
    annualExpensesAtRetirement: annualExpAtRet,
    retirementInflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 25,
  });

  const corpus30 = calculateRequiredRetirementCorpus({
    annualExpensesAtRetirement: annualExpAtRet,
    retirementInflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 30,
  });

  assert(corpus25 > corpus20, 'Case 3: 25-year corpus must exceed 20-year corpus');
  assert(corpus30 > corpus25, 'Case 3: 30-year corpus must exceed 25-year corpus');

  const sip20 = calculateRequiredMonthlySip({ targetCorpus: corpus20, currentAge: 40, retirementAge: 60, lumpsum: 0, expectedReturn: 12 });
  const sip25 = calculateRequiredMonthlySip({ targetCorpus: corpus25, currentAge: 40, retirementAge: 60, lumpsum: 0, expectedReturn: 12 });
  const sip30 = calculateRequiredMonthlySip({ targetCorpus: corpus30, currentAge: 40, retirementAge: 60, lumpsum: 0, expectedReturn: 12 });

  assert(sip25 > sip20, 'Case 3: 25-year SIP must exceed 20-year SIP');
  assert(sip30 > sip25, 'Case 3: 30-year SIP must exceed 25-year SIP');

  console.log(`✔ Case 3 (Different periods): 20Y = ₹${Math.round(corpus20).toLocaleString('en-IN')}, 25Y = ₹${Math.round(corpus25).toLocaleString('en-IN')}, 30Y = ₹${Math.round(corpus30).toLocaleString('en-IN')} Passed`);
}

// Case 4 — Different Pre-Retirement Inflation (6%, 8%, 10%)
{
  const exp6 = Math.round(50000 * Math.pow(1.06, 20)) * 12;
  const exp8 = Math.round(50000 * Math.pow(1.08, 20)) * 12;
  const exp10 = Math.round(50000 * Math.pow(1.10, 20)) * 12;

  assert(exp8 > exp6, 'Case 4: 8% pre-inf expense must exceed 6%');
  assert(exp10 > exp8, 'Case 4: 10% pre-inf expense must exceed 8%');

  const c6 = calculateRequiredRetirementCorpus({ annualExpensesAtRetirement: exp6, retirementInflation: 6, swpReturn: 9, retirementSustainabilityYears: 20 });
  const c8 = calculateRequiredRetirementCorpus({ annualExpensesAtRetirement: exp8, retirementInflation: 6, swpReturn: 9, retirementSustainabilityYears: 20 });
  const c10 = calculateRequiredRetirementCorpus({ annualExpensesAtRetirement: exp10, retirementInflation: 6, swpReturn: 9, retirementSustainabilityYears: 20 });

  assert(c8 > c6 && c10 > c8, 'Case 4: Corpus must increase monotonically with pre-retirement inflation');
  console.log(`✔ Case 4 (Pre-retirement inflation 6%, 8%, 10%): Corpus scales from ₹${Math.round(c6).toLocaleString('en-IN')} to ₹${Math.round(c10).toLocaleString('en-IN')} Passed`);
}

// Case 5 — Different Post-Retirement Inflation (5%, 6%, 7%)
{
  const annualExp = 2796576;
  const c5 = calculateRequiredRetirementCorpus({ annualExpensesAtRetirement: annualExp, retirementInflation: 5, swpReturn: 9, retirementSustainabilityYears: 20 });
  const c6 = calculateRequiredRetirementCorpus({ annualExpensesAtRetirement: annualExp, retirementInflation: 6, swpReturn: 9, retirementSustainabilityYears: 20 });
  const c7 = calculateRequiredRetirementCorpus({ annualExpensesAtRetirement: annualExp, retirementInflation: 7, swpReturn: 9, retirementSustainabilityYears: 20 });

  assert(c6 > c5, 'Case 5: 6% ret inflation corpus must exceed 5%');
  assert(c7 > c6, 'Case 5: 7% ret inflation corpus must exceed 6%');
  console.log(`✔ Case 5 (Post-retirement inflation 5%, 6%, 7%): Corpus scales from ₹${Math.round(c5).toLocaleString('en-IN')} to ₹${Math.round(c7).toLocaleString('en-IN')} Passed`);
}

// Case 6 — Additional Future Expense
// Intermediate expense in accumulation stage: verify required SIP increases to cover both
{
  const targetCorpus = 40505695;
  const sipWithoutFe = calculateRequiredMonthlySip({
    targetCorpus,
    currentAge: 40,
    retirementAge: 60,
    lumpsum: 0,
    expectedReturn: 12,
  });

  const sipWithFe = calculateRequiredMonthlySip({
    targetCorpus,
    currentAge: 40,
    retirementAge: 60,
    lumpsum: 0,
    expectedReturn: 12,
    futureExpensesEnabled: true,
    futureExpenses: { 2030: 1000000 }, // ₹10L milestone at age 44
    startYear: 2026,
  });

  assert(sipWithFe > sipWithoutFe, 'Case 6: SIP with intermediate future expense must exceed SIP without');
  const planWithFe = calculateFinancialPlan({
    monthlySip: sipWithFe,
    lumpsum: 0,
    sipPeriodYears: 20,
    expectedReturn: 12,
    currentAge: 40,
    retirementAge: 60,
    futureExpensesEnabled: true,
    futureExpenses: { 2030: 1000000 },
    startYear: 2026,
  });

  assert(Math.abs(planWithFe.summary.finalAccumulationCorpus - targetCorpus) < 1000, 'Case 6: Plan with future expense must still reach target corpus');
  assert(planWithFe.summary.hasAnyCorpusError === false, 'Case 6: Should not have corpus error');
  console.log(`✔ Case 6 (Additional future expense ₹10L in 2030): SIP adjusted from ₹${sipWithoutFe} to ₹${sipWithFe}/mo Passed`);
}

// Case 7 — Step-Up SIP
// Verify required SIP calculation supports step-up (% and ₹)
{
  const targetCorpus = 40505695;
  const flatSip = calculateRequiredMonthlySip({
    targetCorpus,
    currentAge: 40,
    retirementAge: 60,
    lumpsum: 0,
    expectedReturn: 12,
  });

  const stepUpPercentSip = calculateRequiredMonthlySip({
    targetCorpus,
    currentAge: 40,
    retirementAge: 60,
    lumpsum: 0,
    expectedReturn: 12,
    stepUpEnabled: true,
    stepUpType: 'percent',
    stepUpValue: 10,
  });

  assert(stepUpPercentSip < flatSip, 'Case 7: Initial step-up SIP must be lower than flat SIP');

  const planStepUp = calculateFinancialPlan({
    monthlySip: stepUpPercentSip,
    lumpsum: 0,
    sipPeriodYears: 20,
    expectedReturn: 12,
    currentAge: 40,
    retirementAge: 60,
    stepUpEnabled: true,
    stepUpType: 'percent',
    stepUpValue: 10,
  });
  assert(Math.abs(planStepUp.summary.finalAccumulationCorpus - targetCorpus) < 1000, 'Case 7: Step-up plan must reach target corpus');
  console.log(`✔ Case 7 (Step-Up SIP 10% p.a.): Starting SIP is ₹${stepUpPercentSip}/mo vs flat ₹${flatSip}/mo Passed`);
}

// Case 8 — Manual SIP Mode
// Client enters fixed SIP, calculate resulting projected corpus and SWP
{
  const plan = calculateFinancialPlan({
    monthlySip: 50000,
    lumpsum: 500000,
    sipPeriodYears: 20,
    expectedReturn: 12,
    currentAge: 40,
    retirementAge: 60,
    annualExpenses: 2796576,
    inflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 20,
    planningMode: 'sip',
  });

  assert(plan.summary.finalAccumulationCorpus > 50000000, 'Case 8: Projected corpus for 50k SIP + 5L lumpsum > 5 Cr');
  assert(plan.summary.isExhaustedEver === false, 'Case 8: Manual SIP plan sustains full 20 years');
  console.log(`✔ Case 8 (Manual SIP mode ₹50,000/mo): Projected corpus ₹${Math.round(plan.summary.finalAccumulationCorpus).toLocaleString('en-IN')} Passed`);
}

// Case 9 — Corpus Depletion Detection
// Use insufficient SIP and verify depletion is accurately captured
{
  const plan = calculateFinancialPlan({
    monthlySip: 10000, // Insufficient for ₹28L/yr expenses
    lumpsum: 0,
    sipPeriodYears: 20,
    expectedReturn: 12,
    currentAge: 40,
    retirementAge: 60,
    annualExpenses: 2796576,
    inflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 20,
  });

  assert(plan.summary.isExhaustedEver === true, 'Case 9: Insufficient SIP must cause corpus exhaustion');
  assert(plan.summary.sustainabilityYears < 20, 'Case 9: Sustainability years must be less than 20');
  assert(plan.summary.exhaustionAge < 80, 'Case 9: Exhaustion age must be < 80');
  console.log(`✔ Case 9 (Corpus depletion): Depletion correctly detected at Age ${plan.summary.exhaustionAge} (Year ${plan.summary.sustainabilityYears}) Passed`);
}

// Case 10 — Long Retirement (35 to 40 Years)
// Verify month-by-month simulation handles long retirement periods cleanly
{
  const curMonthlyExp = 50000;
  const monthlyExpAtRet = Math.round(curMonthlyExp * Math.pow(1.08, 20));
  const annualExpAtRet = monthlyExpAtRet * 12;

  const corpus35 = calculateRequiredRetirementCorpus({
    annualExpensesAtRetirement: annualExpAtRet,
    retirementInflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 35,
  });

  const corpus40 = calculateRequiredRetirementCorpus({
    annualExpensesAtRetirement: annualExpAtRet,
    retirementInflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 40,
  });

  assert(corpus40 > corpus35, 'Case 10: 40-year corpus must exceed 35-year corpus');

  const plan40 = calculateFinancialPlan({
    monthlySip: 65000,
    lumpsum: 0,
    sipPeriodYears: 20,
    expectedReturn: 12,
    currentAge: 40,
    retirementAge: 60,
    annualExpenses: annualExpAtRet,
    inflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 40,
  });

  assert(plan40.retirementRows.length === 40, 'Case 10: Retirement rows must have length 40');
  assert(!isNaN(plan40.retirementRows[39].endCorpus), 'Case 10: Month 480 closing corpus must not be NaN');
  console.log(`✔ Case 10 (Long retirement 35-40 years): 35Y Corpus = ₹${Math.round(corpus35).toLocaleString('en-IN')}, 40Y Corpus = ₹${Math.round(corpus40).toLocaleString('en-IN')} Passed`);
}

// Case 11 — Custom SIP Period Shorter than Retirement Horizon
// Age 40, Ret Age 60 (20 yrs), but client only wants to contribute SIP for 15 years
{
  const curAge = 40;
  const retAge = 60;
  const sipYears = 15;
  const targetCorpus = 40505695;

  const reqSip15 = calculateRequiredMonthlySip({
    targetCorpus,
    currentAge: curAge,
    retirementAge: retAge,
    sipPeriodYears: sipYears,
    lumpsum: 500000,
    expectedReturn: 12,
  });

  assert(reqSip15 > 38934, 'Case 11: 15-year SIP must be higher than 20-year SIP');

  const plan15 = calculateFinancialPlan({
    monthlySip: reqSip15,
    sipPeriodYears: sipYears,
    currentAge: curAge,
    retirementAge: retAge,
    lumpsum: 500000,
    expectedReturn: 12,
    annualExpenses: 2796576,
    inflation: 6,
    swpReturn: 9,
    retirementSustainabilityYears: 20,
  });

  assert(plan15.summary.totalAccYears === 20, 'Case 11: Total accumulation horizon must be 20 years');
  assert(plan15.summary.sipActiveYears === 15, 'Case 11: Active SIP years must be 15');
  assert(plan15.summary.growthPauseYears === 5, 'Case 11: Growth pause years must be 5');
  assert(plan15.accumulationRows[14].monthlySip > 0, 'Case 11: Year 15 must have active SIP');
  assert(plan15.accumulationRows[15].monthlySip === 0, 'Case 11: Year 16 must have 0 SIP (paused)');
  assert(plan15.accumulationRows[19].monthlySip === 0, 'Case 11: Year 20 must have 0 SIP (paused)');
  assert(plan15.summary.finalAccumulationCorpus >= targetCorpus, 'Case 11: Corpus at age 60 must meet target');
  assert(plan15.summary.isExhaustedEver === false, 'Case 11: Plan must sustain full 20-year retirement period');
  console.log(`✔ Case 11 (Custom SIP period 15 yrs vs 20 yrs ret): Req SIP is ₹${reqSip15}/mo (15 yrs active + 5 yrs pause) Passed`);
}

// Case 12: SIP Mode with Future Expenses beyond SIP Period
{
  const res = calculateFinancialPlan({
    planningMode: 'sip',
    monthlySip: 38419,
    sipPeriodYears: 13,
    lumpsum: 5000000,
    expectedReturn: 12,
    startYear: 2026,
    currentAge: 40,
    futureExpensesEnabled: true,
    futureExpenses: {
      2043: 3365966,
      2044: 7135848,
      2045: 7563999,
    },
    futureExpenseEndYear: 2045,
  });

  assert(res.accumulationRows.length === 20, 'Case 12: Must have 20 accumulation rows (2026-2045)');
  assert(res.summary.totalAccYears === 20, 'Case 12: Total accumulation years must be 20');
  assert(res.summary.sipActiveYears === 13, 'Case 12: Active SIP years must be 13');
  assert(res.summary.growthPauseYears === 7, 'Case 12: Compounding / withdrawal years must be 7');

  // Verify Year 13
  const yr13 = res.accumulationRows[12];
  assert(yr13.calendarYear === 2038, 'Case 12: Year 13 must be 2038');
  assert(yr13.isSipActive === true, 'Case 12: Year 13 must have active SIP');

  // Verify Year 18 (2043)
  const yr18 = res.accumulationRows[17];
  assert(yr18.calendarYear === 2043, 'Case 12: Year 18 must be 2043');
  assert(yr18.futureExpense === 3365966, 'Case 12: Year 18 future expense must be 3365966');
  assert(yr18.isSipActive === false, 'Case 12: Year 18 SIP must be inactive');
  assert(yr18.monthlySip === 0, 'Case 12: Year 18 monthly SIP must be 0');

  // Verify Year 19 (2044)
  const yr19 = res.accumulationRows[18];
  assert(yr19.calendarYear === 2044, 'Case 12: Year 19 must be 2044');
  assert(yr19.futureExpense === 7135848, 'Case 12: Year 19 future expense must be 7135848');

  // Verify Year 20 (2045)
  const yr20 = res.accumulationRows[19];
  assert(yr20.calendarYear === 2045, 'Case 12: Year 20 must be 2045');
  assert(yr20.futureExpense === 7563999, 'Case 12: Year 20 future expense must be 7563999');

  // Verify final corpus is affected by expenses
  const corpusWithoutExpenses = calculateFinancialPlan({
    planningMode: 'sip',
    monthlySip: 38419,
    sipPeriodYears: 13,
    lumpsum: 5000000,
    expectedReturn: 12,
    startYear: 2026,
    currentAge: 40,
    retirementAge: 60, // 20 years
  }).summary.finalAccumulationCorpus;

  assert(res.summary.finalAccumulationCorpus < corpusWithoutExpenses, 'Case 12: Corpus with expenses must be less than without expenses');
  assert(res.summary.totalFutureExpenses === (3365966 + 7135848 + 7563999), 'Case 12: Total future expenses sum mismatch');
  console.log(`✔ Case 12 (SIP mode with future expenses in 2043-2045): All 20 rows rendered, expenses deducted, corpus affected Passed`);
}

console.log('\n========================================================');
console.log('ALL 20 EXISTING TESTS + ALL 12 GOAL/SIP VALIDATION CASES PASSED 100%!');
console.log('========================================================');




