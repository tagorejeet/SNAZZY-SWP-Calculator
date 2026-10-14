import {
  calculateFinancialPlan,
  calculateRequiredRetirementCorpus,
  calculateRequiredMonthlySip,
  reverseEngineerRetirementGoal,
} from './calculator.js';
import { downloadExcelFile } from './excelExport.js';
import { renderCharts } from './chartManager.js';
import {
  formatINR,
  formatCompactINR,
  formatPercent,
  parseNumberInput
} from './utils/formatters.js';

// Planning Mode State ('goal' | 'sip')
let currentPlanningMode = 'goal';
const modeGoalBtn = document.getElementById('modeGoalBtn');
const modeSipBtn = document.getElementById('modeSipBtn');

// Card 1: Retirement Goal & Lifestyle Elements
const currentAgeEl = document.getElementById('currentAge');
const currentAgeHelp = document.getElementById('currentAgeHelp');
const retirementAgeEl = document.getElementById('retirementAge');
const retirementAgeBadge = document.getElementById('retirementAgeBadge');
const currentMonthlyExpenseEl = document.getElementById('currentMonthlyExpense');
const currentMonthlyExpenseWords = document.getElementById('currentMonthlyExpenseWords');
const preRetirementInflationEl = document.getElementById('preRetirementInflation');
const preRetirementInflationHelp = document.getElementById('preRetirementInflationHelp');
const retirementSustainabilityYearsEl = document.getElementById('retirementSustainabilityYears');
const sustainabilityHelp = document.getElementById('sustainabilityHelp');
const sustainabilityPresetChips = document.getElementById('sustainabilityPresetChips');

// Card 1: Estimated Lifestyle at Retirement Box
const dispHouseholdHorizon = document.getElementById('dispHouseholdHorizon');
const dispMonthlyExpenseAtRetirement = document.getElementById('dispMonthlyExpenseAtRetirement');
const dispAnnualExpenseAtRetirement = document.getElementById('dispAnnualExpenseAtRetirement');
const dispHouseholdCompoundingNote = document.getElementById('dispHouseholdCompoundingNote');

// Card 2: Investment Inputs Elements
const sipCurrentAgeGroup = document.getElementById('sipCurrentAgeGroup');
const sipCurrentAgeEl = document.getElementById('sipCurrentAge');
const sipCurrentAgeHelp = document.getElementById('sipCurrentAgeHelp');
const sipRetirementAgeGroup = document.getElementById('sipRetirementAgeGroup');
const sipRetirementAgeEl = document.getElementById('sipRetirementAge');
const sipRetirementAgeBadge = document.getElementById('sipRetirementAgeBadge');
const monthlySipEl = document.getElementById('monthlySip');
const monthlySipLabelText = document.getElementById('monthlySipLabelText');
const sipModeBadge = document.getElementById('sipModeBadge');
const monthlySipWords = document.getElementById('monthlySipWords');
const sipPeriodYearsEl = document.getElementById('sipPeriodYears');
const sipPeriodYearsLabel = document.getElementById('sipPeriodYearsLabel');
const sipPeriodYearsSubHint = document.getElementById('sipPeriodYearsSubHint');
const sipMonthsWords = document.getElementById('sipMonthsWords');
const lumpsumEl = document.getElementById('lumpsum');
const lumpsumWords = document.getElementById('lumpsumWords');
const expectedReturnEl = document.getElementById('expectedReturn');
const startYearEl = document.getElementById('startYear');
const startYearHelp = document.getElementById('startYearHelp');

// Card 3: Retirement / SWP Assumptions Elements
const annualExpensesEl = document.getElementById('annualExpenses');
const annualExpensesSubHint = document.getElementById('annualExpensesSubHint');
const annualExpensesWords = document.getElementById('annualExpensesWords');
const inflationEl = document.getElementById('inflation');
const swpReturnEl = document.getElementById('swpReturn');
const projectionYearsEl = document.getElementById('projectionYears');

// Card 3: Required Retirement Corpus Highlight Box
const dispRequiredCorpus = document.getElementById('dispRequiredCorpus');
const dispRequiredCorpusWords = document.getElementById('dispRequiredCorpusWords');
const dispRequiredCorpusDetailText = document.getElementById('dispRequiredCorpusDetailText');
const dispRequiredCorpusDurationBadge = document.getElementById('dispRequiredCorpusDurationBadge');
const dispCorpusStatusPill = document.getElementById('dispCorpusStatusPill');
const dispCorpusStatusIcon = document.getElementById('dispCorpusStatusIcon');
const dispCorpusStatusText = document.getElementById('dispCorpusStatusText');

// Hero Roadmap Banner Elements
const roadmapHeroBanner = document.getElementById('roadmapHeroBanner');
const roadmapModeBadge = document.getElementById('roadmapModeBadge');
const roadmapTimelineBadge = document.getElementById('roadmapTimelineBadge');
const roadmapStatusBadge = document.getElementById('roadmapStatusBadge');
const roadmapSipLabel = document.getElementById('roadmapSipLabel');
const roadmapSipVal = document.getElementById('roadmapSipVal');
const roadmapSipSub = document.getElementById('roadmapSipSub');
const roadmapCorpusLabel = document.getElementById('roadmapCorpusLabel');
const roadmapCorpusVal = document.getElementById('roadmapCorpusVal');
const roadmapCorpusSub = document.getElementById('roadmapCorpusSub');
const roadmapExpenseVal = document.getElementById('roadmapExpenseVal');
const roadmapExpenseSub = document.getElementById('roadmapExpenseSub');
const roadmapLumpVal = document.getElementById('roadmapLumpVal');
const roadmapLumpSub = document.getElementById('roadmapLumpSub');
const roadmapSustainVal = document.getElementById('roadmapSustainVal');
const roadmapSustainSub = document.getElementById('roadmapSustainSub');

// Step-Up SIP Elements
const stepUpCheckbox = document.getElementById('stepUpCheckbox');
const stepUpToggleCard = document.getElementById('stepUpToggleCard');
const stepUpHeaderRow = document.getElementById('stepUpHeaderRow');
const stepUpFieldsWrapper = document.getElementById('stepUpFieldsWrapper');
const stepUpValue = document.getElementById('stepUpValue');
const stepUpPrefix = document.getElementById('stepUpPrefix');
const stepUpSuffix = document.getElementById('stepUpSuffix');
const stepUpModeHint = document.getElementById('stepUpModeHint');
const stepUpHelpText = document.getElementById('stepUpHelpText');
const unitBtnPercent = document.getElementById('unitBtnPercent');
const unitBtnRupee = document.getElementById('unitBtnRupee');
let currentStepUpMode = 'percent'; // 'percent' or 'amount'

// Future Expenses Elements
const futureExpenseCheckbox = document.getElementById('futureExpenseCheckbox');
const futureExpenseToggleCard = document.getElementById('futureExpenseToggleCard');
const futureExpenseFieldsWrapper = document.getElementById('futureExpenseFieldsWrapper');
const feStartYearEl = document.getElementById('feStartYear');
const feEndYearEl = document.getElementById('feEndYear');
const feQuickFillAmount = document.getElementById('feQuickFillAmount');
const feApplyQuickFillBtn = document.getElementById('feApplyQuickFillBtn');
const feYearsInputsList = document.getElementById('feYearsInputsList');
const thFutureExpense = document.getElementById('thFutureExpense');

// Future expense state dictionary { [year]: number }
const futureExpensesMap = {};

let isSyncingGoalFlow = false;

// Action Buttons
const calculateBtn = document.getElementById('calculateBtn');
const calculateBtnText = document.getElementById('calculateBtnText');
const viewTablesBtn = document.getElementById('viewTablesBtn');
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
const quickDownloadExcelBtn = document.getElementById('quickDownloadExcelBtn');

// Presentation Mode Elements
const advisorModeBtn = document.getElementById('advisorModeBtn');
const clientModeBtn = document.getElementById('clientModeBtn');
const clientNameCard = document.getElementById('clientNameCard');
const clientNameInput = document.getElementById('clientNameInput');
const reportDateBadge = document.getElementById('reportDateBadge');

// KPI Snapshot Elements
const kpiTotalInvested = document.getElementById('kpiTotalInvested');
const kpiSipTotal = document.getElementById('kpiSipTotal');
const kpiLumpTotal = document.getElementById('kpiLumpTotal');
const kpiCorpus = document.getElementById('kpiCorpus');
const kpiGainMultiple = document.getElementById('kpiGainMultiple');
const kpiMonthlySip = document.getElementById('kpiMonthlySip');
const kpiSipPeriodYears = document.getElementById('kpiSipPeriodYears');
const kpiAnnualExpense = document.getElementById('kpiAnnualExpense');
const kpiMonthlyExpense = document.getElementById('kpiMonthlyExpense');
const kpiInflation = document.getElementById('kpiInflation');
const kpiSwpReturn = document.getElementById('kpiSwpReturn');
const kpiSustainabilityYears = document.getElementById('kpiSustainabilityYears');
const kpiSustainabilitySub = document.getElementById('kpiSustainabilitySub');
const kpiSustainabilityCard = document.getElementById('kpiSustainabilityCard');
const kpiStatusIcon = document.getElementById('kpiStatusIcon');
const kpiRetirementAge = document.getElementById('kpiRetirementAge');
const kpiCurrentAge = document.getElementById('kpiCurrentAge');

// Advisory Insights
const advisorySection = document.getElementById('advisorySection');
const insightIconBox = document.getElementById('insightIconBox');
const insightHeading = document.getElementById('insightHeading');
const insightText = document.getElementById('insightText');
const metaAccReturn = document.getElementById('metaAccReturn');
const metaSwpReturn = document.getElementById('metaSwpReturn');
const metaInflation = document.getElementById('metaInflation');
const metaWithdrawalRate = document.getElementById('metaWithdrawalRate');

// Tables
const thDynamicAccGain = document.getElementById('thDynamicAccGain');
const thDynamicGain = document.getElementById('thDynamicGain');
const accTableSubheader = document.getElementById('accTableSubheader');
const retTableSubheader = document.getElementById('retTableSubheader');
const accumulationTableBody = document.getElementById('accumulationTableBody');
const retirementTableBody = document.getElementById('retirementTableBody');

const accTableWrapper = document.getElementById('accTableWrapper');
const retTableWrapper = document.getElementById('retTableWrapper');
const dualTableContainer = document.getElementById('dualTableContainer');

const accRowCountText = document.getElementById('accRowCountText');
const retRowCountText = document.getElementById('retRowCountText');
const toggleAccExpandBtn = document.getElementById('toggleAccExpandBtn');
// Mode-specific and Section Control Elements
const inputsSectionDesc = document.getElementById('inputsSectionDesc');
const inputsGridContainer = document.getElementById('inputsGridContainer');
const retirementGoalCard = document.getElementById('retirementGoalCard');
const investmentInputsCard = document.getElementById('investmentInputsCard');
const investmentCardTitle = document.getElementById('investmentCardTitle');
const investmentCardStagePill = document.getElementById('investmentCardStagePill');
const retirementSwpCard = document.getElementById('retirementSwpCard');
const sipActionButtonsRow = document.getElementById('sipActionButtonsRow');
const calculateSipBtn = document.getElementById('calculateSipBtn');
const viewSipTablesBtn = document.getElementById('viewSipTablesBtn');

