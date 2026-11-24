import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  calculateFinancialPlan,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
} from './calculator.js';
import {
  formatINR,
  formatPercent,
  formatIndianNumber,
} from './utils/formatters.js';
import { SEGOE_REGULAR_BASE64, SEGOE_BOLD_BASE64 } from './utils/pdfFontBase64.js';
import { SNAZZY_LOGO_BASE64 } from './utils/logoBase64.js';

// Visual Style Palette matching Snazzy Wealth (snazzywealth.in)
const COLORS = {
  navyDark: [6, 28, 65],        // #061C41 Snazzy Deep Navy
  navyHeader: [137, 18, 40],    // #891228 Snazzy Burgundy for Section & Table Headers
  navyLight: [253, 250, 246],   // #FDFDF6 Soft Warm Ivory Row Alternate
  gold: [205, 155, 48],         // #CD9B30 Snazzy Gold Accent
  goldLight: [245, 230, 195],   // Soft Gold for subtitles
  burgundy: [137, 18, 40],      // #891228 Snazzy Primary Burgundy
  textDark: [15, 23, 42],       // #0F172A Body Text
  textMuted: [84, 89, 95],      // #54595F Secondary Text
  borderBlue: [205, 155, 48],   // Snazzy Gold Borders
  borderLight: [230, 226, 220], // #E6E2DC Warm Subtle Border
  green: [14, 112, 64],         // #0E7040 Snazzy Emerald / Sustainable
  red: [185, 28, 28],           // #B91C1C Warning / Depletion
  cardBg: [255, 255, 255],      // Pure White Card Background
  creamBg: [252, 249, 244],     // #FCF9F4 Warm Cream Surface
  white: [255, 255, 255],
};

/**
 * Registers custom Segoe UI regular and bold fonts supporting native Rupee (₹) symbol.
 * @param {jsPDF} doc
 */
function registerFonts(doc) {
  try {
    doc.addFileToVFS('SegoeUI.ttf', SEGOE_REGULAR_BASE64);
    doc.addFont('SegoeUI.ttf', 'SegoeUI', 'normal');

    doc.addFileToVFS('SegoeUI-Bold.ttf', SEGOE_BOLD_BASE64);
    doc.addFont('SegoeUI-Bold.ttf', 'SegoeUI', 'bold');

    doc.setFont('SegoeUI', 'normal');
  } catch (err) {
    console.warn('Font registration notice:', err);
  }
}

/**
 * Draws running footer on every page of the document
 * @param {jsPDF} doc
 * @param {number} pageNum
 * @param {number} totalPages
 */
function drawFooter(doc, pageNum, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - 32;

  // Thin dividing line
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.6);
  doc.line(40, footerY - 8, pageWidth - 40, footerY - 8);

  // Left side: Company & regulatory info
  doc.setFont('SegoeUI', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.navyDark);
  doc.text('SNAZZY WEALTH PVT. LTD.', 40, footerY + 2);

  doc.setFont('SegoeUI', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    'AMFI-Registered Mutual Fund Distributor | Wealth Planning & Advisory Services',
    40,
    footerY + 12
  );
  doc.text(
    'Email: contact@snazzywealth.in  |  Website: www.snazzywealth.in',
    40,
    footerY + 21
  );

  // Right side: Page numbering
  doc.setFont('SegoeUI', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.navyDark);
  const pageStr = `Page ${pageNum} of ${totalPages}`;
  doc.text(pageStr, pageWidth - 40, footerY + 10, { align: 'right' });
}

/**
 * Draws standard document header with Snazzy Wealth branding & logo
 * @param {jsPDF} doc
 * @param {string} title
 * @param {string} subtitle
 * @param {number} startY
 * @returns {number} Y position after header
 */
function drawPageHeader(doc, title, subtitle, startY = 36) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Snazzy Wealth Logo on the right
  if (SNAZZY_LOGO_BASE64) {
    try {
      const logoWidth = 65;
      const logoHeight = 36;
      doc.addImage(
        SNAZZY_LOGO_BASE64,
        'PNG',
        pageWidth - 40 - logoWidth,
        startY - 4,
        logoWidth,
        logoHeight
      );
    } catch (e) {
      doc.setFont('SegoeUI', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.navyDark);
      doc.text('SNAZZY WEALTH', pageWidth - 40, startY + 10, { align: 'right' });
    }
  }

  // Left Title
  doc.setFont('SegoeUI', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...COLORS.navyDark);
  doc.text(title, 40, startY + 10);

  // Subtitle
  if (subtitle) {
    doc.setFont('SegoeUI', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(subtitle, 40, startY + 24);
  }

  // Decorative blue/gold dividing rule
  const lineY = startY + 34;
  doc.setDrawColor(...COLORS.navyHeader);
  doc.setLineWidth(1.5);
  doc.line(40, lineY, pageWidth - 40, lineY);

  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(1.5);
  doc.line(40, lineY + 2, 120, lineY + 2);

  return lineY + 14;
}

/**
 * Draws a section header bar with optional right-aligned text (e.g. "@ 12% p.a.")
 * @param {jsPDF} doc
 * @param {string} title
 * @param {number} y
 * @param {string} [rightText]
 * @param {number} width
 * @returns {number} new Y
 */
