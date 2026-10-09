/**
 * Financial Calculation Engine for SIP -> SWP Planning
 * All math performed with full floating point precision.
 */

/**
 * Simulates a single retirement year using true month-by-month SWP calculation.
 *
 * Order of operations at the START of each month:
 * 1. Take opening corpus.
 * 2. Deduct that month's household expense (annualExpense / 12).
 * 3. The remaining corpus stays invested.
 * 4. Apply monthly return (annualReturn / 12) to remaining corpus.
 * 5. Result becomes month's closing corpus.
 * 6. Next month starts with that closing corpus.
 * Repeat for all 12 months.
 *
 * Full precision is maintained across all intermediate calculations.
 */
export function simulateYearlySwp({
  openingCorpus = 0,
  annualExpense = 0,
  annualReturn = 0.09, // as decimal fraction, e.g. 0.06
  futureExpense = 0,   // Goal expense deducted at year start if any
}) {
  const monthlyReturn = annualReturn / 12;
  const targetMonthlyWithdrawal = annualExpense / 12;

  // Deduct future expense from opening corpus at year start if applicable
  const netOpeningCorpus = Math.max(0, openingCorpus - futureExpense);

  const months = [];
  let currentCorpus = netOpeningCorpus;
  let totalAnnualGain = 0;
  let totalAnnualWithdrawal = 0;
  let isDepletedInYear = false;
  let depletionMonth = null;

  for (let m = 1; m <= 12; m++) {
    const monthOpening = currentCorpus;
    let withdrawal = 0;
    let remaining = 0;
    let gain = 0;
    let closing = 0;

    if (monthOpening <= 0) {
      withdrawal = 0;
      remaining = 0;
      gain = 0;
      closing = 0;
    } else if (monthOpening < targetMonthlyWithdrawal) {
      // Corpus depletes in this month: withdraw what remains
      isDepletedInYear = true;
      if (depletionMonth === null) depletionMonth = m;
      withdrawal = monthOpening;
      remaining = 0;
      gain = 0;
      closing = 0;
    } else {
      withdrawal = targetMonthlyWithdrawal;
      remaining = monthOpening - withdrawal;
      gain = remaining * monthlyReturn;
      closing = remaining + gain;
    }

    totalAnnualWithdrawal += withdrawal;
    totalAnnualGain += gain;
    currentCorpus = closing;

    months.push({
      month: m,
      openingCorpus: monthOpening,
      monthlyWithdrawal: withdrawal,
      remainingAfterWithdrawal: remaining,
      monthlyGain: gain,
      closingCorpus: closing,
    });
  }

  return {
    openingCorpus,
    futureExpense,
    netOpeningCorpus,
    months,
    totalAnnualGain,
    totalAnnualWithdrawal,
    endCorpus: currentCorpus,
    isDepletedInYear,
    depletionMonth,
  };
}