const snapshotSectionTitle = document.getElementById('snapshotSectionTitle');
const snapshotSectionDesc = document.getElementById('snapshotSectionDesc');
const roadmapMetric3Label = document.getElementById('roadmapMetric3Label');
const roadmapMetric4Label = document.getElementById('roadmapMetric4Label');
const roadmapMetric5Label = document.getElementById('roadmapMetric5Label');

const kpiAnnualExpenseCard = document.getElementById('kpiAnnualExpenseCard');
const kpiInflationCard = document.getElementById('kpiInflationCard');
const kpiSwpReturnCard = document.getElementById('kpiSwpReturnCard');
const kpiRetirementAgeCard = document.getElementById('kpiRetirementAgeCard');
const kpiWealthGainCard = document.getElementById('kpiWealthGainCard');
const kpiTotalGain = document.getElementById('kpiTotalGain');
const kpiGainPercent = document.getElementById('kpiGainPercent');

const tablesSectionTitle = document.getElementById('tablesSectionTitle');
const tablesSectionDesc = document.getElementById('tablesSectionDesc');
const tableTabPills = document.getElementById('tableTabPills');

const chart2Card = document.getElementById('chart2Card');
const chart1Title = document.getElementById('chart1Title');
const chart1Sub = document.getElementById('chart1Sub');
const chart2Title = document.getElementById('chart2Title');
const chart2Sub = document.getElementById('chart2Sub');
const chartsSectionTitle = document.getElementById('chartsSectionTitle');
const chartsSectionDesc = document.getElementById('chartsSectionDesc');

let currentPlan = null;
let debounceTimeout = null;

/**
 * Synchronizes the Start Year and End Year select dropdowns for Future Expenses
 */
function syncFutureExpenseYearOptions() {
  if (!feStartYearEl || !feEndYearEl) return;
  const startYr = parseNumberInput(startYearEl ? startYearEl.value : 2026, 2026);
  const curAge = parseNumberInput(currentAgeEl ? currentAgeEl.value : 40, 40);
  const retAge = parseNumberInput(retirementAgeEl ? retirementAgeEl.value : 60, 60);
  const isSip = currentPlanningMode === 'sip';
  const sipYears = parseNumberInput(sipPeriodYearsEl ? sipPeriodYearsEl.value : 20, 20);

  let maxFeYear = 0;
  if (futureExpensesMap) {
    Object.keys(futureExpensesMap).forEach((k) => {
      if (Number(futureExpensesMap[k]) > 0) {
        maxFeYear = Math.max(maxFeYear, Number(k));
      }
    });
  }
  const currentEndVal = Number(feEndYearEl.value) || 0;
  if (currentEndVal > 0) {
    maxFeYear = Math.max(maxFeYear, currentEndVal);
  }

  const horizon = Math.max(1, retAge - curAge);
  const baseYears = isSip ? Math.max(sipYears, horizon) : horizon;
  const totalAccYears = Math.max(baseYears, maxFeYear >= startYr ? (maxFeYear - startYr + 1) : 0);
  const maxAccYear = startYr + totalAccYears - 1;

  const prevStartVal = Number(feStartYearEl.value) || (startYr + 1);
  const prevEndVal = Number(feEndYearEl.value) || Math.min(startYr + 4, maxAccYear);

  feStartYearEl.innerHTML = '';
  feEndYearEl.innerHTML = '';

  for (let y = startYr; y <= maxAccYear; y++) {
    const optStart = document.createElement('option');
    optStart.value = y;
    optStart.textContent = `${y} (Yr ${y - startYr + 1})`;
    feStartYearEl.appendChild(optStart);

    const optEnd = document.createElement('option');
    optEnd.value = y;
    optEnd.textContent = `${y} (Yr ${y - startYr + 1})`;
    feEndYearEl.appendChild(optEnd);
  }

  // Set selected values within valid bounds
  const clampedStart = Math.max(startYr, Math.min(prevStartVal, maxAccYear));
  feStartYearEl.value = clampedStart;

  const clampedEnd = Math.max(clampedStart, Math.min(prevEndVal, maxAccYear));
  feEndYearEl.value = clampedEnd;

  renderFutureExpenseYearInputs();
}

/**
 * Renders the year-by-year input rows for the chosen start & end year range
 */
function renderFutureExpenseYearInputs() {
  if (!feYearsInputsList || !feStartYearEl || !feEndYearEl) return;
  const startYr = parseNumberInput(startYearEl ? startYearEl.value : 2026, 2026);
  const curAge = parseNumberInput(currentAgeEl ? currentAgeEl.value : 40, 40);
  let fromY = Number(feStartYearEl.value) || startYr;
  let toY = Number(feEndYearEl.value) || (startYr + 4);

  if (toY < fromY) {
    toY = fromY;
    feEndYearEl.value = toY;
  }

  let html = '';
  for (let y = fromY; y <= toY; y++) {
    const age = curAge + (y - startYr);
    const existingVal = futureExpensesMap[y] !== undefined && futureExpensesMap[y] > 0 ? futureExpensesMap[y] : '';
    html += `
      <div class="fe-year-row">
        <div class="fe-year-label">
          <span>${y}</span>
          <span class="fe-year-badge">Age ${age}</span>
        </div>
        <div class="input-control-wrap fe-year-input-wrap">
          <span class="input-symbol-prefix">₹</span>
          <input type="number" class="snazzy-input has-prefix fe-amount-input" data-year="${y}" value="${existingVal}" placeholder="0" min="0" step="5000" />
        </div>
      </div>
    `;
  }

  feYearsInputsList.innerHTML = html;

  // Add event listeners to each year's input
  feYearsInputsList.querySelectorAll('.fe-amount-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const year = Number(e.target.dataset.year);
      const val = parseNumberInput(e.target.value, 0);
      futureExpensesMap[year] = val;
      syncGoalRetirementParameters({ source: 'futureExpense' });
    });
  });
}

/**
 * Toggles UI structure and element states between:
 * 1. 'goal': Comprehensive Goal-Based Retirement Planning (all 3 cards, reverse SIP solver, SWP schedule)
 * 2. 'sip': Pure SIP Calculator (Card 2 only, centered layout, pure accumulation schedule & charts)
 */
function applyPlanningModeUI(mode) {
  currentPlanningMode = mode;
  const isSip = mode === 'sip';

  // Toggle segmented mode buttons
  if (modeGoalBtn && modeSipBtn) {
    if (isSip) {
      modeSipBtn.classList.add('active');
      modeSipBtn.setAttribute('aria-selected', 'true');
      modeGoalBtn.classList.remove('active');
      modeGoalBtn.setAttribute('aria-selected', 'false');
    } else {
      modeGoalBtn.classList.add('active');
      modeGoalBtn.setAttribute('aria-selected', 'true');
      modeSipBtn.classList.remove('active');
      modeSipBtn.setAttribute('aria-selected', 'false');
    }
  }

  // Section 1: Inputs grid layout & card visibility
  // In SIP mode, Card 1 (goal) is hidden while Card 2 (SIP) and Card 3 (SWP assumptions) are shown side-by-side!
  if (retirementGoalCard) {
    retirementGoalCard.style.display = isSip ? 'none' : '';
  }
  if (retirementSwpCard) {
    retirementSwpCard.style.display = '';
    const card3StagePill = retirementSwpCard.querySelector('.card-stage-pill');
    if (card3StagePill) {
      card3StagePill.textContent = isSip ? 'Stage 2: SWP' : 'Stage 2: Income';
    }
    const card3TargetBadge = document.querySelector('.ret-corpus-target-badge');
    if (card3TargetBadge) {
      card3TargetBadge.textContent = isSip ? 'PROJECTED SWP SUSTAINABILITY' : 'REQUIRED RETIREMENT CORPUS';
    }
  }
  if (inputsGridContainer) {
    inputsGridContainer.classList.toggle('is-sip-mode', isSip);
  }

  // Card 2 title & styling
  if (investmentCardTitle) {
    investmentCardTitle.textContent = isSip ? 'SIP Calculator (Wealth Accumulation)' : 'Investment Inputs (Accumulation)';
  }
  if (investmentCardStagePill) {
    investmentCardStagePill.textContent = isSip ? 'Stage 1: Growth' : 'Stage 1: Growth';
  }

  // Current Age & Retirement Age in Card 2 for SIP mode
  if (sipCurrentAgeGroup) {
    sipCurrentAgeGroup.style.display = isSip ? '' : 'none';
  }
  if (sipRetirementAgeGroup) {
    sipRetirementAgeGroup.style.display = isSip ? '' : 'none';
  }
  if (isSip) {
    if (sipCurrentAgeEl && currentAgeEl) {
      sipCurrentAgeEl.value = currentAgeEl.value;
    }
    if (sipRetirementAgeEl && retirementAgeEl) {
      sipRetirementAgeEl.value = retirementAgeEl.value;
    }
  } else {
    if (currentAgeEl && sipCurrentAgeEl) {
      currentAgeEl.value = sipCurrentAgeEl.value;
    }
    if (retirementAgeEl && sipRetirementAgeEl) {
      retirementAgeEl.value = sipRetirementAgeEl.value;
    }
  }
  if (sipPeriodYearsLabel) {
    sipPeriodYearsLabel.textContent = isSip ? 'SIP Contribution Duration' : 'SIP Period';
  }
  if (sipPeriodYearsSubHint) {
    sipPeriodYearsSubHint.textContent = isSip ? 'Active SIP Years' : 'Years';
  }

  // Monthly SIP label, badge & editable status
  if (monthlySipLabelText) {
    monthlySipLabelText.textContent = isSip ? 'Monthly SIP Amount' : 'Required Monthly SIP';
  }
  if (sipModeBadge) {
    sipModeBadge.textContent = isSip ? '📈 Planned SIP' : '🎯 Auto-Calculated';
    sipModeBadge.className = isSip ? 'sip-mode-badge pill-green' : 'sip-mode-badge pill-gold';
  }
  if (monthlySipEl) {
    monthlySipEl.readOnly = !isSip;
    monthlySipEl.classList.toggle('is-auto-calc', !isSip);
  }

  // SIP action buttons inside Card 2
  if (sipActionButtonsRow) {
    sipActionButtonsRow.style.display = isSip ? 'block' : 'none';
  }

  // Section 1 description
  if (inputsSectionDesc) {
    inputsSectionDesc.textContent = isSip
      ? 'SIP Wealth Accumulation & SWP Calculator: calculate how your monthly SIP grows into a wealth corpus, and simulate your SWP retirement drawdown longevity.'
      : 'Goal-based retirement planning: determine the exact SIP required to sustain your lifestyle through retirement.';
  }

  // Section 2: Snapshot Title & Descriptions
  if (snapshotSectionTitle) {
    snapshotSectionTitle.textContent = isSip ? 'Your Wealth Accumulation & SWP Roadmap' : 'Your Retirement Roadmap';
  }
  if (snapshotSectionDesc) {
    snapshotSectionDesc.textContent = isSip
      ? 'Comprehensive summary of your systematic investment plan: total contributions, wealth created, and SWP longevity.'
      : 'Comprehensive retirement plan summary: investment requirements, lifestyle inflation, and wealth sustainability.';
  }

  // Hero Banner Labels
  if (roadmapMetric3Label) {
    roadmapMetric3Label.textContent = isSip ? 'Total Investment' : 'Expense at Retirement';
  }
  if (roadmapMetric4Label) {
    roadmapMetric4Label.textContent = isSip ? 'Total Wealth Gain' : 'Lumpsum Contribution';
  }
  if (roadmapMetric5Label) {
    roadmapMetric5Label.textContent = isSip ? 'SWP Sustainability' : 'Retirement Sustainability';
  }

  // Snapshot KPI Cards Visibility
  const snapshotGrid = document.querySelector('.snapshot-cards-grid');
  if (snapshotGrid) {
    snapshotGrid.classList.toggle('is-sip-mode', isSip);
  }
  if (kpiAnnualExpenseCard) kpiAnnualExpenseCard.style.display = '';
  if (kpiInflationCard) kpiInflationCard.style.display = '';
  if (kpiSwpReturnCard) kpiSwpReturnCard.style.display = '';
  if (kpiSustainabilityCard) kpiSustainabilityCard.style.display = '';
  if (kpiRetirementAgeCard) kpiRetirementAgeCard.style.display = '';
  if (kpiWealthGainCard) kpiWealthGainCard.style.display = isSip ? 'flex' : 'none';

  // Section 3: Tables Section
  if (tableTabPills) tableTabPills.style.display = 'flex';
  if (retTableWrapper) retTableWrapper.style.display = 'flex';
  if (accTableWrapper) accTableWrapper.style.display = 'flex';
  if (dualTableContainer) {
    dualTableContainer.style.gridTemplateColumns = '1fr 1fr';
  }
  document.querySelectorAll('.table-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === 'both');
  });
  if (tablesSectionTitle) {
    tablesSectionTitle.textContent = isSip ? 'SIP Wealth Accumulation & SWP Schedules' : 'Financial Projections & Schedules';
  }
  if (tablesSectionDesc) {
    tablesSectionDesc.textContent = isSip
      ? 'Side-by-side year-by-year schedule of your monthly SIP contributions, compounding wealth corpus, and SWP retirement drawdown sustainability.'
      : 'Detailed year-by-year accumulation growth and retirement systematic withdrawal plan schedule.';
  }

  // Section 4: Charts Section
  if (chartsSectionTitle) {
    chartsSectionTitle.textContent = isSip ? 'SIP Growth & Compounding Visualizer' : 'Projected Wealth Journey';
  }
  if (chartsSectionDesc) {
    chartsSectionDesc.textContent = isSip
      ? 'Visual trajectories illustrating your principal contributions vs compounding wealth returns.'
      : 'Visual trajectory tracking wealth accumulation, peak retirement corpus, and SWP longevity.';
  }
  if (chart1Title) {
    chart1Title.textContent = isSip ? 'Wealth Accumulation Trajectory' : 'Corpus Progression Trajectory (Accumulation → SWP Phase)';
  }
  if (chart1Sub) {
    chart1Sub.textContent = isSip ? 'Total Principal Invested vs Accumulated Corpus' : 'Principal Invested vs Projected Wealth';
  }
  if (chart2Card) {
    chart2Card.style.display = 'block';
  }
  if (chart2Title) {
    chart2Title.textContent = isSip ? 'Annual Investment vs Wealth Gain' : 'Inflation-Adjusted Household Expenses';
  }
  if (chart2Sub) {
    chart2Sub.textContent = isSip ? 'Annual SIP Contributions vs Annual Compounded Interest' : 'Rising Expenses vs Annual Portfolio Gains';
  }
}