function drawSectionBar(doc, title, y, rightText = '', width = 515) {
  doc.setFillColor(...COLORS.navyHeader);
  doc.roundedRect(40, y, width, 18, 2, 2, 'F');

  // Subtle gold accent strip on the left edge
  doc.setFillColor(...COLORS.gold);
  doc.rect(40, y, 3, 18, 'F');

  doc.setFont('SegoeUI', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text(title, 48, y + 12.5);

  if (rightText) {
    doc.setFont('SegoeUI', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gold);
    doc.text(rightText, 40 + width - 10, y + 12.5, { align: 'right' });
  }

  return y + 22;
}

/**
 * Draws a clean vector illustration of the Corpus Progression Trajectory
 * as a graceful fallback when canvas / images are not provided (e.g. headless Node).
 */
function drawVectorChart1Fallback(doc, x, y, width, height) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  for (let i = 1; i <= 3; i++) {
    const gy = y + (height * i) / 4;
    doc.line(x, gy, x + width, gy);
  }

  const startX = x + 10;
  const peakX = x + width * 0.55;
  const endX = x + width - 10;
  const startY = y + height - 15;
  const peakY = y + 20;
  const endY = y + height - 25;

  // Gold invested line (dashed)
  doc.setDrawColor(205, 155, 48);
  doc.setLineWidth(1.2);
  doc.line(startX, startY, peakX, y + height * 0.65);
  doc.line(peakX, y + height * 0.65, endX, y + height * 0.65);

  // Navy corpus trajectory
  doc.setDrawColor(6, 28, 65);
  doc.setLineWidth(1.8);
  doc.line(startX, startY, x + width * 0.3, y + height * 0.55);
  doc.line(x + width * 0.3, y + height * 0.55, peakX, peakY);
  doc.line(peakX, peakY, x + width * 0.75, y + height * 0.45);
  doc.line(x + width * 0.75, y + height * 0.45, endX, endY);

  // Peak marker
  doc.setFillColor(205, 155, 48);
  doc.circle(peakX, peakY, 2.5, 'F');

  // Legend
  doc.setFont('SegoeUI', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(6, 28, 65);
  doc.text('● Projected Corpus', x + 15, y + 10);
  doc.setTextColor(205, 155, 48);
  doc.text('-- Total Invested', x + 90, y + 10);
}

/**
 * Draws a clean vector illustration of Inflation-Adjusted Household Expenses
 * as a graceful fallback when canvas / images are not provided (e.g. headless Node).
 */
function drawVectorChart2Fallback(doc, x, y, width, height) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  for (let i = 1; i <= 3; i++) {
    const gy = y + (height * i) / 4;
    doc.line(x, gy, x + width, gy);
  }

  const barCount = 10;
  const barWidth = (width - 30) / (barCount * 1.5);
  const baseY = y + height - 12;

  // Wine red expense bars
  for (let i = 0; i < barCount; i++) {
    const bx = x + 15 + i * (barWidth * 1.5);
    const bh = 15 + (i * (height - 35)) / barCount;
    doc.setFillColor(137, 18, 40);
    doc.roundedRect(bx, baseY - bh, barWidth, bh, 1, 1, 'F');
  }

  // Gold portfolio gain line
  doc.setDrawColor(205, 155, 48);
  doc.setLineWidth(1.4);
  let prevGx = x + 15;
  let prevGy = baseY - 20;
  for (let i = 0; i < barCount; i++) {
    const gx = x + 15 + i * (barWidth * 1.5) + barWidth / 2;
    const gy = baseY - (22 + (i * 2.5));
    doc.line(prevGx, prevGy, gx, gy);
    doc.setFillColor(205, 155, 48);
    doc.circle(gx, gy, 1.2, 'F');
    prevGx = gx;
    prevGy = gy;
  }

  // Legend
  doc.setFont('SegoeUI', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(137, 18, 40);
  doc.text('■ Inflated Expenses', x + 15, y + 10);
  doc.setTextColor(205, 155, 48);
  doc.text('● Portfolio Gain', x + 95, y + 10);
}

/**
 * Generates the full Financial Projection PDF Report
 * @param {Object} rawInputs User inputs from form
 * @returns {jsPDF} jsPDF document instance
 */
export function generateFinancialProjectionPdf(rawInputs = {}) {
  // 1. Sanitize inputs
  const clientName = (rawInputs.clientName && String(rawInputs.clientName).trim()) || 'Valued Client';
  const planningMode = rawInputs.planningMode || 'goal';
  const isSipMode = planningMode === 'sip';
  const currentAge = Math.max(18, Math.round(Number(rawInputs.currentAge) || 40));
  const retirementAge = Math.max(currentAge + 1, Math.round(Number(rawInputs.retirementAge) || 60));
  const sipPeriodYears = Math.max(1, Math.round(Number(rawInputs.sipPeriodYears) || 20));
  const monthlySip = Math.max(0, Math.round(Number(rawInputs.monthlySip) || 10000));
  const lumpsum = Math.max(0, Math.round(Number(rawInputs.lumpsum) || 0));
  const startMonth = Math.max(1, Math.min(12, Math.round(Number(rawInputs.startMonth) || 11)));
  const startYear = Math.max(2000, Math.round(Number(rawInputs.startYear) || 2026));

  const userExpReturn = rawInputs.expectedReturn !== undefined && rawInputs.expectedReturn !== ''
    ? Math.max(0.1, Number(rawInputs.expectedReturn))
    : null;

  // Dynamic Scenarios (default: [12])
  let scenarioRates = [];
  if (Array.isArray(rawInputs.scenarios) && rawInputs.scenarios.length > 0) {
    scenarioRates = rawInputs.scenarios.map(n => Math.max(0.1, Number(n) || 12));
    if (scenarioRates.length === 1 && userExpReturn !== null) {
      scenarioRates = [userExpReturn];
    }
  } else if (rawInputs.scenarioRates && Array.isArray(rawInputs.scenarioRates) && rawInputs.scenarioRates.length > 0) {
    scenarioRates = rawInputs.scenarioRates.map(n => Math.max(0.1, Number(n) || 12));
    if (scenarioRates.length === 1 && userExpReturn !== null) {
      scenarioRates = [userExpReturn];
    }
  } else if (rawInputs.scenario1Return !== undefined && rawInputs.scenario2Return !== undefined) {
    scenarioRates = [Number(rawInputs.scenario1Return) || 10, Number(rawInputs.scenario2Return) || 12];
  } else if (userExpReturn !== null) {
    scenarioRates = [userExpReturn];
  } else {
    scenarioRates = [12];
  }

  // Remove duplicates while preserving order
  scenarioRates = Array.from(new Set(scenarioRates));
  const isSingleScenario = scenarioRates.length === 1;
  const singleRate = scenarioRates[0];

  // Optional Breakdown table toggle (Default: false)
  const includeBreakdown = Boolean(rawInputs.includeBreakdown);

  // Chart Images for Page 1 side-by-side display
  const chart1Image = rawInputs.chart1Image || rawInputs.chart1Img || null;
  const chart2Image = rawInputs.chart2Image || rawInputs.chart2Img || null;

  // Future Expenses
  const futureExpensesEnabled = Boolean(rawInputs.futureExpensesEnabled);
  const futureExpenses = rawInputs.futureExpenses || {};

  // Step-Up Configuration
  const stepUpEnabled = Boolean(rawInputs.stepUpEnabled);
  const stepUpType = rawInputs.stepUpType === 'amount' ? 'amount' : 'percent';
  const stepUpValue = Number(rawInputs.stepUpValue) || (stepUpType === 'percent' ? 10 : 1000);

  // SWP & Retirement Assumptions
  const inflation = Number(rawInputs.inflation !== undefined && rawInputs.inflation !== '' ? rawInputs.inflation : 6);
  const swpReturn = Number(rawInputs.swpReturn !== undefined && rawInputs.swpReturn !== '' ? rawInputs.swpReturn : 9);
  const preRetirementInflation = Number(rawInputs.preRetirementInflation !== undefined && rawInputs.preRetirementInflation !== '' ? rawInputs.preRetirementInflation : 8);
  const currentMonthlyExpense = Number(rawInputs.currentMonthlyExpense) || 50000;
  const retirementSustainabilityYears = Math.max(5, Math.round(Number(rawInputs.retirementSustainabilityYears) || 20));

  // Determine starting annual household expenses at retirement
  const horizon = Math.max(0, retirementAge - currentAge);
  const calculatedAnnualExpenseAtRetirement = Math.round(
    currentMonthlyExpense * 12 * Math.pow(1 + (preRetirementInflation / 100), horizon)
  );
  const annualExpenses = Number(rawInputs.annualExpenses) > 0
    ? Number(rawInputs.annualExpenses)
    : (isSipMode ? 0 : calculatedAnnualExpenseAtRetirement);

  // Report Date
  const now = new Date();
  const dateFormatted = `${now.getDate()} ${MONTH_NAMES_SHORT[now.getMonth()]} ${now.getFullYear()}`;

  // 2. Perform Calculations for each scenario rate
  const scenarioPlans = scenarioRates.map((rate, idx) => {
    const planNormal = calculateFinancialPlan({
      monthlySip,
      sipPeriodYears,
      currentAge,
      retirementAge,
      lumpsum,
      startMonth,
      startYear,
      expectedReturn: rate,
      stepUpEnabled: false,
      futureExpensesEnabled,
      futureExpenses,
      inflation,
      swpReturn,
      preRetirementInflation,
      currentMonthlyExpense,
      annualExpenses,
      retirementSustainabilityYears,
      planningMode,
    });

    let planStepUp = null;
    if (stepUpEnabled) {
      planStepUp = calculateFinancialPlan({
        monthlySip,
        sipPeriodYears,
        currentAge,
        retirementAge,
        lumpsum,
        startMonth,
        startYear,
        expectedReturn: rate,
        stepUpEnabled: true,
        stepUpType,
        stepUpValue,
        futureExpensesEnabled,
        futureExpenses,
        inflation,
        swpReturn,
        preRetirementInflation,
        currentMonthlyExpense,
        annualExpenses,
        retirementSustainabilityYears,
        planningMode,
      });
    }

    const activePlan = stepUpEnabled ? planStepUp : planNormal;
    const lastRetRow = activePlan.retirementRows[activePlan.retirementRows.length - 1];
    const finalCorpusEnd = lastRetRow ? lastRetRow.endCorpus : 0;

    // Check exhaustion using exhaustionYear, isExhaustedEver, or final zero corpus before projection end
    const isExhausted = Boolean(
      activePlan.summary.isExhaustedEver ||
      activePlan.summary.exhaustionYear ||
      (finalCorpusEnd <= 0 && activePlan.summary.sustainabilityYears < retirementSustainabilityYears)
    );

    const sustainDuration = isExhausted && activePlan.summary.exhaustionYear
      ? `${activePlan.summary.exhaustionYear} Years`
      : (isExhausted && activePlan.summary.sustainabilityYears
          ? `${activePlan.summary.sustainabilityYears} Years`
          : `${retirementSustainabilityYears}+ Years (Entire Period)`);

    const depletionAge = isExhausted && activePlan.summary.exhaustionAge
      ? `Depletes at Age ${activePlan.summary.exhaustionAge}`
      : (isExhausted
          ? `Depletes at Age ${retirementAge + (activePlan.summary.exhaustionYear || 1)}`
          : `Survives beyond Age ${retirementAge + retirementSustainabilityYears}`);

    const statusText = isExhausted
      ? `Depletes at Age ${activePlan.summary.exhaustionAge || (retirementAge + (activePlan.summary.exhaustionYear || 1))}`
      : `Fully Sustainable through Age ${retirementAge + retirementSustainabilityYears}+`;

    return {
      rate,
      label: isSingleScenario ? `Scenario (@ ${rate}%)` : `Scenario ${idx + 1} (@ ${rate}%)`,
      shortLabel: isSingleScenario ? `@ ${rate}%` : `Scenario ${idx + 1}`,
      planNormal,
      planStepUp,
      activePlan,
      finalCorpusEnd,
      sustainDuration,
      depletionAge,
      isExhausted,
      statusText,
    };
  });

  const basePlanNormal = scenarioPlans[0].planNormal;
  const basePlanStepUp = scenarioPlans[0].planStepUp;

  // 3. Initialize jsPDF Document (A4 portrait: 595.28 x 841.89 pt)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  registerFonts(doc);

  // Common AutoTable style configs
  const baseTableStyles = {
    font: 'SegoeUI',
    fontSize: 7.8,
    textColor: COLORS.textDark,
    lineColor: COLORS.borderLight,
    lineWidth: 0.5,
    cellPadding: 3,
  };

  const headerTableStyles = {
    font: 'SegoeUI',
    fontStyle: 'bold',
    fontSize: 8.2,
    fillColor: COLORS.navyHeader, // #891228 Snazzy Burgundy
    textColor: COLORS.white,
    halign: 'left',
  };

  const alternateRowStyles = {
    fillColor: COLORS.navyLight, // #FDFDF6 Soft Warm Ivory
  };

  // =========================================================================
  // PAGE 1 – COMPREHENSIVE FINANCIAL PROPOSAL (SIP + SWP COMBINED)
  // =========================================================================
  const pageWidth = doc.internal.pageSize.getWidth();

  // Snazzy Wealth Registered Logo on the right
  if (SNAZZY_LOGO_BASE64) {
    try {
      const logoWidth = 65;
      const logoHeight = 36;
      doc.addImage(
        SNAZZY_LOGO_BASE64,
        'PNG',
        pageWidth - 40 - logoWidth,
        28,
        logoWidth,
        logoHeight
      );
    } catch (e) {
      console.warn('Logo draw notice:', e);
    }
  }

  // Top Left Burgundy Banner Box matching Snazzy theme
  const bannerWidth = 240;
  const bannerHeight = 38;
  doc.setFillColor(...COLORS.navyHeader);
  doc.roundedRect(40, 28, bannerWidth, bannerHeight, 3, 3, 'F');

  // Subtle gold accent strip on the left edge
  doc.setFillColor(...COLORS.gold);
  doc.rect(40, 28, 3.5, bannerHeight, 'F');

  doc.setFont('SegoeUI', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.white);
  doc.text('Financial Planning', 50, 42.5);

  doc.setFont('SegoeUI', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.goldLight);
  doc.text(`For ${clientName}`, 50, 56);

  let curY = 28 + bannerHeight + 10;

  // -------------------------------------------------------------------------
  // 1. SIP PROPOSAL SECTION
  // Heading has @ 12% p.a. right-aligned. Total Investment and Expected Future Value
  // are included directly below Step-Up SIP (no separate boxes or titles).
  // -------------------------------------------------------------------------
  const sipHeadingRight = isSingleScenario ? `@ ${singleRate}% p.a.` : scenarioRates.map(r => `@ ${r}%`).join(', ');
  curY = drawSectionBar(doc, 'SIP Proposal', curY, sipHeadingRight);

  const stepUpDisplay = stepUpEnabled
    ? (stepUpType === 'percent' ? `${stepUpValue}% Every Year` : `${formatINR(stepUpValue)} Every Year`)
    : 'Not Applicable';

  const totalInvActive = scenarioPlans[0].activePlan.summary.totalInvested;

  let expectedFvText = '';
  if (isSingleScenario) {
    expectedFvText = formatINR(scenarioPlans[0].activePlan.summary.finalAccumulationCorpus);
  } else {
    expectedFvText = scenarioPlans.map(sp => `${sp.shortLabel}: ${formatINR(sp.activePlan.summary.finalAccumulationCorpus)}`).join('   ');
  }

  const proposalRows = [
    ['Monthly SIP Amount', formatINR(monthlySip)],
    ['SIP Period (Contribution Duration)', `${sipPeriodYears} Years (${sipPeriodYears * 12} Contributions)`],
    ['Step-Up Amount Every Year', stepUpDisplay],
  ];

  if (lumpsum > 0) {
    proposalRows.push(['Initial Lumpsum Investment', formatINR(lumpsum)]);
  }

  // Combined right below Step-Up row without separate headers or boxes
  proposalRows.push(['Total Investment', formatINR(totalInvActive)]);
  proposalRows.push(['Expected Future Value', expectedFvText]);

  autoTable(doc, {
    startY: curY,
    tableWidth: 515,
    margin: { left: 40, right: 40 },
    head: [],
    body: proposalRows,
    theme: 'grid',
    styles: {
      ...baseTableStyles,
      fontSize: 8,
      cellPadding: 2.8,
    },
    alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 265, font: 'SegoeUI', fontStyle: 'bold', textColor: COLORS.navyDark },
      1: { cellWidth: 250, halign: 'right', font: 'SegoeUI', fontStyle: 'bold', textColor: COLORS.navyDark },
    },
  });

  curY = doc.lastAutoTable.finalY + 10;

  // -------------------------------------------------------------------------
  // 2. SWP PROPOSAL SECTION
  // Single table under SWP Proposal heading combining timeline & expenses
  // (Zero duplicates for Inflation, SWP Return, and Horizon).
  // -------------------------------------------------------------------------
  curY = drawSectionBar(doc, 'SWP Proposal', curY);

  const startingMonthlyExpenseAtRet = Math.round(annualExpenses / 12);

  let swpTimelineRows = [];
  if (isSipMode) {
    // In SIP-based planning, the client's focus is direct SIP accumulation and retirement SWP.
    // "Household Expense Today" is excluded because client planned starting retirement expenses directly.
    swpTimelineRows = [
      [
        'Current Age',
        `${currentAge} Years`,
        'Retirement Age',
        `${retirementAge} Years`,
      ],
      [
        'Starting Annual Expense (Year 1 SWP)',
        annualExpenses > 0 ? `${formatINR(annualExpenses)} / yr` : 'Not Applicable (Zero SWP)',
        `Starting Monthly Expense at Age ${retirementAge}`,
        annualExpenses > 0 ? `${formatINR(startingMonthlyExpenseAtRet)} / mo` : '₹0 / mo',
      ],
      [
        'Retirement Horizon / Duration',
        `${retirementSustainabilityYears} Years (Age ${retirementAge} to ${retirementAge + retirementSustainabilityYears})`,
        'Post-Retirement SWP Portfolio Return',
        formatPercent(swpReturn, 2),
      ],
      [
        'Post-Retirement Annual Inflation',
        formatPercent(inflation, 2),
        'SWP Drawdown Frequency',
        'Monthly Systematic Withdrawals',
      ],
    ];
  } else {
    // Goal-based planning: client explicitly derived target retirement corpus from current monthly household expense
    swpTimelineRows = [
      [
        'Current Age',
        `${currentAge} Years`,
        'Retirement Age',
        `${retirementAge} Years`,
      ],
      [
        'Household Expense Today',
        `${formatINR(currentMonthlyExpense)} / mo (${formatINR(currentMonthlyExpense * 12)} / yr)`,
        `Starting Monthly Expense at Age ${retirementAge}`,
        `${formatINR(startingMonthlyExpenseAtRet)} / mo`,
      ],
      [
        'Starting Annual Expense (Year 1 SWP)',
        `${formatINR(annualExpenses)} / yr`,
        'Retirement Horizon / Duration',
        `${retirementSustainabilityYears} Years (Age ${retirementAge} to ${retirementAge + retirementSustainabilityYears})`,
      ],
      [
        'Post-Retirement Annual Inflation',
        formatPercent(inflation, 2),
        'Post-Retirement SWP Portfolio Return',
        formatPercent(swpReturn, 2),
      ],
    ];
  }

  autoTable(doc, {
    startY: curY,
    tableWidth: 515,
    margin: { left: 40, right: 40 },
    head: [],
    body: swpTimelineRows,
    theme: 'grid',
    styles: {
      ...baseTableStyles,
      fontSize: 8,
      cellPadding: 2.8,
    },
    alternateRowStyles,
    columnStyles: {
      0: { cellWidth: 140, font: 'SegoeUI', fontStyle: 'bold', textColor: COLORS.navyDark },
      1: { cellWidth: 117.5, font: 'SegoeUI' },
      2: { cellWidth: 140, font: 'SegoeUI', fontStyle: 'bold', textColor: COLORS.navyDark },
      3: { cellWidth: 117.5, font: 'SegoeUI' },
    },
  });

  curY = doc.lastAutoTable.finalY + 8;

  // -------------------------------------------------------------------------
  // 2B. FUTURE EXPENSES SECTION (IF ANY FUTURE EXPENSES CONFIGURED)
  // Displayed right after the SWP Proposal section as requested
  // -------------------------------------------------------------------------
  const futureExpenseRows = [];
  if (futureExpensesEnabled && futureExpenses) {
    const activePlan = scenarioPlans[0].activePlan;

    // Check accumulation rows
    (activePlan.accumulationRows || []).forEach((row) => {
      if (row.futureExpense > 0) {
        futureExpenseRows.push({
          year: row.calendarYear,
          yearLabel: row.yearLabel || `${row.calendarYear}`,
          age: row.age,
          phase: 'SIP Accumulation Phase',
          phaseShort: `SIP Yr ${row.yearNumber}`,
          amount: row.futureExpense,
        });
      }
    });

    // Check retirement rows
    (activePlan.retirementRows || []).forEach((row) => {
      if (row.futureExpense > 0) {
        futureExpenseRows.push({
          year: row.calendarYear,
          yearLabel: row.yearLabel || `${row.calendarYear}`,
          age: row.age,
          phase: 'Retirement Phase (SWP)',
          phaseShort: `SWP Yr ${row.yearNumber}`,
          amount: row.futureExpense,
        });
      }
    });
  }

  if (futureExpenseRows.length > 0) {
    curY = drawSectionBar(doc, 'Future Goal Expenses', curY);

    const feTableHead = [['Timeline Year & Age', 'Planning Phase', 'Goal Expense Amount']];
    const feTableBody = futureExpenseRows.map(fe => [
      `${fe.yearLabel} (Age ${fe.age})`,
      `${fe.phase} (${fe.phaseShort})`,
      formatINR(fe.amount),
    ]);

    if (futureExpenseRows.length > 1) {
      const totalFeAmount = futureExpenseRows.reduce((sum, item) => sum + item.amount, 0);
      feTableBody.push([
        'Total Future Goal Expenses',
        `${futureExpenseRows.length} Scheduled Withdrawals`,
        formatINR(totalFeAmount),
      ]);
    }

    autoTable(doc, {
      startY: curY,
      tableWidth: 515,
      margin: { left: 40, right: 40 },
      head: feTableHead,
      body: feTableBody,
      theme: 'grid',
      headStyles: {
        ...headerTableStyles,
        fontSize: 7.8,
        cellPadding: 2.8,
      },
      styles: {
        ...baseTableStyles,
        fontSize: 7.5,
        cellPadding: 2.5,
      },
      alternateRowStyles,
      columnStyles: {
        0: { cellWidth: 175, font: 'SegoeUI', fontStyle: 'bold', textColor: COLORS.navyDark },
        1: { cellWidth: 200, font: 'SegoeUI' },
        2: { cellWidth: 140, halign: 'right', font: 'SegoeUI', fontStyle: 'bold', textColor: COLORS.burgundy },
      },
    });

    curY = doc.lastAutoTable.finalY + 8;
  }

  // -------------------------------------------------------------------------
  // 3. ACCUMULATION & LONGEVITY ANALYSIS
  // Kept inside the main SWP proposal flow as requested
  // -------------------------------------------------------------------------
  curY = drawSectionBar(doc, 'Accumulation & Longevity Analysis', curY);

  const endAgeLabel = retirementAge + retirementSustainabilityYears;

  if (isSingleScenario) {
    const sp = scenarioPlans[0];
    const totalInv = sp.activePlan.summary.totalInvested;
    const retCorpus = sp.activePlan.summary.finalAccumulationCorpus;
    const wealthGain = retCorpus - totalInv;
    const multiple = (retCorpus / Math.max(1, totalInv)).toFixed(2);

    const combinedHead = [['Wealth Accumulation & Longevity Parameter', `Projected Value (@ ${singleRate}%)`]];
    const combinedBody = [
      ['Total Principal Invested', formatINR(totalInv)],
      ['Accumulated Retirement Corpus', formatINR(retCorpus)],
      ['Wealth Gain (Corpus - Invested)', `${formatINR(wealthGain)} (${multiple}x Multiple)`],
      ['SWP Sustainability Duration', sp.sustainDuration],
      ['Corpus Longevity / Depletion Age', sp.depletionAge],
      [`Remaining Corpus (Age ${endAgeLabel})`, formatINR(sp.finalCorpusEnd)],
    ];

    autoTable(doc, {
      startY: curY,
      tableWidth: 515,
      margin: { left: 40, right: 40 },
      head: combinedHead,
      body: combinedBody,
      theme: 'grid',
      styles: {
        ...baseTableStyles,
        fontSize: 8,
        cellPadding: 2.8,
      },
      headStyles: {
        ...headerTableStyles,
        fontSize: 8.5,
      },
      alternateRowStyles,
      columnStyles: {
        0: { cellWidth: 285, font: 'SegoeUI', fontStyle: 'bold' },
        1: { cellWidth: 230, halign: 'right', font: 'SegoeUI', fontStyle: 'bold', textColor: COLORS.navyDark },
      },
    });
  } else {
    // Multi-scenario comparison
    const combinedHead = [['Wealth Accumulation & Longevity Parameter', ...scenarioPlans.map(sp => sp.label)]];
    const rowTotalInv = ['Total Principal Invested', ...scenarioPlans.map(sp => formatINR(sp.activePlan.summary.totalInvested))];
    const rowRetCorpus = ['Accumulated Retirement Corpus', ...scenarioPlans.map(sp => formatINR(sp.activePlan.summary.finalAccumulationCorpus))];
    const rowGain = [
      'Wealth Gain (Corpus - Invested)',
      ...scenarioPlans.map(sp => {
        const gain = sp.activePlan.summary.finalAccumulationCorpus - sp.activePlan.summary.totalInvested;
        const mult = (sp.activePlan.summary.finalAccumulationCorpus / Math.max(1, sp.activePlan.summary.totalInvested)).toFixed(2);
        return `${formatINR(gain)} (${mult}x)`;
      }),
    ];
    const rowSustain = ['SWP Sustainability Duration', ...scenarioPlans.map(sp => sp.sustainDuration)];
    const rowDepletion = ['Corpus Longevity / Depletion Age', ...scenarioPlans.map(sp => sp.depletionAge)];
    const rowRemaining = [`Remaining Corpus (Age ${endAgeLabel})`, ...scenarioPlans.map(sp => formatINR(sp.finalCorpusEnd))];

    const combinedBody = [rowTotalInv, rowRetCorpus, rowGain, rowSustain, rowDepletion, rowRemaining];

    const valColWidth = Math.floor(280 / scenarioPlans.length);
    const firstColWidth = 515 - (valColWidth * scenarioPlans.length);

    const colStylesConfig = {
      0: { cellWidth: firstColWidth, font: 'SegoeUI', fontStyle: 'bold' },
    };
    scenarioPlans.forEach((_, i) => {
      colStylesConfig[i + 1] = {
        cellWidth: valColWidth,
        halign: 'right',
        font: 'SegoeUI',
        fontStyle: 'bold',
        textColor: COLORS.navyDark,
      };
    });

    autoTable(doc, {
      startY: curY,
      tableWidth: 515,
      margin: { left: 40, right: 40 },
      head: combinedHead,
      body: combinedBody,
      theme: 'grid',
      styles: {
        ...baseTableStyles,
        fontSize: 8,
        cellPadding: 2.8,
      },
      headStyles: {
        ...headerTableStyles,
        fontSize: 8.5,
      },
      alternateRowStyles,
      columnStyles: colStylesConfig,
    });
  }

  curY = doc.lastAutoTable.finalY + 8;

  // -------------------------------------------------------------------------
  // 4. SUMMARY HIGHLIGHT CARD (PAGE 1 BOTTOM)
  // -------------------------------------------------------------------------
  if (isSingleScenario) {
    const sp0 = scenarioPlans[0];
    const cardWidth = 515;
    const cardHeight = 40;
    const cardX = 40;

    doc.setFillColor(...COLORS.cardBg);
    doc.setDrawColor(...(sp0.isExhausted ? COLORS.red : COLORS.borderBlue));
    doc.setLineWidth(1);
    doc.roundedRect(cardX, curY, cardWidth, cardHeight, 3, 3, 'FD');

    // Header strip
    doc.setFillColor(...(sp0.isExhausted ? [220, 38, 38] : COLORS.navyHeader));
    doc.roundedRect(cardX, curY, cardWidth, 14, 2, 2, 'F');

    doc.setFont('SegoeUI', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.text(`RETIREMENT ROADMAP & SWP LONGEVITY SUMMARY (@ ${singleRate}% EXPECTED RETURN)`, cardX + 10, curY + 10);

    const col1X = cardX + 12;
    const col2X = cardX + 185;
    const col3X = cardX + 355;

    doc.setFont('SegoeUI', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Accumulated Corpus:', col1X, curY + 24);
    doc.setFont('SegoeUI', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.navyDark);
    doc.text(formatINR(sp0.activePlan.summary.finalAccumulationCorpus), col1X, curY + 36);

    doc.setFont('SegoeUI', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('SWP Sustainability:', col2X, curY + 24);
    doc.setFont('SegoeUI', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(sp0.isExhausted ? COLORS.red : COLORS.green));
    doc.text(sp0.sustainDuration, col2X, curY + 36);

    doc.setFont('SegoeUI', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Corpus Longevity Status:', col3X, curY + 24);
    doc.setFont('SegoeUI', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(sp0.isExhausted ? COLORS.red : COLORS.green));
    doc.text(sp0.statusText, col3X, curY + 36);

    curY += cardHeight + 8;
  } else {
    // Multi-scenario side-by-side cards
    const gap = 10;
    const cardWidth = (515 - (gap * (scenarioPlans.length - 1))) / scenarioPlans.length;
    const cardHeight = 48;

    scenarioPlans.forEach((sp, i) => {
      const cardX = 40 + i * (cardWidth + gap);

      doc.setFillColor(...COLORS.cardBg);
      doc.setDrawColor(...(sp.isExhausted ? COLORS.red : COLORS.borderBlue));
      doc.setLineWidth(1);
      doc.roundedRect(cardX, curY, cardWidth, cardHeight, 3, 3, 'FD');

      doc.setFillColor(...(sp.isExhausted ? [220, 38, 38] : (i === 0 ? COLORS.navyHeader : COLORS.navyDark)));
      doc.roundedRect(cardX, curY, cardWidth, 14, 2, 2, 'F');

      doc.setFont('SegoeUI', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.white);
      doc.text(`SCENARIO ${i + 1} (@ ${sp.rate}%)`, cardX + 8, curY + 10);

      doc.setFont('SegoeUI', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textDark);
      doc.text(`Corpus:`, cardX + 8, curY + 23);
      doc.setFont('SegoeUI', 'bold');
      doc.text(formatINR(sp.activePlan.summary.finalAccumulationCorpus), cardX + 50, curY + 23);

      doc.setFont('SegoeUI', 'normal');
      doc.text(`Longevity:`, cardX + 8, curY + 33);
      doc.setFont('SegoeUI', 'bold');
      doc.setTextColor(...(sp.isExhausted ? COLORS.red : COLORS.green));
      doc.text(sp.sustainDuration, cardX + 50, curY + 33);

      doc.setFont('SegoeUI', 'normal');
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`Verdict:`, cardX + 8, curY + 43);
      doc.setFont('SegoeUI', 'bold');
      doc.setTextColor(...(sp.isExhausted ? COLORS.red : COLORS.green));
      doc.text(sp.isExhausted ? 'Exhausts prematurely' : '✓ Sustainable', cardX + 50, curY + 43);
    });

    curY += cardHeight + 8;
  }

  // -------------------------------------------------------------------------
  // 5. PROJECTED WEALTH JOURNEY CHARTS (PAGE 1 BOTTOM) - SIDE BY SIDE
  // Adds Corpus Progression Trajectory and Inflation-Adjusted Household Expenses
  // directly in the remaining space of Page 1 without creating Page 2.
  // -------------------------------------------------------------------------
  const totalChartWidth = 515;
  const chartGap = 15;
  const singleChartWidth = (totalChartWidth - chartGap) / 2; // 250 pt
  const leftChartX = 40;
  const rightChartX = 40 + singleChartWidth + chartGap; // 305 pt

  // Available height calculation: footer dividing line is at 801.89 pt.
  // We strictly cap the chart bottom at 766 pt to guarantee a 35+ pt buffer
  // for notice text and report date without any possibility of footer overlap.
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxChartBottom = 766;
  const chartY = curY + 2;
  const availableSpace = maxChartBottom - chartY;
  const chartCardHeight = Math.min(160, Math.max(75, availableSpace));

  // --- Left Card: Corpus Progression Trajectory ---
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.75);
  doc.roundedRect(leftChartX, chartY, singleChartWidth, chartCardHeight, 3, 3, 'FD');

  // Left Card Header
  doc.setFont('SegoeUI', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.navyDark);
  doc.text('Corpus Progression Trajectory', leftChartX + 8, chartY + 9.5);

  doc.setFont('SegoeUI', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Accumulation → SWP Phase | Principal vs Wealth', leftChartX + 8, chartY + 17.5);

  // Separator line
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.5);
  doc.line(leftChartX + 6, chartY + 20, leftChartX + singleChartWidth - 6, chartY + 20);

  // Left Chart Image or Fallback
  const imgMarginX = 5;
  const imgMarginTop = 21;
  const imgMarginBottom = 4;
  const imgW = singleChartWidth - imgMarginX * 2;
  const imgH = chartCardHeight - imgMarginTop - imgMarginBottom;

  if (chart1Image) {
    try {
      doc.addImage(chart1Image, 'PNG', leftChartX + imgMarginX, chartY + imgMarginTop, imgW, imgH);
    } catch (err) {
      console.warn('Chart 1 embed notice:', err);
      drawVectorChart1Fallback(doc, leftChartX + imgMarginX, chartY + imgMarginTop, imgW, imgH);
    }
  } else {
    drawVectorChart1Fallback(doc, leftChartX + imgMarginX, chartY + imgMarginTop, imgW, imgH);
  }

  // --- Right Card: Inflation-Adjusted Household Expenses ---
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.borderLight);
  doc.setLineWidth(0.75);
  doc.roundedRect(rightChartX, chartY, singleChartWidth, chartCardHeight, 3, 3, 'FD');

  // Right Card Header
  doc.setFont('SegoeUI', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.navyDark);
  doc.text('Inflation-Adjusted Household Expenses', rightChartX + 8, chartY + 9.5);

  doc.setFont('SegoeUI', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Rising Expenses vs Annual Portfolio Gains', rightChartX + 8, chartY + 17.5);

  // Separator line
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.5);
  doc.line(rightChartX + 6, chartY + 20, rightChartX + singleChartWidth - 6, chartY + 20);

  // Right Chart Image or Fallback
  if (chart2Image) {
    try {
      doc.addImage(chart2Image, 'PNG', rightChartX + imgMarginX, chartY + imgMarginTop, imgW, imgH);
    } catch (err) {
      console.warn('Chart 2 embed notice:', err);
      drawVectorChart2Fallback(doc, rightChartX + imgMarginX, chartY + imgMarginTop, imgW, imgH);
    }
  } else {
    drawVectorChart2Fallback(doc, rightChartX + imgMarginX, chartY + imgMarginTop, imgW, imgH);
  }

  const noticeY = chartY + chartCardHeight + 5;

  // Bottom Notice line matching reference
  doc.setFont('SegoeUI', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    '*This illustration and returns assumed are on the basis of the request made by you. These are neither indicative nor guaranteed returns.',
    40,
    noticeY + 2.5
  );
  doc.text(`Report Date : ${dateFormatted}`, 40, noticeY + 11.5);

  // =========================================================================
  // PAGE 2 (OPTIONAL) – NORMAL SIP: YEAR-WISE BREAKDOWN (ONLY IF SWITCH IS ON)
  // =========================================================================
  if (includeBreakdown) {
    doc.addPage();

    curY = drawPageHeader(
      doc,
      'Normal SIP – Year-Wise Projected Value',
      `Client: ${clientName}  |  Monthly SIP: ${formatINR(monthlySip)}  |  Horizon: ${sipPeriodYears} Years`
    );

    // Build header columns dynamically
    const breakdownHeadCols = ['Year', 'Age', 'Monthly Investment', 'Annual Investment'];
    scenarioPlans.forEach(sp => {
      breakdownHeadCols.push(`Year-End Value\n(${sp.rate}%)`);
    });

    const normalYearlyBody = basePlanNormal.accumulationRows.map((r0, i) => {
      const row = [
        `Yr ${r0.yearNumber}`,
        `${r0.age} Yrs`,
        formatINR(r0.monthlySip),
        formatINR(r0.annualSip),
      ];
      scenarioPlans.forEach(sp => {
        const rScenario = sp.planNormal.accumulationRows[i];
        row.push(formatINR(rScenario ? rScenario.endAmount : 0));
      });
      return row;
    });

    const normalFootRow = [
      [
        'Total / Final',
        '-',
        '-',
        formatINR(basePlanNormal.summary.totalSipInvested),
        ...scenarioPlans.map(sp => formatINR(sp.planNormal.summary.finalAccumulationCorpus)),
      ],
    ];

    autoTable(doc, {
      startY: curY,
      tableWidth: 515,
      margin: { left: 40, right: 40, bottom: 42 },
      head: [breakdownHeadCols],
      body: normalYearlyBody,
      foot: normalFootRow,
      showHead: 'everyPage',
      showFoot: 'lastPage',
      theme: 'grid',
      styles: {
        ...baseTableStyles,
        fontSize: 8,
        cellPadding: 4.5,
      },
      headStyles: {
        ...headerTableStyles,
        halign: 'center',
        fontSize: 8,
      },
      footStyles: {
        font: 'SegoeUI',
        fontStyle: 'bold',
        fontSize: 8.5,
        fillColor: COLORS.navyDark,
        textColor: COLORS.white,
        halign: 'right',
      },
      alternateRowStyles,
      columnStyles: {
        0: { cellWidth: 55, font: 'SegoeUI', fontStyle: 'bold' },
        1: { cellWidth: 45, halign: 'center' },
        2: { cellWidth: 80, halign: 'right' },
        3: { cellWidth: 85, halign: 'right' },
      },
    });

    // If step-up enabled and breakdown on, include step-up schedule
    if (stepUpEnabled && basePlanStepUp) {
      doc.addPage();

      curY = drawPageHeader(
        doc,
        'Step-Up SIP – Year-Wise Projected Value',
        `Client: ${clientName}  |  Starting SIP: ${formatINR(monthlySip)}  |  Step-Up: ${stepUpDisplay}`
      );

      const stepUpYearlyBody = basePlanStepUp.accumulationRows.map((r0, i) => {
        const row = [
          `Yr ${r0.yearNumber}`,
          `${r0.age} Yrs`,
          formatINR(r0.monthlySip),
          formatINR(r0.annualSip),
        ];
        scenarioPlans.forEach(sp => {
          const rScenario = sp.planStepUp ? sp.planStepUp.accumulationRows[i] : null;
          row.push(formatINR(rScenario ? rScenario.endAmount : 0));
        });
        return row;
      });

      const stepUpFootRow = [
        [
          'Total / Final',
          '-',
          '-',
          formatINR(basePlanStepUp.summary.totalSipInvested),
          ...scenarioPlans.map(sp => formatINR(sp.planStepUp ? sp.planStepUp.summary.finalAccumulationCorpus : 0)),
        ],
      ];

      autoTable(doc, {
        startY: curY,
        tableWidth: 515,
        margin: { left: 40, right: 40, bottom: 42 },
        head: [breakdownHeadCols],
        body: stepUpYearlyBody,
        foot: stepUpFootRow,
        showHead: 'everyPage',
        showFoot: 'lastPage',
        theme: 'grid',
        styles: {
          ...baseTableStyles,
          fontSize: 8,
          cellPadding: 4.5,
        },
        headStyles: {
          ...headerTableStyles,
          halign: 'center',
          fontSize: 8,
        },
        footStyles: {
          font: 'SegoeUI',
          fontStyle: 'bold',
          fontSize: 8.5,
          fillColor: COLORS.navyDark,
          textColor: COLORS.white,
          halign: 'right',
        },
        alternateRowStyles,
        columnStyles: {
          0: { cellWidth: 55, font: 'SegoeUI', fontStyle: 'bold' },
          1: { cellWidth: 45, halign: 'center' },
          2: { cellWidth: 80, halign: 'right' },
          3: { cellWidth: 85, halign: 'right' },
        },
      });
    }
  }

  // 4. Apply Running Page Numbers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  return doc;
}

/**
 * Generates and triggers browser download of the PDF
 * @param {Object} rawInputs
 * @returns {string} Downloaded filename
 */
export function downloadFinancialProjectionPdf(rawInputs = {}) {
  const doc = generateFinancialProjectionPdf(rawInputs);
  const clientName = (rawInputs.clientName && String(rawInputs.clientName).trim()) || 'Client';
  const cleanClientName = clientName.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `Snazzy_Financial_Planning_${cleanClientName}_${dateStr}.pdf`;

  doc.save(filename);
  return filename;
}