export function calculateFinancialPlan({
  monthlySip = 35000,
  sipPeriodYears = 17,
  lumpsum = 0,
  expectedReturn = 12,
  swpReturn = 9,
  inflation = 5,
  preRetirementInflation = 5,
  annualExpenses = 2400000,
  annualExpensesToday = null,
  currentAge = 43,
  projectionYears = 50,
  startYear = new Date().getFullYear(),
  stepUpEnabled = false,
  stepUpType = 'percent', // 'percent' or 'amount'
  stepUpValue = 0,
  futureExpensesEnabled = false,
  futureExpenses = {}, // map of calendarYear or yearNumber -> amount
  futureExpenseStartYear = null,
  futureExpenseEndYear = null,
  retirementAge = null,
  planningMode = 'goal',
  currentMonthlyExpense = null,
  retirementSustainabilityYears = null,
  requiredRetirementCorpus = null,
  requiredMonthlySip = null,
}) {
  // Validate and sanitize inputs with defaults
  const startYr = (startYear !== undefined && startYear !== null && startYear !== '' && !isNaN(Number(startYear)))
    ? Math.max(1900, Math.min(2100, Math.round(Number(startYear))))
    : new Date().getFullYear();
  const sip = Math.max(0, Number(monthlySip) || 0);
  const sipYears = Math.max(1, Math.round(Number(sipPeriodYears) || 1));
  const initialLump = Math.max(0, Number(lumpsum) || 0);

  const isStepUp = Boolean(stepUpEnabled && Number(stepUpValue) > 0);
  const stepType = (stepUpType === 'amount') ? 'amount' : 'percent';
  const stepVal = Math.max(0, Number(stepUpValue) || 0);

  const isFutureExpense = Boolean(futureExpensesEnabled);
  
  // Return defaults if empty/invalid
  const rAccPercent = (expectedReturn !== undefined && expectedReturn !== null && expectedReturn !== '' && !isNaN(Number(expectedReturn)))
    ? Number(expectedReturn)
    : 12;
  const rAcc = rAccPercent / 100;

  const rSwpPercent = (swpReturn !== undefined && swpReturn !== null && swpReturn !== '' && !isNaN(Number(swpReturn)))
    ? Number(swpReturn)
    : 9;
  const rSwp = rSwpPercent / 100;

  const infPercent = (inflation !== undefined && inflation !== null && inflation !== '' && !isNaN(Number(inflation)))
    ? Number(inflation)
    : 5;
  const inf = infPercent / 100;

  const initialExpenses = Math.max(0, Number(annualExpenses) || 0);
  const startAge = Math.max(1, Math.round(Number(currentAge) || 43));
  const projYears = Math.max(1, Math.min(100, Math.round(Number(retirementSustainabilityYears !== null && retirementSustainabilityYears !== undefined && retirementSustainabilityYears !== '' ? retirementSustainabilityYears : projectionYears) || 50)));

  // Support custom planned retirement age
  const targetRetAge = (retirementAge !== undefined && retirementAge !== null && retirementAge !== '' && !isNaN(Number(retirementAge)))
    ? Math.max(startAge + 1, Math.round(Number(retirementAge)))
    : (startAge + sipYears);

  // Look up max future expense calendar year if future expenses are enabled
  let maxExpenseYearNum = 0;
  if (isFutureExpense) {
    if (futureExpenses) {
      Object.keys(futureExpenses).forEach((key) => {
        const amt = Number(futureExpenses[key]) || 0;
        if (amt > 0) {
          const k = Number(key);
          if (k >= startYr) {
            maxExpenseYearNum = Math.max(maxExpenseYearNum, k - startYr + 1);
          } else if (k > 0) {
            maxExpenseYearNum = Math.max(maxExpenseYearNum, k);
          }
        }
      });
    }
    if (futureExpenseEndYear && Number(futureExpenseEndYear) >= startYr) {
      maxExpenseYearNum = Math.max(maxExpenseYearNum, Number(futureExpenseEndYear) - startYr + 1);
    }
  }

  // Total pre-retirement timeline: at least sipYears, or up to planned retirement age, or up to max future expense year
  const totalAccYears = Math.max(sipYears, targetRetAge - startAge, maxExpenseYearNum);
  const retirementStartAge = startAge + totalAccYears;
  const sipActiveYears = Math.min(sipYears, totalAccYears);
  const growthPauseYears = totalAccYears - sipActiveYears;

  const preInfPercent = (preRetirementInflation !== undefined && preRetirementInflation !== null && preRetirementInflation !== '' && !isNaN(Number(preRetirementInflation)))
    ? Number(preRetirementInflation)
    : 5;
  const preInf = preInfPercent / 100;

  const horizonToRetirement = Math.max(0, targetRetAge - startAge);
  const expTodayVal = (annualExpensesToday !== null && annualExpensesToday !== undefined && !isNaN(Number(annualExpensesToday)) && Number(annualExpensesToday) > 0)
    ? Number(annualExpensesToday)
    : Math.round(initialExpenses / Math.pow(1 + preInf, horizonToRetirement));

  // Accumulation calculation
  const accumulationRows = [];
  let currentCorpus = initialLump;

  let currentMonthlySip = sip;

  for (let year = 1; year <= totalAccYears; year++) {
    const calendarYear = startYr + year - 1;
    const age = startAge + year - 1;
    const isSipActive = (year <= sipActiveYears);

    // Opening amount at the start of the year (before any new monthly SIP investment)
    // Year 1: Initial Lumpsum; Year 2+: Previous Year's End Amount
    const startAmount = (year === 1) ? initialLump : currentCorpus;

    // Look up future expense for this year
    let futureExpense = 0;
    if (isFutureExpense && futureExpenses) {
      if (futureExpenses[calendarYear] !== undefined) {
        futureExpense = Math.max(0, Number(futureExpenses[calendarYear]) || 0);
      } else if (futureExpenses[year] !== undefined) {
        futureExpense = Math.max(0, Number(futureExpenses[year]) || 0);
      }
    }

    // Check if expense exceeds the opening corpus from which it should be depleted
    const hasCorpusError = Boolean(futureExpense > startAmount);
    const corpusShortfall = hasCorpusError ? (futureExpense - startAmount) : 0;
    const netStartAmount = Math.max(0, startAmount - futureExpense);

    // Apply annual step-up starting from Year 2 (only during active SIP years)
    if (isSipActive) {
      if (year > 1 && isStepUp) {
        if (stepType === 'percent') {
          currentMonthlySip = Math.round(currentMonthlySip * (1 + (stepVal / 100)));
        } else {
          currentMonthlySip = currentMonthlySip + stepVal;
        }
      }
    }

    // Amt Invested Each Year: 0 if SIP contribution period has ended
    const monthlySipInYear = isSipActive ? currentMonthlySip : 0;
    const annualSip = monthlySipInYear * 12;
    const beginningAmount = netStartAmount + annualSip;

    // Remaining opening corpus earns full annual return; active annual SIP earns ~half year return
    const gain = (netStartAmount * rAcc) + (annualSip * (rAcc / 2));

    const endAmount = beginningAmount + gain;
    currentCorpus = endAmount;

    accumulationRows.push({
      yearNumber: year,
      calendarYear,
      monthlySip: monthlySipInYear,
      isSipActive,
      startAmount,
      futureExpense,
      netStartAmount,
      annualSip,
      beginningAmount,
      gain,
      endAmount,
      age,
      hasCorpusError,
      corpusShortfall,
    });
  }

  const finalAccumulationCorpus = currentCorpus;
  const totalSipInvested = accumulationRows.reduce((sum, r) => sum + r.annualSip, 0);
  const totalFutureExpenses = accumulationRows.reduce((sum, r) => sum + r.futureExpense, 0);
  const totalInvested = totalSipInvested + initialLump;
  const hasAnyCorpusError = accumulationRows.some(r => r.hasCorpusError);
  const corpusErrorYears = accumulationRows.filter(r => r.hasCorpusError).map(r => r.calendarYear);

  // Retirement / SWP calculation
  const retirementRows = [];
  let swpCorpus = finalAccumulationCorpus;
  let currentExpense = initialExpenses;
  let exhaustionAge = null;
  let exhaustionYear = null;
  let isExhausted = false;

  for (let year = 1; year <= projYears; year++) {
    const calendarYear = startYr + totalAccYears + year - 1;
    const age = retirementStartAge + year - 1;

    if (year > 1) {
      currentExpense = currentExpense * (1 + inf);
    }

    // Look up future / goal expense for this retirement year if any
    let futureExpense = 0;
    if (isFutureExpense && futureExpenses) {
      if (futureExpenses[calendarYear] !== undefined) {
        futureExpense = Math.max(0, Number(futureExpenses[calendarYear]) || 0);
      } else if (futureExpenses[year] !== undefined) {
        futureExpense = Math.max(0, Number(futureExpenses[year]) || 0);
      }
    }

    const beginningCorpus = isExhausted ? 0 : swpCorpus;
    let yearStatus = 'active'; // 'active', 'depleted', 'exhausted'

    if (isExhausted || beginningCorpus <= 0) {
      yearStatus = 'exhausted';
      const sim = simulateYearlySwp({
        openingCorpus: 0,
        annualExpense: currentExpense,
        annualReturn: rSwp,
        futureExpense: 0,
      });

      retirementRows.push({
        yearNumber: year,
        calendarYear,
        age,
        beginningCorpus: 0,
        futureExpense: 0,
        startingCorpusAfterFutureExpense: 0,
        gain: 0,
        inflationRate: inf,
        householdExpense: currentExpense,
        actualWithdrawal: 0,
        endCorpus: 0,
        isExhausted: true,
        yearStatus,
        months: sim.months,
      });
      swpCorpus = 0;
    } else {
      const sim = simulateYearlySwp({
        openingCorpus: beginningCorpus,
        annualExpense: currentExpense,
        annualReturn: rSwp,
        futureExpense,
      });

      if (sim.isDepletedInYear || sim.endCorpus <= 0) {
        isExhausted = true;
        exhaustionAge = age;
        exhaustionYear = year;
        yearStatus = 'depleted';
      }

      swpCorpus = sim.endCorpus;

      retirementRows.push({
        yearNumber: year,
        calendarYear,
        age,
        beginningCorpus,
        futureExpense,
        startingCorpusAfterFutureExpense: sim.netOpeningCorpus,
        gain: sim.totalAnnualGain,
        inflationRate: inf,
        householdExpense: currentExpense,
        actualWithdrawal: sim.totalAnnualWithdrawal,
        endCorpus: sim.endCorpus,
        isExhausted,
        yearStatus,
        depletionMonth: sim.depletionMonth,
        months: sim.months,
      });
    }
  }

  // Sustainability summary
  let sustainabilityText = '';
  let sustainabilityYears = projYears;
  if (exhaustionYear) {
    sustainabilityYears = exhaustionYear;
    sustainabilityText = `Corpus sustains for approximately ${exhaustionYear} years (exhausted at age ${exhaustionAge}).`;
  } else {
    sustainabilityText = `Corpus remains positive throughout the entire ${projYears}-year projection period.`;
  }

  const initialWithdrawalRate = finalAccumulationCorpus > 0
    ? (initialExpenses / finalAccumulationCorpus) * 100
    : 0;

  const curMoExpVal = (currentMonthlyExpense !== null && currentMonthlyExpense !== undefined && !isNaN(Number(currentMonthlyExpense)) && Number(currentMonthlyExpense) > 0)
    ? Number(currentMonthlyExpense)
    : Math.round(expTodayVal / 12);
  const lumpsumFv = Math.round(initialLump * Math.pow(1 + rAcc, totalAccYears));
  const reqCorpusVal = (requiredRetirementCorpus !== null && requiredRetirementCorpus !== undefined && !isNaN(Number(requiredRetirementCorpus)))
    ? Number(requiredRetirementCorpus)
    : null;
  const reqSipVal = (requiredMonthlySip !== null && requiredMonthlySip !== undefined && !isNaN(Number(requiredMonthlySip)))
    ? Number(requiredMonthlySip)
    : null;

  return {
    inputs: {
      monthlySip: sip,
      sipPeriodYears: sipYears,
      retirementAge: targetRetAge,
      lumpsum: initialLump,
      expectedReturn: rAccPercent,
      swpReturn: rSwpPercent,
      inflation: infPercent,
      preRetirementInflation: preInfPercent,
      annualExpenses: initialExpenses,
      annualExpensesToday: expTodayVal,
      currentAge: startAge,
      projectionYears: projYears,
      retirementSustainabilityYears: projYears,
      startYear: startYr,
      stepUpEnabled: isStepUp,
      stepUpType: stepType,
      stepUpValue: stepVal,
      futureExpensesEnabled: isFutureExpense,
      futureExpenses: isFutureExpense ? futureExpenses : {},
      futureExpenseStartYear,
      futureExpenseEndYear,
      planningMode,
      currentMonthlyExpense: curMoExpVal,
      requiredRetirementCorpus: reqCorpusVal,
      requiredMonthlySip: reqSipVal,
    },
    summary: {
      startYear: startYr,
      sipActiveYears,
      totalAccYears,
      growthPauseYears,
      retirementStartAge,
      retirementAge: targetRetAge,
      stepUpEnabled: isStepUp,
      stepUpType: stepType,
      stepUpValue: stepVal,
      futureExpensesEnabled: isFutureExpense,
      totalFutureExpenses,
      hasAnyCorpusError,
      corpusErrorYears,
      totalSipInvested,
      initialLumpsum: initialLump,
      totalInvested,
      finalAccumulationCorpus,
      annualExpensesToday: expTodayVal,
      currentMonthlyExpense: curMoExpVal,
      initialAnnualExpense: initialExpenses,
      initialMonthlyExpense: initialExpenses / 12,
      expectedReturn: rAccPercent,
      swpReturn: rSwpPercent,
      preRetirementInflation: preInfPercent,
      inflationRate: infPercent,
      sustainabilityYears,
      retirementSustainabilityYears: projYears,
      exhaustionAge,
      exhaustionYear,
      isExhaustedEver: isExhausted,
      sustainabilityText,
      initialWithdrawalRate,
      planningMode,
      requiredRetirementCorpus: reqCorpusVal,
      requiredMonthlySip: reqSipVal,
      lumpsumFutureValue: lumpsumFv,
      isGoalMet: reqCorpusVal ? (finalAccumulationCorpus >= reqCorpusVal) : true,
      surplusOrShortfall: reqCorpusVal ? Math.round(finalAccumulationCorpus - reqCorpusVal) : 0,
    },
    accumulationRows,
    retirementRows,
  };
}