/**
 * Core Orchestrator:
 * Connects the goal-based retirement workflow from Current Monthly Expense and Pre-Retirement Inflation
 * to Required Retirement Corpus and Required Monthly SIP.
 *
 * Current Household Expense
 * ↓ Pre-Retirement Inflation
 * Expense Required at Retirement
 * ↓ User-Defined Retirement Sustainability Period (Years)
 * Required Retirement Corpus (True Month-by-Month SWP backward simulation)
 * ↓ Lumpsum Contribution (flexible, 0 or any amount)
 * Required Monthly SIP (accumulation backward solver)
 * ↓ True Month-by-Month SWP Simulation
 */
function syncGoalRetirementParameters({ source = 'input' } = {}) {
  if (isSyncingGoalFlow) return;
  isSyncingGoalFlow = true;

  try {
    // In SIP-Based Planning mode: retirement is calculated forward from SIP
    // User directly specifies SIP amount, duration, current age, retirement age, lumpsum, return, and SWP parameters
    if (currentPlanningMode === 'sip') {
      const curAge = parseNumberInput(sipCurrentAgeEl ? sipCurrentAgeEl.value : (currentAgeEl ? currentAgeEl.value : 40), 40);
      let rawRetAge = parseNumberInput(sipRetirementAgeEl ? sipRetirementAgeEl.value : (retirementAgeEl ? retirementAgeEl.value : 60), 60);
      if (rawRetAge <= curAge) {
        rawRetAge = curAge + 1;
        if (sipRetirementAgeEl) sipRetirementAgeEl.value = rawRetAge;
        if (retirementAgeEl) retirementAgeEl.value = rawRetAge;
      }
      let horizon = Math.max(1, rawRetAge - curAge);

      let sipYears = horizon;
      if (source === 'sipAgeInput' || source === 'ageInput' || source === 'init') {
        sipYears = horizon;
        if (sipPeriodYearsEl) sipPeriodYearsEl.value = horizon;
      } else if (source === 'sipPeriodInput') {
        const rawSip = parseNumberInput(sipPeriodYearsEl ? sipPeriodYearsEl.value : horizon, horizon);
        if (rawSip > horizon) {
          rawRetAge = curAge + rawSip;
          if (sipRetirementAgeEl) sipRetirementAgeEl.value = rawRetAge;
          if (retirementAgeEl) retirementAgeEl.value = rawRetAge;
          horizon = rawRetAge - curAge;
          sipYears = rawSip;
        } else {
          sipYears = Math.max(1, rawSip);
        }
      } else {
        const rawSip = parseNumberInput(sipPeriodYearsEl ? sipPeriodYearsEl.value : horizon, horizon);
        sipYears = Math.max(1, Math.min(horizon, rawSip));
      }

      const retAge = rawRetAge;
      const pauseYears = Math.max(0, horizon - sipYears);
      const curSip = parseNumberInput(monthlySipEl ? monthlySipEl.value : 35000, 35000);

      if (sipCurrentAgeHelp) {
        sipCurrentAgeHelp.textContent = `Current client age (${curAge} yrs old)`;
      }
      if (sipRetirementAgeBadge) {
        sipRetirementAgeBadge.textContent = `${horizon} yrs to retirement (Age ${curAge} → ${retAge})`;
      }
      if (monthlySipWords) {
        monthlySipWords.textContent = `${formatINR(curSip)} / month (${formatCompactINR(curSip * 12)} / yr)`;
      }
      if (sipMonthsWords) {
        if (pauseYears > 0) {
          sipMonthsWords.textContent = `${sipYears * 12} monthly contributions (Age ${curAge} to ${curAge + sipYears}) • ${pauseYears} yrs compounding pause (no contributions) to Age ${retAge}`;
        } else {
          sipMonthsWords.textContent = `${sipYears * 12} monthly contributions (${sipYears} years to Age ${retAge})`;
        }
      }

      updatePlanInternal({ sipPeriodYears: sipYears });
      return;
    }

    const curAge = Math.max(1, parseNumberInput(currentAgeEl ? currentAgeEl.value : 40, 40));
    let retAge = Math.max(curAge + 1, parseNumberInput(retirementAgeEl ? retirementAgeEl.value : 60, 60));
    if (retAge <= curAge) {
      retAge = curAge + 1;
      if (retirementAgeEl) retirementAgeEl.value = retAge;
      if (sipRetirementAgeEl) sipRetirementAgeEl.value = retAge;
    }

    let horizon = Math.max(1, retAge - curAge);

    // Read or synchronize SIP Period Years: prefilled automatically as difference (horizon)
    let sipYears = horizon;
    if (source === 'ageInput' || source === 'sipAgeInput' || source === 'init') {
      sipYears = horizon;
      if (sipPeriodYearsEl) sipPeriodYearsEl.value = horizon;
    } else if (sipPeriodYearsEl && sipPeriodYearsEl.value.trim() !== '') {
      const parsedSip = parseNumberInput(sipPeriodYearsEl.value, horizon);
      if (source === 'sipPeriodInput') {
        if (parsedSip > horizon) {
          retAge = curAge + parsedSip;
          if (retirementAgeEl) retirementAgeEl.value = retAge;
          if (sipRetirementAgeEl) sipRetirementAgeEl.value = retAge;
          horizon = retAge - curAge;
          sipYears = parsedSip;
        } else {
          sipYears = Math.max(1, parsedSip);
        }
      } else {
        // Keep whatever custom duration user set (e.g. 15 yrs), clamped to horizon
        sipYears = Math.max(1, Math.min(horizon, parsedSip));
      }
    } else if (sipPeriodYearsEl) {
      sipPeriodYearsEl.value = horizon;
    }

    // Current Monthly Household Expense today
    const monthlyExpToday = Math.max(0, parseNumberInput(currentMonthlyExpenseEl ? currentMonthlyExpenseEl.value : 50000, 50000));

    // Pre-Retirement Inflation (% p.a.)
    const preInfPercent = parseNumberInput(preRetirementInflationEl ? preRetirementInflationEl.value : 8, 8);
    const preInfRate = preInfPercent / 100;

    // Retirement Sustainability Period (Years, user-defined, min 1)
    const sustainYears = Math.max(1, parseNumberInput(retirementSustainabilityYearsEl ? retirementSustainabilityYearsEl.value : 20, 20));
    if (projectionYearsEl) {
      projectionYearsEl.value = sustainYears;
    }

    // Post-Retirement Inflation (% p.a.)
    const retInfPercent = parseNumberInput(inflationEl ? inflationEl.value : 6, 6);

    // SWP Return (% p.a.)
    const swpRetPercent = parseNumberInput(swpReturnEl ? swpReturnEl.value : 9, 9);

    // Initial Lumpsum (flexible, 0 or any amount)
    const lumpsumVal = Math.max(0, parseNumberInput(lumpsumEl ? lumpsumEl.value : 500000, 500000));

    // Expected Accumulation Return (% p.a.)
    const expReturnVal = parseNumberInput(expectedReturnEl ? expectedReturnEl.value : 12, 12);

    // 1. Calculate Household Expense at Retirement
    // Future Monthly Expense = Today's Expense * (1 + PreRetInflation)^horizon
    const monthlyExpAtRet = Math.round(monthlyExpToday * Math.pow(1 + preInfRate, horizon));
    const annualExpAtRet = monthlyExpAtRet * 12;

    // Synchronize Card 3 Starting Annual Expense input
    if (annualExpensesEl) {
      annualExpensesEl.value = annualExpAtRet;
    }

    // Update Card 1 Estimated Lifestyle at Retirement display
    if (dispMonthlyExpenseAtRetirement) {
      dispMonthlyExpenseAtRetirement.textContent = formatINR(monthlyExpAtRet);
    }
    if (dispAnnualExpenseAtRetirement) {
      dispAnnualExpenseAtRetirement.textContent = formatINR(annualExpAtRet);
    }
    if (dispHouseholdHorizon) {
      dispHouseholdHorizon.textContent = `At Age ${retAge} (in ${horizon} yrs)`;
    }
    if (dispHouseholdCompoundingNote) {
      dispHouseholdCompoundingNote.textContent = `Compounded from ${formatINR(monthlyExpToday)}/mo over ${horizon} years @ ${preInfPercent}% pre-retirement inflation`;
    }
    if (currentMonthlyExpenseWords) {
      currentMonthlyExpenseWords.textContent = `${formatINR(monthlyExpToday)} / month (${formatINR(monthlyExpToday * 12)} / yr today)`;
    }
    if (retirementAgeBadge) {
      retirementAgeBadge.textContent = `${horizon} yrs accumulation horizon (Age ${curAge} to ${retAge})`;
    }
    if (sustainabilityHelp) {
      sustainabilityHelp.textContent = `Sustains household from Age ${retAge} to ${retAge + sustainYears} (${sustainYears * 12} monthly withdrawals)`;
    }

    // Update sustainability preset chips active class
    if (sustainabilityPresetChips) {
      sustainabilityPresetChips.querySelectorAll('.preset-chip').forEach(chip => {
        const y = Number(chip.dataset.years);
        if (y === sustainYears) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }

    // 2. Calculate Required Retirement Corpus using True Month-by-Month SWP Engine
    const startYr = parseNumberInput(startYearEl ? startYearEl.value : 2026, 2026);
    const reqCorpus = calculateRequiredRetirementCorpus({
      annualExpensesAtRetirement: annualExpAtRet,
      monthlyExpenseAtRetirement: monthlyExpAtRet,
      retirementInflation: retInfPercent,
      swpReturn: swpRetPercent,
      retirementSustainabilityYears: sustainYears,
      futureExpenses: futureExpensesMap,
      startYear: startYr,
      totalAccYears: horizon,
    });

    // Update Card 3 Required Retirement Corpus box
    if (dispRequiredCorpus) {
      dispRequiredCorpus.textContent = formatINR(reqCorpus);
    }
    if (dispRequiredCorpusWords) {
      dispRequiredCorpusWords.textContent = `(${formatCompactINR(reqCorpus)})`;
    }
    if (dispRequiredCorpusDurationBadge) {
      dispRequiredCorpusDurationBadge.textContent = `${sustainYears} Years SWP`;
    }
    if (dispRequiredCorpusDetailText) {
      dispRequiredCorpusDetailText.textContent = `Exact month-by-month SWP corpus needed to fund ${formatCompactINR(monthlyExpAtRet)}/mo growing @ ${retInfPercent}% inflation for ${sustainYears} years.`;
    }

    // 3. Mode Orchestration: Goal-Based vs SIP-Based
    let reqMonthlySip = 0;
    const isStepUp = Boolean(stepUpCheckbox && stepUpCheckbox.checked);
    const stepVal = parseNumberInput(stepUpValue ? stepUpValue.value : 0, 0);

    // Calculate Required Monthly SIP
    reqMonthlySip = calculateRequiredMonthlySip({
      targetCorpus: reqCorpus,
      currentAge: curAge,
      retirementAge: retAge,
      sipPeriodYears: sipYears,
      lumpsum: lumpsumVal,
      expectedReturn: expReturnVal,
      stepUpEnabled: isStepUp,
      stepUpType: currentStepUpMode,
      stepUpValue: stepVal,
      futureExpensesEnabled: Boolean(futureExpenseCheckbox && futureExpenseCheckbox.checked),
      futureExpenses: futureExpensesMap,
      startYear: startYr,
    });

    if (currentPlanningMode === 'goal') {
      if (monthlySipEl) {
        monthlySipEl.value = reqMonthlySip;
        monthlySipEl.readOnly = true;
        monthlySipEl.classList.add('is-auto-calc');
      }
      if (monthlySipLabelText) monthlySipLabelText.textContent = 'Required Monthly SIP';
      if (sipModeBadge) {
        sipModeBadge.textContent = '🎯 Auto-Calculated';
        sipModeBadge.className = 'sip-mode-badge pill-gold';
      }
      if (monthlySipWords) {
        monthlySipWords.textContent = `${formatINR(reqMonthlySip)} / month • Auto-calculated to reach retirement corpus of ${formatCompactINR(reqCorpus)}`;
      }
    } else {
      if (monthlySipEl) {
        monthlySipEl.readOnly = false;
        monthlySipEl.classList.remove('is-auto-calc');
      }
      if (monthlySipLabelText) monthlySipLabelText.textContent = 'Planned Monthly SIP';
      if (sipModeBadge) {
        sipModeBadge.textContent = '📈 User Planned';
        sipModeBadge.className = 'sip-mode-badge pill-green';
      }
      const curSip = parseNumberInput(monthlySipEl ? monthlySipEl.value : 35000, 35000);
      if (monthlySipWords) {
        monthlySipWords.textContent = `${formatINR(curSip)} / month (${formatCompactINR(curSip * 12)} / yr)`;
      }
    }

    // Run full plan calculation
    updatePlanInternal({
      requiredRetirementCorpus: reqCorpus,
      requiredMonthlySip: reqMonthlySip,
      currentMonthlyExpense: monthlyExpToday,
      retirementSustainabilityYears: sustainYears,
      preRetirementInflation: preInfPercent,
      annualExpenses: annualExpAtRet,
      sipPeriodYears: sipYears,
    });
  } finally {
    isSyncingGoalFlow = false;
  }
}

/**
 * Reads all inputs from the form with proper fallbacks
 */
function readInputs() {
  const isSip = currentPlanningMode === 'sip';
  const curAge = isSip
    ? parseNumberInput(sipCurrentAgeEl ? sipCurrentAgeEl.value : (currentAgeEl ? currentAgeEl.value : 40), 40)
    : parseNumberInput(currentAgeEl ? currentAgeEl.value : 40, 40);

  const rawSipYears = sipPeriodYearsEl ? parseNumberInput(sipPeriodYearsEl.value, 20) : 20;
  const sipYears = Math.max(1, rawSipYears);

  const rawRetAge = isSip
    ? parseNumberInput(sipRetirementAgeEl ? sipRetirementAgeEl.value : (retirementAgeEl ? retirementAgeEl.value : 60), 60)
    : parseNumberInput(retirementAgeEl ? retirementAgeEl.value : 60, 60);

  // In SIP mode: allow user to choose retirement age (e.g. 60) and SIP period (e.g. 15 yrs)
  // If user entered a retirement age earlier than curAge + sipYears, retirement starts when SIP ends.
  const retAge = Math.max(curAge + sipYears, Math.max(curAge + 1, rawRetAge));
  const horizon = Math.max(sipYears, retAge - curAge);
  const sustainYears = Math.max(1, parseNumberInput(retirementSustainabilityYearsEl ? retirementSustainabilityYearsEl.value : 20, 20));

  return {
    monthlySip: parseNumberInput(monthlySipEl ? monthlySipEl.value : 35000, 35000),
    sipPeriodYears: sipYears,
    lumpsum: parseNumberInput(lumpsumEl ? lumpsumEl.value : 0, 0),
    expectedReturn: (expectedReturnEl && expectedReturnEl.value.trim() !== '') ? parseNumberInput(expectedReturnEl.value, 12) : 12,
    currentAge: curAge,
    retirementAge: retAge,
    annualExpenses: parseNumberInput(annualExpensesEl ? annualExpensesEl.value : 2796576, 2796576),
    annualExpensesToday: parseNumberInput(currentMonthlyExpenseEl ? currentMonthlyExpenseEl.value : 50000, 50000) * 12,
    currentMonthlyExpense: parseNumberInput(currentMonthlyExpenseEl ? currentMonthlyExpenseEl.value : 50000, 50000),
    preRetirementInflation: (preRetirementInflationEl && preRetirementInflationEl.value.trim() !== '') ? parseNumberInput(preRetirementInflationEl.value, 8) : 8,
    inflation: (inflationEl && inflationEl.value.trim() !== '') ? parseNumberInput(inflationEl.value, 6) : 6,
    swpReturn: (swpReturnEl && swpReturnEl.value.trim() !== '') ? parseNumberInput(swpReturnEl.value, 9) : 9,
    projectionYears: sustainYears,
    retirementSustainabilityYears: sustainYears,
    startYear: startYearEl ? parseNumberInput(startYearEl.value, 2026) : 2026,
    stepUpEnabled: stepUpCheckbox ? stepUpCheckbox.checked : false,
    stepUpType: currentStepUpMode,
    stepUpValue: parseNumberInput(stepUpValue ? stepUpValue.value : 0, 0),
    futureExpensesEnabled: futureExpenseCheckbox ? futureExpenseCheckbox.checked : false,
    futureExpenses: { ...futureExpensesMap },
    futureExpenseStartYear: feStartYearEl ? Number(feStartYearEl.value) : undefined,
    futureExpenseEndYear: feEndYearEl ? Number(feEndYearEl.value) : undefined,
    planningMode: currentPlanningMode,
  };
}

/**
 * Updates UI subtexts beneath form fields
 */
function updateInputSubtexts(inputs) {
  if (inputs.stepUpEnabled) {
    const s1 = inputs.monthlySip;
    let s2 = s1;
    let s3 = s1;
    if (inputs.stepUpType === 'percent') {
      s2 = Math.round(s1 * (1 + (inputs.stepUpValue / 100)));
      s3 = Math.round(s2 * (1 + (inputs.stepUpValue / 100)));
      if (currentPlanningMode === 'sip') {
        monthlySipWords.textContent = `${formatINR(inputs.monthlySip)} / month (Year 1 • Stepped-up +${inputs.stepUpValue}% annually)`;
      }
      if (stepUpHelpText) {
        stepUpHelpText.innerHTML = `<strong>+${inputs.stepUpValue}%</strong> annual increase: Yr 1 = <strong>${formatINR(s1)}/mo</strong> &rarr; Yr 2 = <strong>${formatINR(s2)}/mo</strong> &rarr; Yr 3 = <strong>${formatINR(s3)}/mo</strong>`;
      }
    } else {
      s2 = s1 + inputs.stepUpValue;
      s3 = s1 + (2 * inputs.stepUpValue);
      if (currentPlanningMode === 'sip') {
        monthlySipWords.textContent = `${formatINR(inputs.monthlySip)} / month (Year 1 • Stepped-up +${formatINR(inputs.stepUpValue)} annually)`;
      }
      if (stepUpHelpText) {
        stepUpHelpText.innerHTML = `<strong>+${formatINR(inputs.stepUpValue)}</strong> annual increase: Yr 1 = <strong>${formatINR(s1)}/mo</strong> &rarr; Yr 2 = <strong>${formatINR(s2)}/mo</strong> &rarr; Yr 3 = <strong>${formatINR(s3)}/mo</strong>`;
      }
    }
  } else if (currentPlanningMode === 'sip') {
    monthlySipWords.textContent = `${formatINR(inputs.monthlySip)} / month (${formatCompactINR(inputs.monthlySip * 12)} / yr)`;
  }

  const horizon = Math.max(0, inputs.retirementAge - inputs.currentAge);
  const pauseYears = inputs.sipPeriodYears < horizon ? (horizon - inputs.sipPeriodYears) : 0;

  if (sipMonthsWords) {
    if (pauseYears > 0) {
      sipMonthsWords.textContent = `${inputs.sipPeriodYears * 12} monthly contributions (Age ${inputs.currentAge} to ${inputs.currentAge + inputs.sipPeriodYears}) • ${pauseYears} yrs compounding pause (no contributions) to Age ${inputs.retirementAge}`;
    } else {
      sipMonthsWords.textContent = `${inputs.sipPeriodYears * 12} monthly contributions (${inputs.sipPeriodYears} years to Age ${inputs.retirementAge})`;
    }
  }
  if (lumpsumWords) {
    lumpsumWords.textContent = inputs.lumpsum > 0 ? `${formatCompactINR(inputs.lumpsum)} (Invested in Year 1)` : '₹0 (No initial lumpsum)';
  }

  if (retirementAgeBadge) {
    retirementAgeBadge.textContent = `${horizon} yrs accumulation horizon (Age ${inputs.currentAge} to ${inputs.retirementAge})`;
  }
  if (sipRetirementAgeBadge) {
    sipRetirementAgeBadge.textContent = `${horizon} yrs to retirement (Age ${inputs.currentAge} → ${inputs.retirementAge})`;
  }
  if (sipCurrentAgeHelp) {
    sipCurrentAgeHelp.textContent = `Current client age (${inputs.currentAge} yrs old)`;
  }
  if (annualExpensesSubHint) {
    annualExpensesSubHint.textContent = `At Age ${inputs.retirementAge} (Year 1 of SWP)`;
  }

  if (startYearHelp) {
    startYearHelp.textContent = currentPlanningMode === 'sip'
      ? `Projections begin in ${inputs.startYear}`
      : `Projections begin in ${inputs.startYear} (Age ${inputs.currentAge})`;
  }

  const monthlyExpToday = Math.round(inputs.annualExpensesToday / 12);
  const inflatedSubtext = monthlyExpToday > 0 && horizon > 0
    ? ` • Inflated from ${formatCompactINR(monthlyExpToday)}/mo today (${horizon} yrs @ ${inputs.preRetirementInflation}%)`
    : '';

  if (annualExpensesWords) {
    annualExpensesWords.textContent = `${formatINR(inputs.annualExpenses)} / yr (${formatINR(inputs.annualExpenses / 12)} / month)${inflatedSubtext}`;
  }
}

/**
 * Internal executor that calculates the financial plan and renders the UI
 */
function updatePlanInternal(overrides = {}) {
  const inputs = readInputs();
  if (overrides.requiredRetirementCorpus !== undefined) {
    inputs.requiredRetirementCorpus = overrides.requiredRetirementCorpus;
  }
  if (overrides.requiredMonthlySip !== undefined) {
    inputs.requiredMonthlySip = overrides.requiredMonthlySip;
  }
  if (overrides.retirementSustainabilityYears !== undefined) {
    inputs.retirementSustainabilityYears = overrides.retirementSustainabilityYears;
    inputs.projectionYears = overrides.retirementSustainabilityYears;
  }
  if (overrides.sipPeriodYears !== undefined) {
    inputs.sipPeriodYears = overrides.sipPeriodYears;
  }

  updateInputSubtexts(inputs);

  currentPlan = calculateFinancialPlan(inputs);
  const { summary, accumulationRows, retirementRows } = currentPlan;
  const isSip = currentPlanningMode === 'sip';
  const totalWealthGain = Math.max(0, summary.finalAccumulationCorpus - summary.totalInvested);
  const gainMultiple = summary.totalInvested > 0
    ? (summary.finalAccumulationCorpus / summary.totalInvested).toFixed(1) + 'x'
    : '0x';

  // 1. Update Hero Roadmap Banner
  if (roadmapModeBadge) {
    roadmapModeBadge.textContent = isSip
      ? '📈 SIP WEALTH ACCUMULATION ROADMAP'
      : '🎯 GOAL-BASED RETIREMENT ROADMAP';
  }
  if (roadmapTimelineBadge) {
    if (isSip) {
      roadmapTimelineBadge.textContent = `${summary.totalAccYears} Years Growth (${inputs.startYear} – ${inputs.startYear + summary.totalAccYears - 1})`;
    } else {
      const endRetAge = summary.retirementStartAge + summary.retirementSustainabilityYears;
      roadmapTimelineBadge.textContent = `Age ${inputs.currentAge} → Age ${summary.retirementStartAge} → Age ${endRetAge} (${summary.retirementSustainabilityYears} Yrs SWP)`;
    }
  }
  if (roadmapStatusBadge) {
    if (summary.isExhaustedEver) {
      roadmapStatusBadge.textContent = `⚠️ Depleted in Yr ${summary.exhaustionYear} (Age ${summary.exhaustionAge})`;
      roadmapStatusBadge.className = 'roadmap-status-badge is-depleted';
    } else {
      roadmapStatusBadge.textContent = isSip
        ? `✓ ${gainMultiple} Growth • Sustains ${summary.retirementSustainabilityYears} Yrs SWP`
        : `✓ Fully Funded (${summary.retirementSustainabilityYears} Yrs Guaranteed)`;
      roadmapStatusBadge.className = 'roadmap-status-badge';
    }
  }

  if (roadmapSipLabel) {
    roadmapSipLabel.textContent = isSip ? 'Monthly SIP Amount' : 'Required Monthly SIP';
  }
  if (roadmapSipVal) {
    roadmapSipVal.textContent = formatINR(inputs.monthlySip);
  }
  if (roadmapSipSub) {
    roadmapSipSub.textContent = isSip
      ? `${formatCompactINR(inputs.monthlySip * 12)} / yr invested`
      : `To retire at Age ${inputs.retirementAge}`;
  }

  if (roadmapCorpusLabel) {
    roadmapCorpusLabel.textContent = isSip ? 'Projected Wealth Corpus' : 'Required Retirement Corpus';
  }
  if (roadmapCorpusVal) {
    roadmapCorpusVal.textContent = isSip
      ? formatCompactINR(summary.finalAccumulationCorpus)
      : formatCompactINR(summary.requiredRetirementCorpus || summary.finalAccumulationCorpus);
  }
  if (roadmapCorpusSub) {
    if (isSip) {
      roadmapCorpusSub.textContent = formatINR(summary.finalAccumulationCorpus);
    } else {
      roadmapCorpusSub.textContent = `Projected: ${formatCompactINR(summary.finalAccumulationCorpus)}`;
    }
  }

  if (roadmapExpenseVal) {
    roadmapExpenseVal.textContent = isSip
      ? formatCompactINR(summary.totalInvested)
      : `${formatCompactINR(summary.initialMonthlyExpense)} / mo`;
  }
  if (roadmapExpenseSub) {
    roadmapExpenseSub.textContent = isSip
      ? `SIP: ${formatCompactINR(summary.totalSipInvested)} • Lump: ${formatCompactINR(summary.initialLumpsum)}`
      : `${formatCompactINR(summary.initialAnnualExpense)} / yr (Age ${inputs.retirementAge})`;
  }

  if (roadmapLumpVal) {
    roadmapLumpVal.textContent = isSip
      ? formatCompactINR(totalWealthGain)
      : formatCompactINR(summary.initialLumpsum);
  }
  if (roadmapLumpSub) {
    roadmapLumpSub.textContent = isSip
      ? `Net Gain: ${formatINR(totalWealthGain)}`
      : (summary.initialLumpsum > 0 ? `Grows to ${formatCompactINR(summary.lumpsumFutureValue)} at ret.` : 'No lumpsum invested');
  }

  if (roadmapSustainVal) {
    roadmapSustainVal.textContent = isSip
      ? (summary.isExhaustedEver ? `${summary.sustainabilityYears} Years` : `${summary.retirementSustainabilityYears} Years`)
      : `${summary.sustainabilityYears} Years`;
  }
  if (roadmapSustainSub) {
    roadmapSustainSub.textContent = isSip
      ? (summary.isExhaustedEver ? `Depleted at Age ${summary.exhaustionAge}` : `Sustains to Age ${summary.retirementStartAge + summary.retirementSustainabilityYears}`)
      : (summary.isExhaustedEver ? `Depleted at Age ${summary.exhaustionAge}` : `Sustains to Age ${inputs.retirementAge + summary.retirementSustainabilityYears}`);
  }

  // 2. Card 3 Box in SIP Mode
  if (isSip) {
    if (dispRequiredCorpus) {
      dispRequiredCorpus.textContent = formatINR(summary.finalAccumulationCorpus);
    }
    if (dispRequiredCorpusWords) {
      dispRequiredCorpusWords.textContent = `(${formatCompactINR(summary.finalAccumulationCorpus)})`;
    }
    if (dispRequiredCorpusDurationBadge) {
      dispRequiredCorpusDurationBadge.textContent = summary.isExhaustedEver
        ? `Depletes in Yr ${summary.exhaustionYear}`
        : `${summary.retirementSustainabilityYears} Years SWP`;
    }
    if (dispRequiredCorpusDetailText) {
      dispRequiredCorpusDetailText.textContent = summary.isExhaustedEver
        ? `Accumulated SIP corpus of ${formatCompactINR(summary.finalAccumulationCorpus)} sustains ${formatCompactINR(summary.initialMonthlyExpense)}/mo withdrawals for ${summary.exhaustionYear} years until Age ${summary.exhaustionAge}.`
        : `Accumulated SIP corpus of ${formatCompactINR(summary.finalAccumulationCorpus)} fully funds ${formatCompactINR(summary.initialMonthlyExpense)}/mo withdrawals for all ${summary.retirementSustainabilityYears} years.`;
    }
  }

  // Card 3 Status Pill
  if (dispCorpusStatusPill) {
    if (summary.isExhaustedEver) {
      if (dispCorpusStatusIcon) dispCorpusStatusIcon.textContent = '⚠️';
      if (dispCorpusStatusText) dispCorpusStatusText.textContent = `Corpus depletes in Year ${summary.exhaustionYear} (at Age ${summary.exhaustionAge})`;
      dispCorpusStatusPill.className = 'ret-corpus-status-pill is-depleted';
    } else {
      if (dispCorpusStatusIcon) dispCorpusStatusIcon.textContent = '🛡️';
      if (dispCorpusStatusText) dispCorpusStatusText.textContent = `Corpus fully sustains ${summary.retirementSustainabilityYears}-year retirement period`;
      dispCorpusStatusPill.className = 'ret-corpus-status-pill';
    }
  }

  // 3. Update Snapshot KPI Cards (if elements exist)
  if (kpiTotalInvested) kpiTotalInvested.textContent = formatINR(summary.totalInvested);
  if (kpiSipTotal) kpiSipTotal.textContent = formatCompactINR(summary.totalSipInvested);
  if (kpiLumpTotal) kpiLumpTotal.textContent = formatCompactINR(summary.initialLumpsum);
  if (kpiCorpus) kpiCorpus.textContent = formatINR(summary.finalAccumulationCorpus);
  if (kpiGainMultiple) kpiGainMultiple.textContent = gainMultiple + ' Invested';

  if (kpiMonthlySip) kpiMonthlySip.textContent = formatINR(inputs.monthlySip);
  if (kpiSipPeriodYears) kpiSipPeriodYears.textContent = `${inputs.sipPeriodYears} Years`;

  if (kpiTotalGain) {
    kpiTotalGain.textContent = formatINR(totalWealthGain);
  }
  if (kpiGainPercent) {
    const pct = summary.totalInvested > 0 ? ((totalWealthGain / summary.totalInvested) * 100).toFixed(1) : '0';
    kpiGainPercent.textContent = `+${pct}% returns`;
  }

  if (kpiAnnualExpense) kpiAnnualExpense.textContent = formatINR(summary.initialAnnualExpense);
  if (kpiMonthlyExpense) kpiMonthlyExpense.textContent = `${formatINR(summary.initialMonthlyExpense)} / mo`;

  if (kpiInflation) kpiInflation.textContent = formatPercent(summary.inflationRate);
  if (kpiSwpReturn) kpiSwpReturn.textContent = formatPercent(summary.swpReturn);

  if (kpiRetirementAge) kpiRetirementAge.textContent = `Age ${summary.retirementStartAge}`;
  if (kpiCurrentAge) kpiCurrentAge.textContent = `${inputs.currentAge}`;

  // Sustainability KPI Card
  if (kpiSustainabilityYears) {
    if (summary.isExhaustedEver) {
      kpiSustainabilityYears.textContent = `${summary.sustainabilityYears} Years`;
      if (kpiSustainabilitySub) kpiSustainabilitySub.innerHTML = `<span style="color: var(--snazzy-burgundy); font-weight: 600;">⚠️ Depleted at Age ${summary.exhaustionAge}</span>`;
      if (kpiStatusIcon) kpiStatusIcon.textContent = '⚠️';
    } else {
      kpiSustainabilityYears.textContent = `${summary.retirementSustainabilityYears} Years`;
      if (kpiSustainabilitySub) kpiSustainabilitySub.innerHTML = `<span style="color: var(--snazzy-emerald); font-weight: 600;">✓ Sustains full ${summary.retirementSustainabilityYears} yrs (to Age ${summary.retirementStartAge + summary.retirementSustainabilityYears})</span>`;
      if (kpiStatusIcon) kpiStatusIcon.textContent = '🛡️';
    }
  }

  // 4. Advisory Insights & Alerts
  if (isSip) {
    advisorySection.className = 'snazzy-insights-card';
    insightIconBox.textContent = '📈';
    insightHeading.textContent = `SIP Wealth Accumulation: ${formatCompactINR(summary.finalAccumulationCorpus)} at ${inputs.expectedReturn}% Return`;
    insightText.textContent = `By investing ${formatINR(inputs.monthlySip)}/month for ${inputs.sipPeriodYears} years at ${inputs.expectedReturn}% p.a. expected return${inputs.lumpsum > 0 ? ' (with initial lumpsum of ' + formatINR(inputs.lumpsum) + ')' : ''}, your total investment of ${formatINR(summary.totalInvested)} is projected to grow into a maturity corpus of ${formatINR(summary.finalAccumulationCorpus)}, creating ${formatINR(totalWealthGain)} in compounding wealth returns.`;
    metaAccReturn.textContent = formatPercent(summary.expectedReturn);
    metaSwpReturn.textContent = formatCompactINR(totalWealthGain);
    metaInflation.textContent = formatCompactINR(summary.totalInvested);
    metaWithdrawalRate.textContent = gainMultiple;
  } else {
    metaAccReturn.textContent = formatPercent(summary.expectedReturn);
    metaSwpReturn.textContent = formatPercent(summary.swpReturn);
    metaInflation.textContent = formatPercent(summary.inflationRate);
    metaWithdrawalRate.textContent = formatPercent(summary.initialWithdrawalRate);

    if (summary.hasAnyCorpusError) {
      advisorySection.className = 'snazzy-insights-card warning';
      insightIconBox.textContent = '⚠️';
      insightHeading.textContent = `Insufficient Corpus for Planned Future Expenses (${summary.corpusErrorYears.join(', ')})`;
      insightText.textContent = `Warning: In Year(s) ${summary.corpusErrorYears.join(', ')}, planned milestone expenses exceed available corpus balance. Please adjust milestone expense amounts or inject additional lumpsum/SIP.`;
    } else if (summary.isExhaustedEver) {
      advisorySection.className = 'snazzy-insights-card warning';
      insightIconBox.textContent = '⚠️';
      insightHeading.textContent = `Retirement Corpus Depletion Warning (Depletes in ${summary.sustainabilityYears} Years at Age ${summary.exhaustionAge})`;
      insightText.textContent = `Under the simulated withdrawals, the portfolio is exhausted in Year ${summary.sustainabilityYears} (Age ${summary.exhaustionAge}). To sustain your full ${summary.retirementSustainabilityYears}-year retirement horizon, consider increasing your monthly SIP to the goal-calculated target of ${formatINR(summary.requiredMonthlySip || 0)} or adjusting expenses.`;
    } else {
      advisorySection.className = 'snazzy-insights-card';
      insightIconBox.textContent = '🛡️';
      insightHeading.textContent = `Retirement Plan Fully Sustained for ${summary.retirementSustainabilityYears} Years`;
      insightText.textContent = `Based on your lifestyle and assumptions, your retirement corpus of ${formatINR(summary.finalAccumulationCorpus)} successfully preserves household purchasing power and sustains inflation-adjusted withdrawals across your entire ${summary.retirementSustainabilityYears}-year retirement duration up to Age ${summary.retirementStartAge + summary.retirementSustainabilityYears}.`;
    }
  }

  // 5. Dynamic Table Column Headers
  thDynamicAccGain.textContent = `Gain / Yr (${summary.expectedReturn}%)`;
  thDynamicGain.textContent = `Total Gain (${summary.swpReturn}%)`;

  if (summary.growthPauseYears > 0) {
    accTableSubheader.textContent = `SIP ${formatINR(inputs.monthlySip)}/mo (${summary.sipActiveYears} Yrs) + ${summary.growthPauseYears} Yrs Compounding @ ${summary.expectedReturn}% • Retires Age ${summary.retirementStartAge}`;
  } else if (inputs.stepUpEnabled) {
    const stepLabel = inputs.stepUpType === 'percent' ? `+${inputs.stepUpValue}%/yr Step-Up` : `+${formatINR(inputs.stepUpValue)}/yr Step-Up`;
    accTableSubheader.textContent = `SIP ${formatINR(inputs.monthlySip)}/mo (${stepLabel}) @ ${summary.expectedReturn}% p.a. • ${inputs.sipPeriodYears} Yrs Accumulation`;
  } else {
    accTableSubheader.textContent = `SIP ${formatINR(inputs.monthlySip)}/mo @ ${summary.expectedReturn}% p.a. • ${inputs.sipPeriodYears} Yrs Accumulation`;
  }
  if (summary.isExhaustedEver) {
    retTableSubheader.textContent = `SWP Gain @ ${summary.swpReturn}% • ⚠️ Exhausts at Age ${summary.exhaustionAge} (${summary.sustainabilityYears} Yrs)`;
  } else {
    retTableSubheader.textContent = `SWP Gain @ ${summary.swpReturn}% p.a. • ${inputs.inflation}% Inflation • Sustains ${summary.retirementSustainabilityYears} Yrs`;
  }

  // Table Row Count Texts
  const endAccYear = summary.startYear + summary.totalAccYears - 1;
  const endAccAge = inputs.currentAge + summary.totalAccYears - 1;
  if (accRowCountText) {
    if (isSip) {
      const detailNote = summary.growthPauseYears > 0 ? ` (${summary.sipActiveYears} yrs active SIP + ${summary.growthPauseYears} yrs compounding / withdrawals)` : '';
      accRowCountText.textContent = `Showing all ${summary.totalAccYears} Years (${summary.startYear} – ${endAccYear}${detailNote})`;
    } else {
      const detailNote = summary.growthPauseYears > 0 ? ` (${summary.sipActiveYears} yrs active SIP + ${summary.growthPauseYears} yrs compounding)` : '';
      accRowCountText.textContent = `Showing all ${summary.totalAccYears} Years (${summary.startYear} – ${endAccYear} • Age ${inputs.currentAge} to ${endAccAge}${detailNote})`;
    }
  }

  if (retRowCountText) {
    const endRetAge = summary.retirementStartAge + summary.retirementSustainabilityYears - 1;
    if (summary.isExhaustedEver) {
      retRowCountText.textContent = `Showing ${summary.retirementSustainabilityYears} Years (Age ${summary.retirementStartAge} to ${endRetAge} • Exhausts in Year ${summary.sustainabilityYears})`;
    } else {
      retRowCountText.textContent = `Showing ${summary.retirementSustainabilityYears} Years (Age ${summary.retirementStartAge} to ${endRetAge} • Fully Sustained)`;
    }
  }

  // 6. Render Tables & Charts
  renderAccumulationTable(accumulationRows);
  renderRetirementTable(retirementRows, summary);
  renderCharts(currentPlan);
}

function updatePlan() {
  syncGoalRetirementParameters({ source: 'updatePlan' });
}


/**
 * Renders Accumulation Stage Table
 */
function renderAccumulationTable(rows) {
  let html = '';
  rows.forEach((row) => {
    let expenseDisplay = '<span style="color: #94A3B8;">-</span>';
    let rowClass = '';

    if (row.hasCorpusError) {
      rowClass = 'row-insufficient-corpus';
      expenseDisplay = `
        <div style="font-weight: 700; color: #DC2626;">${formatINR(row.futureExpense)}</div>
        <span class="badge-insufficient-corpus">⚠️ Not enough corpus</span>
      `;
    } else if (row.futureExpense > 0) {
      expenseDisplay = `<span style="font-weight: 600; color: var(--snazzy-burgundy);">${formatINR(row.futureExpense)}</span>`;
    }

    const startAmtDisplay = row.startAmount > 0 
      ? formatINR(row.startAmount) 
      : '<span style="color: #94A3B8;">₹0</span>';

    const sipColDisplay = row.isSipActive === false
      ? `<div style="font-weight: 500; color: #94A3B8;">₹0</div><span style="font-size: 9.5px; background: #F1F5F9; color: #64748B; padding: 1px 5px; border-radius: 4px; font-weight: 600;">SIP Paused</span>`
      : `<span style="font-weight: 600;">${formatINR(row.monthlySip)}</span>`;

    const annualSipDisplay = row.isSipActive === false
      ? `<span style="color: #94A3B8;">₹0</span>`
      : `<span style="font-weight: 600;">${formatINR(row.annualSip)}</span>`;

    html += `
      <tr class="${rowClass}">
        <td class="col-center" style="font-weight: 600; color: var(--snazzy-text-dim);">${row.calendarYear}</td>
        <td style="font-weight: 600;">${startAmtDisplay}</td>
        <td>${expenseDisplay}</td>
        <td>${sipColDisplay}</td>
        <td>${annualSipDisplay}</td>
        <td style="color: var(--snazzy-emerald); font-weight: 600;">+${formatINR(row.gain)}</td>
        <td style="font-weight: 700; color: var(--snazzy-navy);">${formatINR(row.endAmount)}</td>
        <td class="col-center"><span class="table-age-badge acc-badge">${row.age}</span></td>
      </tr>
    `;
  });
  accumulationTableBody.innerHTML = html;
}

/**
 * Renders Retirement Stage Table with Month-by-Month SWP Breakdown
 */
function renderRetirementTable(rows, summary) {
  let html = '';
  let exhaustionBannerAdded = false;

  rows.forEach((row) => {
    let rowClass = 'ret-year-row';
    let agePill = '';

    if (row.yearStatus === 'depleted') {
      rowClass += ' row-depleted';
      agePill = `<span style="background: var(--snazzy-burgundy); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">Exhausted</span>`;
    } else if (row.yearStatus === 'exhausted') {
      rowClass += ' row-exhausted';
      agePill = `<span style="font-size: 11px; color: var(--snazzy-text-dim); font-weight: 600;">Age ${row.age}</span>`;
    } else {
      agePill = `<span class="table-age-badge ret-badge">Age ${row.age}</span>`;
    }

    const inflationBadge = (row.yearNumber > 1 && row.inflationRate > 0)
      ? ` <span style="font-size: 9.5px; color: var(--snazzy-text-dim); background: #F1F5F9; padding: 1px 4px; border-radius: 3px;" title="Inflated at ${formatPercent(row.inflationRate * 100)} p.a.">(+${formatPercent(row.inflationRate * 100)})</span>`
      : '';

    html += `
      <tr class="${rowClass}" data-year="${row.yearNumber}">
        <td class="col-center" style="font-weight: 600; text-align: left; padding-left: 14px;">
          <span class="ret-expand-icon">▶</span>
          <span style="font-weight: 700; color: var(--snazzy-navy);">Yr ${row.yearNumber}</span>
          &nbsp;${agePill}
        </td>
        <td style="font-weight: 600;">${row.beginningCorpus > 0 ? formatINR(row.beginningCorpus) : '<span style="color:#94A3B8;">₹0</span>'}</td>
        <td style="color: ${row.beginningCorpus > 0 ? 'var(--snazzy-burgundy)' : 'var(--snazzy-text-dim)'};">
          ${formatINR(row.householdExpense)}${inflationBadge}
        </td>
        <td style="color: ${row.gain > 0 ? 'var(--snazzy-gold)' : 'var(--snazzy-text-dim)'}; font-weight: 600;">
          ${row.gain > 0 ? '+' + formatINR(row.gain) : '<span style="color:#94A3B8;">₹0</span>'}
        </td>
        <td style="color: ${row.actualWithdrawal > 0 ? 'var(--snazzy-burgundy)' : 'var(--snazzy-text-dim)'}; font-weight: 600;">
          ${row.actualWithdrawal > 0 ? formatINR(row.actualWithdrawal) : '<span style="color:#94A3B8;">₹0</span>'}
        </td>
        <td style="font-weight: 700; color: ${row.endCorpus > 0 ? 'var(--snazzy-navy)' : 'var(--snazzy-burgundy)'};">
          ${row.endCorpus > 0 ? formatINR(row.endCorpus) : (row.yearStatus === 'depleted' ? '⚠️ Corpus Exhausted (₹0)' : '<span style="color:#94A3B8;">₹0 (Depleted)</span>')}
        </td>
      </tr>
    `;

    // Monthly breakdown sub-row
    if (row.months && row.months.length > 0) {
      const monthlySwpRate = (summary.swpReturn / 12).toFixed(3);
      const monthlyWithdrawalTarget = row.householdExpense / 12;

      html += `
        <tr class="ret-monthly-breakdown-row" id="retMonthlyRow_${row.yearNumber}" style="display: none;">
          <td colspan="6">
            <div class="ret-monthly-card">
              <div class="ret-monthly-header">
                <span>📅 Year ${row.yearNumber} Month-by-Month SWP Breakdown (Age ${row.age})</span>
                <span style="font-size: 11px; font-weight: 500; color: var(--snazzy-text-dim);">
                  Monthly Return: ${monthlySwpRate}% (${summary.swpReturn}%/12) • Monthly Withdrawal: ${formatINR(monthlyWithdrawalTarget)}
                </span>
              </div>
              <div style="overflow-x: auto;">
                <table class="snazzy-report-table monthly-subtable">
                  <thead>
                    <tr>
                      <th class="col-center">Month</th>
                      <th>Opening Corpus</th>
                      <th>Monthly Withdrawal</th>
                      <th>Remaining After Withdrawal</th>
                      <th>Monthly Gain</th>
                      <th>Closing Corpus</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${row.months.map(m => `
                      <tr>
                        <td class="col-center" style="font-weight: 600; color: var(--snazzy-text-dim);">Month ${m.month}</td>
                        <td style="font-weight: 600;">${m.openingCorpus > 0 ? formatINR(m.openingCorpus) : '₹0'}</td>
                        <td style="color: ${m.monthlyWithdrawal > 0 ? 'var(--snazzy-burgundy)' : '#94A3B8'}; font-weight: 600;">
                          ${m.monthlyWithdrawal > 0 ? formatINR(m.monthlyWithdrawal) : '₹0'}
                        </td>
                        <td style="color: var(--snazzy-navy);">${m.remainingAfterWithdrawal > 0 ? formatINR(m.remainingAfterWithdrawal) : '₹0'}</td>
                        <td style="color: ${m.monthlyGain > 0 ? 'var(--snazzy-emerald)' : '#94A3B8'}; font-weight: 600;">
                          ${m.monthlyGain > 0 ? '+' + formatINR(m.monthlyGain) : '₹0'}
                        </td>
                        <td style="font-weight: 700; color: ${m.closingCorpus > 0 ? 'var(--snazzy-navy)' : 'var(--snazzy-burgundy)'};">
                          ${m.closingCorpus > 0 ? formatINR(m.closingCorpus) : '₹0'}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td class="col-center">Year ${row.yearNumber} Total</td>
                      <td style="font-weight: 700;">${row.beginningCorpus > 0 ? formatINR(row.beginningCorpus) : '₹0'}</td>
                      <td style="color: var(--snazzy-burgundy); font-weight: 700;">${formatINR(row.actualWithdrawal)}</td>
                      <td style="color: #94A3B8;">-</td>
                      <td style="color: var(--snazzy-gold); font-weight: 700;">+${formatINR(row.gain)}</td>
                      <td style="font-weight: 800; color: var(--snazzy-navy);">${row.endCorpus > 0 ? formatINR(row.endCorpus) : '₹0'}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </td>
        </tr>
      `;
    }

    // Add explanatory notice right below the depleted year
    if (row.yearStatus === 'depleted' && !exhaustionBannerAdded) {
      exhaustionBannerAdded = true;
      html += `
        <tr>
          <td colspan="6" style="background: #FFF5F5; border: 1px solid #FECACA; padding: 12px 16px; text-align: center; color: var(--snazzy-burgundy); font-size: 12px; line-height: 1.5;">
            <strong>⚠️ Retirement Corpus Fully Depleted at Age ${summary.exhaustionAge}:</strong> The accumulated corpus of ${formatINR(summary.finalAccumulationCorpus)} was exhausted in Year ${summary.sustainabilityYears} due to annual withdrawals (${formatINR(row.householdExpense)}). Subsequent years show ₹0 remaining.
          </td>
        </tr>
      `;
    }
  });

  retirementTableBody.innerHTML = html;

  // Add click listeners to expand/collapse each individual year's 12-month table
  retirementTableBody.querySelectorAll('.ret-year-row').forEach(tr => {
    tr.addEventListener('click', () => {
      const yr = tr.dataset.year;
      const subRow = document.getElementById(`retMonthlyRow_${yr}`);
      if (subRow) {
        const isShown = (subRow.style.display !== 'none');
        subRow.style.display = isShown ? 'none' : 'table-row';
        tr.classList.toggle('expanded', !isShown);
      }
    });
  });

  // Attach listener for the global toggle button in table banner
  const toggleMonthlyBtn = document.getElementById('toggleMonthlyBreakdownBtn');
  if (toggleMonthlyBtn && !toggleMonthlyBtn.dataset.listenerAttached) {
    toggleMonthlyBtn.dataset.listenerAttached = 'true';
    let allExpanded = false;
    toggleMonthlyBtn.addEventListener('click', () => {
      allExpanded = !allExpanded;
      document.querySelectorAll('.ret-monthly-breakdown-row').forEach(r => {
        r.style.display = allExpanded ? 'table-row' : 'none';
      });
      document.querySelectorAll('.ret-year-row').forEach(r => {
        r.classList.toggle('expanded', allExpanded);
      });
      toggleMonthlyBtn.innerHTML = allExpanded ? '<span>📅 Collapse All Months</span>' : '<span>📅 Expand All Months</span>';
    });
  }
}

/**
 * Debounced live update handler
 */
function onInputChange() {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    updatePlan();
  }, 150);
}

/**
 * Handle Excel Export with UI loading indicator
 */
async function handleExcelDownload(btn) {
  if (!currentPlan) return;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<span class="spinner" style="display:inline-block;width:13px;height:13px;border:2px solid #FFF;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> <span>Exporting Excel...</span>`;
  btn.disabled = true;

  try {
    const clientName = clientNameInput ? clientNameInput.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_') : 'Client';
    const filename = `Snazzy_WealthPlan_${clientName}_Age${currentPlan.inputs.currentAge}_${currentPlan.inputs.sipPeriodYears}Yrs.xlsx`;
    await downloadExcelFile(currentPlan, filename);
  } catch (err) {
    console.error('Failed to generate Excel file:', err);
    alert('There was an issue generating the Excel document. Please check console.');
  } finally {
    btn.innerHTML = originalHtml;
    btn.disabled = false;
  }
}

/**
 * Setup Event Listeners
 */
function setupListeners() {
  // 1. Planning Mode Switcher (Goal-Based vs SIP-Based)
  if (modeGoalBtn && modeSipBtn) {
    modeGoalBtn.addEventListener('click', () => {
      applyPlanningModeUI('goal');
      syncFutureExpenseYearOptions();
      syncGoalRetirementParameters({ source: 'modeSwitch' });
    });

    modeSipBtn.addEventListener('click', () => {
      applyPlanningModeUI('sip');
      syncFutureExpenseYearOptions();
      syncGoalRetirementParameters({ source: 'modeSwitch' });
    });
  }

  // Action Buttons inside SIP Calculator Card (SIP Mode)
  if (calculateSipBtn) {
    calculateSipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      updatePlanInternal();

      const sipYrs = parseNumberInput(sipPeriodYearsEl.value, 20);
      const originalText = calculateSipBtn.innerHTML;
      calculateSipBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>✓ ${sipYrs}-Year Plan Calculated!</span>
      `;
      calculateSipBtn.style.background = 'var(--snazzy-emerald)';
      calculateSipBtn.style.borderColor = 'var(--snazzy-emerald)';

      setTimeout(() => {
        calculateSipBtn.innerHTML = originalText;
        calculateSipBtn.style.background = '';
        calculateSipBtn.style.borderColor = '';
      }, 1500);

      const tablesSection = document.getElementById('tablesSection');
      const snapshotSection = document.getElementById('snapshotSection');
      if (tablesSection) {
        tablesSection.classList.remove('section-highlight-pulse');
        void tablesSection.offsetWidth;
        tablesSection.classList.add('section-highlight-pulse');
        tablesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (snapshotSection) {
        snapshotSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  if (viewSipTablesBtn) {
    viewSipTablesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const tablesSection = document.getElementById('tablesSection');
      if (tablesSection) {
        tablesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // 2. Retirement Sustainability Quick Preset Chips
  if (sustainabilityPresetChips) {
    sustainabilityPresetChips.addEventListener('click', (e) => {
      const chip = e.target.closest('.preset-chip');
      if (!chip) return;
      const years = Number(chip.dataset.years);
      if (years && retirementSustainabilityYearsEl) {
        retirementSustainabilityYearsEl.value = years;
        syncGoalRetirementParameters({ source: 'presetYears' });
      }
    });
  }

  // 3. Card 1 & Card 2 Age Inputs
  const handleCurrentAgeChange = () => {
    if (sipCurrentAgeEl) sipCurrentAgeEl.value = currentAgeEl.value;
    syncGoalRetirementParameters({ source: 'ageInput' });
    syncFutureExpenseYearOptions();
  };
  if (currentAgeEl) {
    currentAgeEl.addEventListener('input', handleCurrentAgeChange);
    currentAgeEl.addEventListener('change', handleCurrentAgeChange);
  }

  const handleRetirementAgeChange = () => {
    if (sipRetirementAgeEl) sipRetirementAgeEl.value = retirementAgeEl.value;
    syncGoalRetirementParameters({ source: 'ageInput' });
    syncFutureExpenseYearOptions();
  };
  if (retirementAgeEl) {
    retirementAgeEl.addEventListener('input', handleRetirementAgeChange);
    retirementAgeEl.addEventListener('change', handleRetirementAgeChange);
  }

  const handleSipCurrentAgeChange = () => {
    if (currentAgeEl) currentAgeEl.value = sipCurrentAgeEl.value;
    syncGoalRetirementParameters({ source: 'sipAgeInput' });
    syncFutureExpenseYearOptions();
  };
  if (sipCurrentAgeEl) {
    sipCurrentAgeEl.addEventListener('input', handleSipCurrentAgeChange);
    sipCurrentAgeEl.addEventListener('change', handleSipCurrentAgeChange);
  }

  const handleSipRetirementAgeChange = () => {
    if (retirementAgeEl) retirementAgeEl.value = sipRetirementAgeEl.value;
    syncGoalRetirementParameters({ source: 'sipAgeInput' });
    syncFutureExpenseYearOptions();
  };
  if (sipRetirementAgeEl) {
    sipRetirementAgeEl.addEventListener('input', handleSipRetirementAgeChange);
    sipRetirementAgeEl.addEventListener('change', handleSipRetirementAgeChange);
  }

  const otherGoalInputs = [
    currentMonthlyExpenseEl,
    preRetirementInflationEl,
    retirementSustainabilityYearsEl,
  ].filter(Boolean);

  otherGoalInputs.forEach((input) => {
    input.addEventListener('input', () => {
      syncGoalRetirementParameters({ source: 'goalInput' });
      syncFutureExpenseYearOptions();
    });
  });

  // 4. Card 2 Inputs: Investment Inputs
  if (sipPeriodYearsEl) {
    const handleSipPeriodChange = () => {
      syncGoalRetirementParameters({ source: 'sipPeriodInput' });
      syncFutureExpenseYearOptions();
    };
    sipPeriodYearsEl.addEventListener('input', handleSipPeriodChange);
    sipPeriodYearsEl.addEventListener('change', handleSipPeriodChange);
  }

  if (monthlySipEl) {
    monthlySipEl.addEventListener('input', () => {
      if (currentPlanningMode === 'sip') {
        const curSip = parseNumberInput(monthlySipEl.value, 0);
        if (monthlySipWords) {
          monthlySipWords.textContent = `${formatINR(curSip)} / month (${formatCompactINR(curSip * 12)} / yr)`;
        }
        updatePlanInternal();
      }
    });
  }

  const investInputs = [
    lumpsumEl,
    expectedReturnEl,
    startYearEl,
    stepUpValue,
  ].filter(Boolean);

  investInputs.forEach((input) => {
    input.addEventListener('input', () => {
      syncGoalRetirementParameters({ source: 'investInput' });
    });
  });

  // 5. Card 3 Inputs: Retirement / SWP Assumptions
  const swpInputs = [
    inflationEl,
    swpReturnEl,
  ].filter(Boolean);

  swpInputs.forEach((input) => {
    input.addEventListener('input', () => {
      syncGoalRetirementParameters({ source: 'swpInput' });
    });
  });

  if (annualExpensesEl) {
    annualExpensesEl.addEventListener('input', () => {
      if (currentPlanningMode === 'sip') {
        updatePlanInternal();
      }
    });
  }


  // Step-Up SIP Toggle Switch and Box Click
  if (stepUpCheckbox) {
    stepUpCheckbox.addEventListener('change', () => {
      const active = stepUpCheckbox.checked;
      if (active) {
        stepUpToggleCard.classList.add('active');
        stepUpFieldsWrapper.style.display = 'block';
      } else {
        stepUpToggleCard.classList.remove('active');
        stepUpFieldsWrapper.style.display = 'none';
      }
      updatePlan();
    });
  }

  if (stepUpHeaderRow) {
    stepUpHeaderRow.addEventListener('click', (e) => {
      if (e.target.closest('.snazzy-switch') || e.target === stepUpCheckbox) return;
      stepUpCheckbox.checked = !stepUpCheckbox.checked;
      stepUpCheckbox.dispatchEvent(new Event('change'));
    });
  }

  // Future Expense Toggle Switch
  if (futureExpenseCheckbox) {
    futureExpenseCheckbox.addEventListener('change', () => {
      const active = futureExpenseCheckbox.checked;
      if (active) {
        futureExpenseToggleCard.classList.add('active');
        futureExpenseFieldsWrapper.style.display = 'block';
        syncFutureExpenseYearOptions();
      } else {
        futureExpenseToggleCard.classList.remove('active');
        futureExpenseFieldsWrapper.style.display = 'none';
      }
      updatePlan();
    });
  }

  // Future Expense Year Selects
  if (feStartYearEl) {
    feStartYearEl.addEventListener('change', () => {
      const sY = Number(feStartYearEl.value);
      const eY = Number(feEndYearEl.value);
      if (eY < sY) {
        feEndYearEl.value = sY;
      }
      renderFutureExpenseYearInputs();
      updatePlan();
    });
  }

  if (feEndYearEl) {
    feEndYearEl.addEventListener('change', () => {
      const sY = Number(feStartYearEl.value);
      const eY = Number(feEndYearEl.value);
      if (eY < sY) {
        feStartYearEl.value = eY;
      }
      renderFutureExpenseYearInputs();
      updatePlan();
    });
  }

  // Quick-Fill Apply Button
  if (feApplyQuickFillBtn && feQuickFillAmount) {
    feApplyQuickFillBtn.addEventListener('click', () => {
      const qfVal = parseNumberInput(feQuickFillAmount.value, 0);
      const fromY = Number(feStartYearEl.value);
      const toY = Number(feEndYearEl.value);
      for (let y = fromY; y <= toY; y++) {
        futureExpensesMap[y] = qfVal;
      }
      renderFutureExpenseYearInputs();
      updatePlan();
    });
  }

  // Resync year options when sip period or start year changes
  if (sipPeriodYearsEl) {
    sipPeriodYearsEl.addEventListener('change', () => {
      syncFutureExpenseYearOptions();
    });
  }
  if (startYearEl) {
    startYearEl.addEventListener('change', () => {
      syncFutureExpenseYearOptions();
    });
  }

  // Step-Up Unit Switcher (% vs ₹)
  if (unitBtnPercent && unitBtnRupee) {
    unitBtnPercent.addEventListener('click', () => {
      currentStepUpMode = 'percent';
      unitBtnPercent.classList.add('active');
      unitBtnRupee.classList.remove('active');
      stepUpPrefix.style.display = 'none';
      stepUpSuffix.style.display = 'inline-flex';
      stepUpSuffix.textContent = '%';
      stepUpModeHint.textContent = 'Percentage Mode';
      if (stepUpValue) {
        stepUpValue.placeholder = '10';
        if (Number(stepUpValue.value) > 100) stepUpValue.value = '10';
      }
      updatePlan();
    });

    unitBtnRupee.addEventListener('click', () => {
      currentStepUpMode = 'amount';
      unitBtnRupee.classList.add('active');
      unitBtnPercent.classList.remove('active');
      stepUpPrefix.style.display = 'inline-flex';
      stepUpSuffix.style.display = 'none';
      stepUpModeHint.textContent = 'Rupees (₹) Mode';
      if (stepUpValue) {
        stepUpValue.placeholder = '1000';
        if (Number(stepUpValue.value) <= 50) stepUpValue.value = '1000';
      }
      updatePlan();
    });
  }

  // View Calculation Table button
  if (viewTablesBtn) {
    viewTablesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const tablesSection = document.getElementById('tablesSection');
      if (tablesSection) {
        tablesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  calculateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    updatePlan();

    const sipYrs = parseNumberInput(sipPeriodYearsEl.value, 20);
    const originalText = calculateBtn.innerHTML;
    calculateBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>✓ ${sipYrs}-Year Plan Calculated!</span>
    `;
    calculateBtn.style.background = 'var(--snazzy-emerald)';
    calculateBtn.style.borderColor = 'var(--snazzy-emerald)';

    setTimeout(() => {
      calculateBtn.innerHTML = originalText;
      calculateBtn.style.background = '';
      calculateBtn.style.borderColor = '';
    }, 1500);

    // Pulse effect and scroll directly to Tables section
    const tablesSection = document.getElementById('tablesSection');
    const snapshotSection = document.getElementById('snapshotSection');
    if (tablesSection) {
      tablesSection.classList.remove('section-highlight-pulse');
      void tablesSection.offsetWidth;
      tablesSection.classList.add('section-highlight-pulse');
      tablesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (snapshotSection) {
      snapshotSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Table Expand / Collapse Height Toggles
  if (toggleAccExpandBtn) {
    toggleAccExpandBtn.addEventListener('click', () => {
      const container = accTableWrapper.querySelector('.table-scroll-container');
      if (container) {
        container.classList.toggle('is-expanded');
        const isExp = container.classList.contains('is-expanded');
        toggleAccExpandBtn.innerHTML = isExp ? `<span>⤢ Collapse View</span>` : `<span>⤢ Expand Full Table</span>`;
      }
    });
  }

  if (toggleRetExpandBtn) {
    toggleRetExpandBtn.addEventListener('click', () => {
      const container = retTableWrapper.querySelector('.table-scroll-container');
      if (container) {
        container.classList.toggle('is-expanded');
        const isExp = container.classList.contains('is-expanded');
        toggleRetExpandBtn.innerHTML = isExp ? `<span>⤢ Collapse View</span>` : `<span>⤢ Expand Full Table</span>`;
      }
    });
  }

  downloadExcelBtn.addEventListener('click', () => handleExcelDownload(downloadExcelBtn));
  if (quickDownloadExcelBtn) {
    quickDownloadExcelBtn.addEventListener('click', () => handleExcelDownload(quickDownloadExcelBtn));
  }

  // Table Tabs (Dual Side-by-Side, Accumulation only, Retirement only)
  document.querySelectorAll('.table-tab-btn').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.table-tab-btn').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');

      const mode = tabBtn.dataset.tab;
      if (mode === 'both') {
        dualTableContainer.style.gridTemplateColumns = '1fr 1fr';
        accTableWrapper.style.display = 'flex';
        retTableWrapper.style.display = 'flex';
      } else if (mode === 'acc') {
        dualTableContainer.style.gridTemplateColumns = '1fr';
        accTableWrapper.style.display = 'flex';
        retTableWrapper.style.display = 'none';
      } else if (mode === 'ret') {
        dualTableContainer.style.gridTemplateColumns = '1fr';
        accTableWrapper.style.display = 'none';
        retTableWrapper.style.display = 'flex';
      }
    });
  });

  // Client View Mode Toggle
  if (advisorModeBtn && clientModeBtn) {
    advisorModeBtn.addEventListener('click', () => {
      advisorModeBtn.classList.add('active');
      clientModeBtn.classList.remove('active');
      if (clientNameCard) clientNameCard.classList.remove('active');
    });

    clientModeBtn.addEventListener('click', () => {
      clientModeBtn.classList.add('active');
      advisorModeBtn.classList.remove('active');
      if (clientNameCard) clientNameCard.classList.add('active');
    });
  }

  // Set report date badge
  if (reportDateBadge) {
    const now = new Date();
    reportDateBadge.textContent = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
}

// Initialize Application
function initApp() {
  syncFutureExpenseYearOptions();
  setupListeners();
  applyPlanningModeUI(currentPlanningMode);
  syncGoalRetirementParameters({ source: 'init' });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

