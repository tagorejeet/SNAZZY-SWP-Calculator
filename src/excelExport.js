import ExcelJS from 'exceljs';
import { SNAZZY_LOGO_BASE64 } from './utils/logoBase64.js';

/**
 * Generates and downloads a professionally styled Excel workbook
 * replicating the reference structure with live formulas, Times New Roman font,
 * Indian Rupee formatting, and clean side-by-side tables.
 */
export async function generateExcelWorkbook(planData) {
  const { inputs, summary, accumulationRows, retirementRows } = planData;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Snazzy WealthPlan';
  workbook.lastModifiedBy = 'Snazzy Wealth Financial Advisor';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Snazzy WealthPlan', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 6 }],
    properties: { defaultRowHeight: 20 },
  });

  // Base font is Times New Roman throughout the workbook
  const FONT_NAME = 'Times New Roman';

  // Palette (Inspired by Snazzy Wealth & Excel reference)
  const COLOR_TITLE_BG = 'FF061C41'; // Snazzy Deep Navy Blue
  const COLOR_TITLE_TEXT = 'FFFFFFFF';
  const COLOR_INPUT_BG = 'FFFFF2CC'; // Soft gold/yellow highlight for editable inputs
  const COLOR_CALC_BG = 'FFF1F5F9'; // Soft gray-blue for calculated top summary
  const COLOR_LABEL_BG = 'FFF8FAFC'; // Soft header gray
  const COLOR_ACC_HEADER = 'FF92D050'; // Fresh Green (matches reference)
  const COLOR_RET_HEADER = 'FFFFC000'; // Amber/Gold (matches reference)
  const COLOR_ACC_AGE = 'FFF7CAAC'; // Soft Peach
  const COLOR_RET_AGE = 'FFBDD6EE'; // Soft Sky Blue
  const COLOR_BORDER = 'FFD1D5DB'; // Subtle border
  const COLOR_DARK_BORDER = 'FF9CA3AF'; // Distinct border
  const COLOR_EXHAUSTED_BG = 'FFFEE2E2'; // Soft Red for exhausted corpus
  const COLOR_EXHAUSTED_TEXT = 'FF991B1B';

  const thinBorder = {
    top: { style: 'thin', color: { argb: COLOR_BORDER } },
    left: { style: 'thin', color: { argb: COLOR_BORDER } },
    bottom: { style: 'thin', color: { argb: COLOR_BORDER } },
    right: { style: 'thin', color: { argb: COLOR_BORDER } },
  };

  const mediumBorder = {
    top: { style: 'medium', color: { argb: COLOR_DARK_BORDER } },
    left: { style: 'medium', color: { argb: COLOR_DARK_BORDER } },
    bottom: { style: 'medium', color: { argb: COLOR_DARK_BORDER } },
    right: { style: 'medium', color: { argb: COLOR_DARK_BORDER } },
  };

  // Indian currency format
  const CURRENCY_FMT = '[$₹-en-IN] #,##,##0';
  const PERCENT_FMT = '0.00%';

  // Set column widths (14 Columns: A through N)
  sheet.columns = [
    { key: 'A', width: 12 }, // Year
    { key: 'B', width: 22 }, // Amount @ Start of Year
    { key: 'C', width: 18 }, // Future Expense
    { key: 'D', width: 18 }, // Monthly SIP Amt
    { key: 'E', width: 22 }, // Amt Invested Each Year
    { key: 'F', width: 20 }, // Gain / Yr
    { key: 'G', width: 22 }, // Amt @ Yr End
    { key: 'H', width: 13 }, // Your Age (Acc)
    { key: 'I', width: 13 }, // Your Age (Ret)
    { key: 'J', width: 24 }, // Amount @ Year Beginning
    { key: 'K', width: 22 }, // Gain @ X% / Annum
    { key: 'L', width: 14 }, // Inflation
    { key: 'M', width: 26 }, // Annual Household Expenses
    { key: 'N', width: 24 }, // Amount @ Year End
  ];

  // ROW 1: Banner Tagline with Snazzy Wealth branding
  sheet.mergeCells('A1:N1');
  const r1 = sheet.getCell('A1');
  r1.value = 'SNAZZY WEALTHPLAN  •  PLAN TODAY. BUILD TOMORROW. RETIRE WITH CONFIDENCE.';
  r1.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLOR_TITLE_TEXT }, letterSpacing: 0.8 };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  r1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITLE_BG } };
  sheet.getRow(1).height = 40;

  // Embed Snazzy Wealth Logo right in Row 1 after the tagline
  try {
    const logoImageId = workbook.addImage({
      base64: SNAZZY_LOGO_BASE64,
      extension: 'png',
    });
    sheet.addImage(logoImageId, {
      tl: { col: 12.2, row: 0.12 },
      ext: { width: 110, height: 34 },
      editAs: 'oneCell',
    });
  } catch (err) {
    console.warn('Could not embed logo image in Excel:', err);
  }

  // Top Section: Inputs & Assumptions (Rows 2 to 4)
  // Row 2:
  // A2: "SIP / Month" | B2: sip | C2: "Initial Lumpsum" | D2: lumpsum | E2: "Total Investment" | F2: formula | G2: Quote banner (G2:L3 merged)
  // Row 3:
  // A3: "SIP Period (Yrs)" | B3: sipYears | C3: "Expected Return" | D3: expectedReturn % | E3: "Annual Expenses" | F3: annualExpenses
  // Row 4:
  // A4: "Current Age" | B4: currentAge | C4: "SWP Return" | D4: swpReturn % | E4: "Inflation" | F4: inflation % | G4: Status banner

  const setHeaderLabel = (cellRef, text) => {
    const c = sheet.getCell(cellRef);
    c.value = text;
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF334155' } };
    c.alignment = { horizontal: 'left', vertical: 'middle' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LABEL_BG } };
    c.border = thinBorder;
  };

  const setInputValue = (cellRef, value, format = null) => {
    const c = sheet.getCell(cellRef);
    c.value = value;
    c.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF0F172A' } };
    c.alignment = { horizontal: 'right', vertical: 'middle' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } };
    c.border = mediumBorder;
    if (format) c.numFmt = format;
  };

  const setCalcValue = (cellRef, formula, precalculated, format = null) => {
    const c = sheet.getCell(cellRef);
    c.value = { formula, result: precalculated };
    c.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    c.alignment = { horizontal: 'right', vertical: 'middle' };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } };
    c.border = thinBorder;
    if (format) c.numFmt = format;
  };

  const lastAccRow = 6 + accumulationRows.length;

  // Row 2
  sheet.getRow(2).height = 24;
  setHeaderLabel('A2', inputs.planningMode === 'goal' ? 'Required SIP' : 'SIP / Month');
  setInputValue('B2', inputs.monthlySip, CURRENCY_FMT);
  setHeaderLabel('C2', 'Initial Lumpsum');
  setInputValue('D2', inputs.lumpsum, CURRENCY_FMT);
  setHeaderLabel('E2', 'Total Investment');
  const totalInvFormula = `SUM(E7:E${lastAccRow})+D2`;
  setCalcValue('F2', totalInvFormula, summary.totalInvested, CURRENCY_FMT);

  // Step-up parameter in G2:H2
  setHeaderLabel('G2', 'Annual Step-Up');
  if (inputs.stepUpEnabled) {
    if (inputs.stepUpType === 'percent') {
      setInputValue('H2', inputs.stepUpValue / 100, PERCENT_FMT);
    } else {
      setInputValue('H2', inputs.stepUpValue, CURRENCY_FMT);
    }
  } else {
    const cellH2 = sheet.getCell('H2');
    cellH2.value = 'None (Standard)';
    cellH2.font = { name: FONT_NAME, size: 10, italic: true, color: { argb: 'FF64748B' } };
    cellH2.alignment = { horizontal: 'center', vertical: 'middle' };
    cellH2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } };
    cellH2.border = mediumBorder;
  }

  // Goal & Lifestyle Inputs: I2:N2
  setHeaderLabel('I2', 'Current Mo. Exp');
  const curMoExp = inputs.currentMonthlyExpense || Math.round((inputs.annualExpensesToday || 600000) / 12) || 50000;
  setInputValue('J2', curMoExp, CURRENCY_FMT);

  setHeaderLabel('K2', 'Pre-Ret Inflation');
  const preRetInf = (inputs.preRetirementInflation !== undefined ? inputs.preRetirementInflation : 8) / 100;
  setInputValue('L2', preRetInf, PERCENT_FMT);

  setHeaderLabel('M2', 'Ret. Sustainability');
  const retSustainYears = inputs.retirementSustainabilityYears || inputs.projectionYears || 20;
  const cellN2 = sheet.getCell('N2');
  cellN2.value = `${retSustainYears} Years`;
  cellN2.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF0F172A' } };
  cellN2.alignment = { horizontal: 'center', vertical: 'middle' };
  cellN2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } };
  cellN2.border = mediumBorder;

  // Row 3
  sheet.getRow(3).height = 24;
  setHeaderLabel('A3', 'SIP Period (Years)');
  setInputValue('B3', inputs.sipPeriodYears);
  setHeaderLabel('C3', 'Expected Return');
  setInputValue('D3', inputs.expectedReturn / 100, PERCENT_FMT);

  // E3:F3 - Annual Household Expenses at Retirement (Formula connected to J3)
  setHeaderLabel('E3', 'Annual Exp @ Ret');
  const cellF3 = sheet.getCell('F3');
  cellF3.value = { formula: `J3*12`, result: inputs.annualExpenses };
  cellF3.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF0F172A' } };
  cellF3.alignment = { horizontal: 'right', vertical: 'middle' };
  cellF3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_INPUT_BG } };
  cellF3.border = mediumBorder;
  cellF3.numFmt = CURRENCY_FMT;

  // G3:H3 - Retirement Age (Formula: B4 + B3)
  setHeaderLabel('G3', 'Retirement Age');
  const targetRetAge = inputs.retirementAge || (inputs.currentAge + inputs.sipPeriodYears);
  setCalcValue('H3', `B4+B3`, targetRetAge);

  // I3:J3 - Monthly Expense at Retirement (Formula: J2 * (1 + L2) ^ B3)
  setHeaderLabel('I3', 'Monthly Exp @ Ret');
  const monthlyExpAtRet = Math.round(inputs.annualExpenses / 12);
  const cellJ3 = sheet.getCell('J3');
  cellJ3.value = { formula: `ROUND(J2*(1+L2)^B3, 0)`, result: monthlyExpAtRet };
  cellJ3.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  cellJ3.alignment = { horizontal: 'right', vertical: 'middle' };
  cellJ3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } };
  cellJ3.border = thinBorder;
  cellJ3.numFmt = CURRENCY_FMT;

  // K3:L3 - Required Retirement Corpus
  setHeaderLabel('K3', 'Required Corpus');
  const reqCorpusVal = summary.requiredRetirementCorpus || summary.finalAccumulationCorpus;
  const cellL3 = sheet.getCell('L3');
  cellL3.value = reqCorpusVal;
  cellL3.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF0D9488' } };
  cellL3.alignment = { horizontal: 'right', vertical: 'middle' };
  cellL3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } };
  cellL3.border = thinBorder;
  cellL3.numFmt = CURRENCY_FMT;

  // M3:N3 - Required Monthly SIP
  setHeaderLabel('M3', 'Required SIP');
  const reqSipVal = inputs.requiredMonthlySip || inputs.monthlySip;
  const cellN3 = sheet.getCell('N3');
  cellN3.value = reqSipVal;
  cellN3.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: 'FF0D9488' } };
  cellN3.alignment = { horizontal: 'right', vertical: 'middle' };
  cellN3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CALC_BG } };
  cellN3.border = thinBorder;
  cellN3.numFmt = CURRENCY_FMT;

  // Row 4
  sheet.getRow(4).height = 24;
  setHeaderLabel('A4', 'Current Age');
  setInputValue('B4', inputs.currentAge);
  setHeaderLabel('C4', 'SWP Return');
  setInputValue('D4', inputs.swpReturn / 100, PERCENT_FMT);
  setHeaderLabel('E4', 'Ret. Inflation');
  setInputValue('F4', inputs.inflation / 100, PERCENT_FMT);

  // G4:H4 - Final Projected Corpus
  setHeaderLabel('G4', 'Projected Corpus');
  setCalcValue('H4', `G${lastAccRow}`, summary.finalAccumulationCorpus, CURRENCY_FMT);

  // I4:J4 - Planning Mode
  setHeaderLabel('I4', 'Planning Mode');
  const cellJ4 = sheet.getCell('J4');
  cellJ4.value = inputs.planningMode === 'goal' ? '🎯 Goal-Based' : '📈 SIP-Based';
  cellJ4.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF1E293B' } };
  cellJ4.alignment = { horizontal: 'center', vertical: 'middle' };
  cellJ4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LABEL_BG } };
  cellJ4.border = thinBorder;

  // K4:N4 - Client Advisory Sustainability Status
  sheet.mergeCells('K4:N4');
  const advisoryCell = sheet.getCell('K4');
  advisoryCell.value = `Sustainability: ${summary.sustainabilityText}`;
  advisoryCell.font = { name: FONT_NAME, size: 10, bold: true, color: summary.isExhaustedEver ? { argb: 'FFB91C1C' } : { argb: 'FF15803D' } };
  advisoryCell.alignment = { horizontal: 'center', vertical: 'middle' };
  advisoryCell.fill = { type: 'pattern', pattern: 'solid', fgColor: summary.isExhaustedEver ? { argb: 'FFFEE2E2' } : { argb: 'FFDCFCE7' } };
  advisoryCell.border = thinBorder;

  // ROW 5: SECTION HEADERS
  sheet.getRow(5).height = 28;
  sheet.mergeCells('A5:H5');
  const accHead = sheet.getCell('A5');
  accHead.value = 'ACCUMULATION STAGE';
  accHead.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  accHead.alignment = { horizontal: 'center', vertical: 'middle' };
  accHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } }; // Deep Green
  accHead.border = thinBorder;

  sheet.mergeCells('I5:N5');
  const retHead = sheet.getCell('I5');
  retHead.value = 'RETIREMENT / SWP STAGE';
  retHead.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  retHead.alignment = { horizontal: 'center', vertical: 'middle' };
  retHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } }; // Deep Amber
  retHead.border = thinBorder;

  // ROW 6: TABLE COLUMN HEADERS
  sheet.getRow(6).height = 30;
  const accReturnText = `${inputs.expectedReturn}%`;
  const colHeadersAcc = [
    { col: 'A', text: 'Year' },
    { col: 'B', text: 'Amount @ Start of Year' },
    { col: 'C', text: 'Future Expense' },
    { col: 'D', text: 'Monthly SIP Amt' },
    { col: 'E', text: 'Amt Invested Each Year' },
    { col: 'F', text: `Gain / Yr (${accReturnText})` },
    { col: 'G', text: 'Amt @ Yr End' },
    { col: 'H', text: 'Your Age' },
  ];

  colHeadersAcc.forEach(({ col, text }) => {
    const c = sheet.getCell(`${col}6`);
    c.value = text;
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF000000' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACC_HEADER } };
    c.border = thinBorder;
  });

  const swpReturnText = `${inputs.swpReturn}%`;
  const colHeadersRet = [
    { col: 'I', text: 'Your Age' },
    { col: 'J', text: 'Amount @ Year Beginning' },
    { col: 'K', text: `Gain @ ${swpReturnText} / Annum` },
    { col: 'L', text: 'Inflation' },
    { col: 'M', text: 'Annual Household Expenses' },
    { col: 'N', text: 'Amount @ Year End' },
  ];

  colHeadersRet.forEach(({ col, text }) => {
    const c = sheet.getCell(`${col}6`);
    c.value = text;
    c.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FF000000' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_RET_HEADER } };
    c.border = thinBorder;
  });

  // Populate Table Data Rows (Starting at row 7)
  const maxRows = Math.max(accumulationRows.length, retirementRows.length);

  for (let i = 0; i < maxRows; i++) {
    const rowNum = 7 + i;
    sheet.getRow(rowNum).height = 20;

    // Accumulation Stage (Columns A - H)
    if (i < accumulationRows.length) {
      const acc = accumulationRows[i];

      // A: Year
      const cellA = sheet.getCell(`A${rowNum}`);
      if (i === 0) {
        cellA.value = inputs.startYear;
      } else {
        cellA.value = { formula: `A${rowNum - 1}+1`, result: acc.calendarYear };
      }
      cellA.alignment = { horizontal: 'center', vertical: 'middle' };
      cellA.font = { name: FONT_NAME, size: 10 };
      cellA.border = thinBorder;

      // B: Amount @ Start of Year
      // Year 1: $D$2 (Initial Lumpsum)
      // Year N: G{r-1} (Amt @ Yr End of previous row)
      const cellB = sheet.getCell(`B${rowNum}`);
      if (i === 0) {
        cellB.value = { formula: `$D$2`, result: acc.startAmount };
      } else {
        cellB.value = { formula: `G${rowNum - 1}`, result: acc.startAmount };
      }
      cellB.alignment = { horizontal: 'right', vertical: 'middle' };
      cellB.font = { name: FONT_NAME, size: 10 };
      cellB.numFmt = CURRENCY_FMT;
      cellB.border = thinBorder;

      // C: Future Expense (Deducted from opening corpus)
      const cellC = sheet.getCell(`C${rowNum}`);
      cellC.value = acc.futureExpense || 0;
      cellC.alignment = { horizontal: 'right', vertical: 'middle' };
      cellC.font = { name: FONT_NAME, size: 10 };
      cellC.numFmt = CURRENCY_FMT;
      cellC.border = thinBorder;
      if (acc.hasCorpusError) {
        cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        cellC.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: 'FFDC2626' } };
      }

      // D: Monthly SIP Amt
      const cellD = sheet.getCell(`D${rowNum}`);
      if (acc.isSipActive === false) {
        cellD.value = 0;
      } else if (i === 0) {
        cellD.value = { formula: `$B$2`, result: acc.monthlySip };
      } else {
        if (inputs.stepUpEnabled) {
          if (inputs.stepUpType === 'percent') {
            cellD.value = { formula: `ROUND(D${rowNum - 1}*(1+$H$2), 0)`, result: acc.monthlySip };
          } else {
            cellD.value = { formula: `D${rowNum - 1}+$H$2`, result: acc.monthlySip };
          }
        } else {
          cellD.value = { formula: `$B$2`, result: acc.monthlySip };
        }
      }
      cellD.alignment = { horizontal: 'right', vertical: 'middle' };
      cellD.font = { name: FONT_NAME, size: 10 };
      cellD.numFmt = CURRENCY_FMT;
      cellD.border = thinBorder;

      // E: Amt Invested Each Year (= D{rowNum} * 12)
      const cellE = sheet.getCell(`E${rowNum}`);
      cellE.value = { formula: `D${rowNum}*12`, result: acc.annualSip };
      cellE.alignment = { horizontal: 'right', vertical: 'middle' };
      cellE.font = { name: FONT_NAME, size: 10 };
      cellE.numFmt = CURRENCY_FMT;
      cellE.border = thinBorder;

      // F: Gain / Yr (= ((B{r} - C{r}) * $D$3) + (E{r} * ($D$3 / 2)))
      const cellF = sheet.getCell(`F${rowNum}`);
      cellF.value = { formula: `((B${rowNum}-C${rowNum})*$D$3)+(E${rowNum}*($D$3/2))`, result: acc.gain };
      cellF.alignment = { horizontal: 'right', vertical: 'middle' };
      cellF.font = { name: FONT_NAME, size: 10 };
      cellF.numFmt = CURRENCY_FMT;
      cellF.border = thinBorder;

      // G: Amt @ Yr End (= (B{r} - C{r}) + E{r} + F{r})
      const cellG = sheet.getCell(`G${rowNum}`);
      cellG.value = { formula: `(B${rowNum}-C${rowNum})+E${rowNum}+F${rowNum}`, result: acc.endAmount };
      cellG.alignment = { horizontal: 'right', vertical: 'middle' };
      cellG.font = { name: FONT_NAME, size: 10, bold: true };
      cellG.numFmt = CURRENCY_FMT;
      cellG.border = thinBorder;

      // H: Your Age
      const cellH = sheet.getCell(`H${rowNum}`);
      if (i === 0) {
        cellH.value = { formula: `$B$4`, result: acc.age };
      } else {
        cellH.value = { formula: `H${rowNum - 1}+1`, result: acc.age };
      }
      cellH.alignment = { horizontal: 'center', vertical: 'middle' };
      cellH.font = { name: FONT_NAME, size: 10, bold: true };
      cellH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ACC_AGE } };
      cellH.border = thinBorder;
    } else {
      // Empty accumulation cells for rows beyond accumulation stage
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach(c => {
        const cell = sheet.getCell(`${c}${rowNum}`);
        cell.value = '';
        cell.border = thinBorder;
      });
    }

    // Retirement / SWP Stage (Columns I - N)
    if (i < retirementRows.length) {
      const ret = retirementRows[i];
      const isDepletedOrExhausted = ret.yearStatus === 'depleted' || ret.yearStatus === 'exhausted';

      // I: Your Age
      const cellI = sheet.getCell(`I${rowNum}`);
      if (i === 0) {
        // Points to age after last accumulation row
        cellI.value = { formula: `H${lastAccRow}+1`, result: ret.age };
      } else {
        cellI.value = { formula: `I${rowNum - 1}+1`, result: ret.age };
      }
      cellI.alignment = { horizontal: 'center', vertical: 'middle' };
      cellI.font = { name: FONT_NAME, size: 10, bold: true };
      cellI.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_RET_AGE } };
      cellI.border = thinBorder;

      // J: Amount @ Year Beginning
      // Year 1: G{lastAccRow}
      // Year N: N{r-1}
      const cellJ = sheet.getCell(`J${rowNum}`);
      if (i === 0) {
        cellJ.value = { formula: `G${lastAccRow}`, result: ret.beginningCorpus };
      } else {
        cellJ.value = { formula: `N${rowNum - 1}`, result: ret.beginningCorpus };
      }
      cellJ.alignment = { horizontal: 'right', vertical: 'middle' };
      cellJ.font = { name: FONT_NAME, size: 10 };
      cellJ.numFmt = CURRENCY_FMT;
      cellJ.border = thinBorder;

      // K: Gain @ SWP Return (reflecting true 12-month SWP compounding)
      // Uses Excel's FV function with payment at start of period (type=1) to simulate 12 months exactly:
      // FV(rate, nper, pmt, [pv], [type]): FV($D$4/12, 12, M{r}/12, -J{r}, 1) = Month 12 closing corpus
      // Gain = Closing Corpus - Opening Corpus + Total Withdrawal
      const cellK = sheet.getCell(`K${rowNum}`);
      if (isDepletedOrExhausted) {
        cellK.value = ret.gain;
      } else {
        cellK.value = {
          formula: `IF(J${rowNum}<=0, 0, MAX(0, FV($D$4/12, 12, M${rowNum}/12, -J${rowNum}, 1) - J${rowNum} + M${rowNum}))`,
          result: ret.gain,
        };
      }
      cellK.alignment = { horizontal: 'right', vertical: 'middle' };
      cellK.font = { name: FONT_NAME, size: 10 };
      cellK.numFmt = CURRENCY_FMT;
      cellK.border = thinBorder;

      // L: Inflation
      // $F$4
      const cellL = sheet.getCell(`L${rowNum}`);
      cellL.value = { formula: `$F$4`, result: inputs.inflation / 100 };
      cellL.alignment = { horizontal: 'center', vertical: 'middle' };
      cellL.font = { name: FONT_NAME, size: 10 };
      cellL.numFmt = PERCENT_FMT;
      cellL.border = thinBorder;

      // M: Annual Household Expenses
      // Year 1: $F$3
      // Year N: M{r-1}*(1+L{r})
      const cellM = sheet.getCell(`M${rowNum}`);
      if (i === 0) {
        cellM.value = { formula: `$F$3`, result: ret.householdExpense };
      } else {
        cellM.value = { formula: `IF(J${rowNum}<=0, 0, M${rowNum - 1}*(1+L${rowNum}))`, result: ret.householdExpense };
      }
      cellM.alignment = { horizontal: 'right', vertical: 'middle' };
      cellM.font = { name: FONT_NAME, size: 10 };
      cellM.numFmt = CURRENCY_FMT;
      cellM.border = thinBorder;

      // N: Amount @ Year End
      // IF(J{r}<=0, 0, MAX(0, J${rowNum}+K${rowNum}-M${rowNum}))
      const cellN = sheet.getCell(`N${rowNum}`);
      cellN.value = { formula: `IF(J${rowNum}<=0, 0, MAX(0, J${rowNum}+K${rowNum}-M${rowNum}))`, result: ret.endCorpus };
      cellN.alignment = { horizontal: 'right', vertical: 'middle' };
      cellN.font = { name: FONT_NAME, size: 10, bold: true };
      cellN.numFmt = CURRENCY_FMT;
      cellN.border = thinBorder;

      if (isDepletedOrExhausted) {
        cellN.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_EXHAUSTED_BG } };
        cellN.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLOR_EXHAUSTED_TEXT } };
      }
    }
  }

  // Summary footer note
  const footerRow = 7 + maxRows + 1;
  sheet.mergeCells(`A${footerRow}:N${footerRow}`);
  const footerCell = sheet.getCell(`A${footerRow}`);
  footerCell.value = 'Disclaimer: This calculator is an illustration based on the assumptions entered. Actual investment returns, inflation, and expenses may vary. This calculation does not guarantee future returns.';
  footerCell.font = { name: FONT_NAME, size: 9, italic: true, color: { argb: 'FF64748B' } };
  footerCell.alignment = { horizontal: 'left', vertical: 'middle' };

  return workbook;
}

/**
 * Browser download helper
 */
export async function downloadExcelFile(planData, filename = 'Financial_Plan_SIP_SWP.xlsx') {
  const workbook = await generateExcelWorkbook(planData);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