/**
 * Reverse engineers the required monthly SIP and accumulated portfolio to reach a retirement goal.
 *
 * @param {Object} params
 * @param {number} params.targetCorpus - Total desired corpus at retirement (e.g. 10000000 for 1 Cr)
 * @param {number} params.currentAge - Current client age (e.g. 43)
 * @param {number} params.retirementAge - Planned retirement age (e.g. 60 or 63)
 * @param {number} params.existingMonthlySip - Ongoing existing SIP per month (e.g. 10000)
 * @param {number} params.existingSipYears - How many years the existing SIP has already been running (e.g. 3)
 * @param {number} params.expectedReturn - Expected annual compounding rate (% p.a., e.g. 12)
 * @param {number} params.existingLumpsum - Any other current lump sum savings (default 0)
 * @returns {Object} Reverse-engineered figures
 */
export function reverseEngineerRetirementGoal({
  targetCorpus = 10000000,
  currentAge = 43,
  retirementAge = 60,
  existingMonthlySip = 0,
  existingSipYears = 0,
  expectedReturn = 12,
  existingLumpsum = 0,
}) {
  const target = Math.max(0, Number(targetCorpus) || 0);
  const curAge = Math.max(1, Math.round(Number(currentAge) || 43));
  const retAge = Math.max(curAge + 1, Math.round(Number(retirementAge) || (curAge + 15)));
  const horizonYears = Math.max(1, retAge - curAge);

  const existSip = Math.max(0, Number(existingMonthlySip) || 0);
  const existYears = Math.max(0, Number(existingSipYears) || 0);
  const rAccPercent = (expectedReturn !== undefined && expectedReturn !== null && expectedReturn !== '' && !isNaN(Number(expectedReturn)))
    ? Number(expectedReturn)
    : 12;
  const r = rAccPercent / 100;
  const otherLump = Math.max(0, Number(existingLumpsum) || 0);

  // 1. Calculate accumulated value of past ongoing SIP to date:
  // In our accumulation engine:
  // Yearly compounding with mid-year average SIP contribution:
  // Year 1: 12 * S * (1 + r/2)
  // Cumulative: (12 * S) * (( (1 + r)^t - 1 ) / r) * (1 + r / 2)
  let pastSipAccumulated = 0;
  if (existSip > 0 && existYears > 0) {
    if (r > 0) {
      const growthPast = Math.pow(1 + r, existYears);
      pastSipAccumulated = (existSip * 12) * ((growthPast - 1) / r) * (1 + r / 2);
    } else {
      pastSipAccumulated = existSip * 12 * existYears;
    }
  }

  const pastPrincipal = existSip * 12 * existYears;
  const pastGain = Math.max(0, pastSipAccumulated - pastPrincipal);

  // Total current portfolio today (past SIP accumulated + other lumpsum)
  const currentTotalLumpsum = pastSipAccumulated + otherLump;

  // 2. Future growth of this current portfolio till retirement (horizonYears):
  const horizonGrowth = Math.pow(1 + r, horizonYears);
  const futureLumpsumCorpus = currentTotalLumpsum * horizonGrowth;

  // 3. Remaining corpus needed at retirement from future SIP contributions:
  const remainingCorpusNeeded = Math.max(0, target - futureLumpsumCorpus);
  const isGoalAlreadyExceeded = futureLumpsumCorpus >= target;
  const surplusAtRetirement = isGoalAlreadyExceeded ? (futureLumpsumCorpus - target) : 0;

  // 4. Calculate required monthly SIP to cover the remaining corpus:
  let fvFactor = 0;
  if (r > 0) {
    fvFactor = 12 * ((horizonGrowth - 1) / r) * (1 + r / 2);
  } else {
    fvFactor = 12 * horizonYears;
  }

  const requiredMonthlySip = (remainingCorpusNeeded > 0 && fvFactor > 0)
    ? (remainingCorpusNeeded / fvFactor)
    : 0;

  // Additional SIP needed on top of existing ongoing SIP:
  const additionalMonthlySip = Math.max(0, requiredMonthlySip - existSip);
  const existingSipSurplus = (!isGoalAlreadyExceeded && requiredMonthlySip < existSip)
    ? (existSip - requiredMonthlySip)
    : 0;

  return {
    targetCorpus: target,
    currentAge: curAge,
    retirementAge: retAge,
    horizonYears,
    existingMonthlySip: existSip,
    existingSipYears: existYears,
    expectedReturn: rAccPercent,
    pastSipAccumulated: Math.round(pastSipAccumulated),
    pastPrincipal: Math.round(pastPrincipal),
    pastGain: Math.round(pastGain),
    currentTotalLumpsum: Math.round(currentTotalLumpsum),
    futureLumpsumCorpus: Math.round(futureLumpsumCorpus),
    remainingCorpusNeeded: Math.round(remainingCorpusNeeded),
    requiredMonthlySip: Math.round(requiredMonthlySip),
    additionalMonthlySip: Math.round(additionalMonthlySip),
    existingSipSurplus: Math.round(existingSipSurplus),
    isGoalAlreadyExceeded,
    surplusAtRetirement: Math.round(surplusAtRetirement),
    fvFactor,
  };
}

/**
 * Calculates the exact retirement corpus required at retirement age
 * such that monthly SWP withdrawals sustain the household for the entire
 * user-defined retirement sustainability period under true month-by-month SWP simulation.
 *
 * @param {Object} params
 * @param {number} params.annualExpensesAtRetirement - Starting annual household expense in Year 1 of retirement
 * @param {number} params.retirementInflation - Post-retirement annual expense escalation rate (% p.a., e.g. 6)
 * @param {number} params.swpReturn - Post-retirement portfolio return (% p.a., e.g. 9)
 * @param {number} params.retirementSustainabilityYears - User-defined retirement period (years, e.g. 20, 25, 30)
 * @param {Object} params.futureExpenses - Map of additional goal expenses during retirement { calendarYear: amount }
 * @param {number} params.startYear - Plan start year (e.g. 2026)
 * @param {number} params.totalAccYears - Number of years of accumulation until retirement
 * @returns {number} Exact required retirement corpus (rounded to integer INR)
 */
export function calculateRequiredRetirementCorpus({
  annualExpensesAtRetirement = 0,
  monthlyExpenseAtRetirement = 0,
  retirementInflation = 6,
  swpReturn = 9,
  retirementSustainabilityYears = 25,
  sustainabilityYears = null,
  futureExpenses = {},
  startYear = 2026,
  totalAccYears = 20,
}) {
  const years = Math.max(1, Math.round(Number(sustainabilityYears !== null ? sustainabilityYears : retirementSustainabilityYears) || 25));
  const rSwp = (swpReturn !== undefined && swpReturn !== null && !isNaN(Number(swpReturn)))
    ? Number(swpReturn) / 100
    : 0.09;
  const inf = (retirementInflation !== undefined && retirementInflation !== null && !isNaN(Number(retirementInflation)))
    ? Number(retirementInflation) / 100
    : 0.06;
  let initialExpense = Math.max(0, Number(annualExpensesAtRetirement) || 0);
  if (initialExpense <= 0 && monthlyExpenseAtRetirement) {
    initialExpense = Math.max(0, Number(monthlyExpenseAtRetirement) * 12);
  }
  const monthlyReturn = rSwp / 12;

  let corpus = 0; // Target end corpus after 'years' is 0

  for (let y = years; y >= 1; y--) {
    const calendarYear = startYear + totalAccYears + y - 1;
    let futureExpense = 0;
    if (futureExpenses) {
      if (futureExpenses[calendarYear] !== undefined) {
        futureExpense = Math.max(0, Number(futureExpenses[calendarYear]) || 0);
      } else if (futureExpenses[y] !== undefined) {
        futureExpense = Math.max(0, Number(futureExpenses[y]) || 0);
      }
    }

    const yearExpense = initialExpense * Math.pow(1 + inf, y - 1);
    const monthlyWithdrawal = yearExpense / 12;

    for (let m = 12; m >= 1; m--) {
      corpus = monthlyWithdrawal + (corpus / (1 + monthlyReturn));
    }
    corpus += futureExpense;
  }

  return Math.round(corpus);
}

/**
 * Calculates the exact required monthly SIP to achieve a target retirement corpus,
 * factoring in initial lumpsum, expected return, step-up SIP (% or ₹), and any future expenses.
 * Reuses the existing accumulation calculation engine without duplicating formulas.
 *
 * @param {Object} params
 * @param {number} params.targetCorpus - Required retirement corpus
 * @param {number} params.currentAge - Current client age
 * @param {number} params.retirementAge - Planned retirement age
 * @param {number} params.lumpsum - Available lumpsum today (flexible, default 0)
 * @param {number} params.expectedReturn - Accumulation expected return (% p.a., default 12)
 * @param {boolean} params.stepUpEnabled - Whether Step-Up SIP is enabled
 * @param {string} params.stepUpType - 'percent' or 'amount'
 * @param {number} params.stepUpValue - Step-up rate or rupee amount
 * @param {boolean} params.futureExpensesEnabled - Whether future expenses are enabled
 * @param {Object} params.futureExpenses - Map of { year: amount }
 * @param {number} params.startYear - Plan start year
 * @returns {number} Required initial monthly SIP (rounded to integer INR)
 */
export function calculateRequiredMonthlySip({
  targetCorpus = 0,
  currentAge = 40,
  retirementAge = 60,
  sipPeriodYears = null,
  lumpsum = 0,
  expectedReturn = 12,
  stepUpEnabled = false,
  stepUpType = 'percent',
  stepUpValue = 0,
  futureExpensesEnabled = false,
  futureExpenses = {},
  startYear = 2026,
}) {
  const target = Math.max(0, Number(targetCorpus) || 0);
  if (target <= 0) return 0;

  const curAge = Math.max(1, Math.round(Number(currentAge) || 40));
  const retAge = Math.max(curAge + 1, Math.round(Number(retirementAge) || (curAge + 20)));
  const horizon = retAge - curAge;
  const sipYears = (sipPeriodYears !== null && sipPeriodYears !== undefined && !isNaN(Number(sipPeriodYears)) && Number(sipPeriodYears) > 0)
    ? Math.min(horizon, Math.round(Number(sipPeriodYears)))
    : horizon;

  // Check if lumpsum alone achieves or exceeds target
  const planZero = calculateFinancialPlan({
    monthlySip: 0,
    sipPeriodYears: sipYears,
    lumpsum,
    expectedReturn,
    currentAge: curAge,
    retirementAge: retAge,
    stepUpEnabled,
    stepUpType,
    stepUpValue,
    futureExpensesEnabled,
    futureExpenses,
    startYear,
    projectionYears: 1,
  });

  if (planZero.summary.finalAccumulationCorpus >= target) {
    return 0;
  }

  // Rapid bisection using the existing accumulation engine
  let low = 0;
  let high = Math.max(1000000, target / 12);

  while (true) {
    const testPlan = calculateFinancialPlan({
      monthlySip: high,
      sipPeriodYears: sipYears,
      lumpsum,
      expectedReturn,
      currentAge: curAge,
      retirementAge: retAge,
      stepUpEnabled,
      stepUpType,
      stepUpValue,
      futureExpensesEnabled,
      futureExpenses,
      startYear,
      projectionYears: 1,
    });
    if (testPlan.summary.finalAccumulationCorpus >= target) break;
    high *= 2;
  }

  for (let iter = 0; iter < 35; iter++) {
    const mid = (low + high) / 2;
    const plan = calculateFinancialPlan({
      monthlySip: mid,
      sipPeriodYears: sipYears,
      lumpsum,
      expectedReturn,
      currentAge: curAge,
      retirementAge: retAge,
      stepUpEnabled,
      stepUpType,
      stepUpValue,
      futureExpensesEnabled,
      futureExpenses,
      startYear,
      projectionYears: 1,
    });

    if (plan.summary.finalAccumulationCorpus < target) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.ceil(high);
}


