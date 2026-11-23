import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  BarController,
  BarElement
} from 'chart.js';
import { formatCompactINR, formatINR } from './utils/formatters.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarController,
  BarElement
);

let corpusChartInstance = null;
let cashflowChartInstance = null;

export function renderCharts(planData) {
  const { inputs, summary, accumulationRows, retirementRows } = planData;
  const isSipMode = inputs && inputs.planningMode === 'sip';

  // Build combined timeline for Corpus Trajectory with visible dips at future expense withdrawal points
  const labels = [];
  const corpusValues = [];
  const investedValues = [];
  const pointColors = [];
  const pointRadii = [];
  const pointCustomMeta = [];

  let cumInvested = inputs.lumpsum;

  // Accumulation points
  accumulationRows.forEach((row, idx) => {
    cumInvested += row.annualSip;
    const yearLabelShort = isSipMode ? `Yr ${row.yearNumber}` : `Age ${row.age}`;
    const yearPeriodLabel = row.yearLabel || row.calendarYear;

    // If a future expense was deducted in this year, insert the immediate withdrawal dip point
    if (row.futureExpense > 0) {
      labels.push(`${yearLabelShort} (-${formatCompactINR(row.futureExpense)})`);
      corpusValues.push(row.netStartAmount);
      // Principal invested before this year's SIP
      investedValues.push(Math.max(0, cumInvested - row.annualSip));
      pointColors.push('#891228'); // Red/Burgundy marker for expense withdrawal
      pointRadii.push(5.5);
      pointCustomMeta.push({
        isExpenseDip: true,
        yearLabel: yearLabelShort,
        periodLabel: yearPeriodLabel,
        expenseAmount: row.futureExpense,
        phase: 'SIP Accumulation Phase',
      });
    }

    // End-of-year point after compounding & SIP additions
    const label = isSipMode ? `Yr ${row.yearNumber} (${yearPeriodLabel})` : `Age ${row.age} (Y${row.yearNumber})`;
    labels.push(label);
    corpusValues.push(row.endAmount);
    investedValues.push(cumInvested);
    pointColors.push(idx === accumulationRows.length - 1 ? '#CD9B30' : '#061C41');
    pointRadii.push(idx === accumulationRows.length - 1 ? 6 : 2.5);
    pointCustomMeta.push(null);
  });

  // Retirement points (Rendered in both modes when SWP rows exist)
  if (retirementRows && retirementRows.length > 0) {
    retirementRows.forEach((row, idx) => {
      // If a future expense was deducted in this retirement year, insert the withdrawal dip point
      if (row.futureExpense > 0) {
        labels.push(`Age ${row.age} (-${formatCompactINR(row.futureExpense)})`);
        corpusValues.push(row.startingCorpusAfterFutureExpense);
        investedValues.push(cumInvested);
        pointColors.push('#891228'); // Red/Burgundy marker for expense withdrawal
        pointRadii.push(5.5);
        pointCustomMeta.push({
          isExpenseDip: true,
          yearLabel: `Age ${row.age} (SWP Yr ${row.yearNumber})`,
          periodLabel: row.yearLabel || `${row.calendarYear}`,
          expenseAmount: row.futureExpense,
          phase: 'Retirement Phase (SWP)',
        });
      }

      // End-of-year retirement point
      labels.push(`Age ${row.age} (R${row.yearNumber})`);
      corpusValues.push(row.endCorpus);
      investedValues.push(cumInvested); // invested stays constant in retirement

      if (row.yearStatus === 'depleted') {
        pointColors.push('#891228');
        pointRadii.push(6);
      } else if (idx === 0) {
        pointColors.push('#CD9B30');
        pointRadii.push(5);
      } else {
        pointColors.push('#061C41');
        pointRadii.push(1.5);
      }
      pointCustomMeta.push(null);
    });
  }

  // 1. Corpus Progression Chart
  const corpusCanvas = document.getElementById('corpusChart');
  if (corpusCanvas) {
    if (corpusChartInstance) {
      corpusChartInstance.destroy();
    }

    const ctx = corpusCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(6, 28, 65, 0.16)');
    gradient.addColorStop(0.7, 'rgba(205, 155, 48, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    corpusChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Projected Corpus',
            data: corpusValues,
            borderColor: '#061C41',
            backgroundColor: gradient,
            borderWidth: 2.8,
            fill: true,
            tension: 0.18,
            pointBackgroundColor: pointColors,
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 1.5,
            pointRadius: pointRadii,
            pointHoverRadius: 7,
          },
          {
            label: 'Total Principal Invested',
            data: investedValues,
            borderColor: '#CD9B30',
            borderWidth: 2,
            borderDash: [5, 4],
            fill: false,
            tension: 0,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#061C41',
              font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: '#061C41',
            titleColor: '#FFFFFF',
            bodyColor: '#F8FAFC',
            borderColor: '#CD9B30',
            borderWidth: 1,
            padding: 12,
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 12 },
            callbacks: {
              title: (tooltipItems) => {
                const item = tooltipItems[0];
                const idx = item.dataIndex;
                const meta = pointCustomMeta[idx];
                if (meta && meta.isExpenseDip) {
                  return `🔻 Future Goal Expense Withdrawal (${meta.yearLabel})`;
                }
                return item.label;
              },
              label: (context) => {
                const idx = context.dataIndex;
                const meta = pointCustomMeta[idx];
                const label = context.dataset.label || '';
                const val = context.raw || 0;
                if (context.datasetIndex === 0 && meta && meta.isExpenseDip) {
                  return [
                    `Goal Expense Deducted: -${formatINR(meta.expenseAmount)}`,
                    `Corpus After Deduction: ${formatINR(val)} (${formatCompactINR(val)})`,
                    `Phase: ${meta.phase}`,
                  ];
                }
                return `${label}: ${formatINR(val)} (${formatCompactINR(val)})`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(6, 28, 65, 0.05)' },
            ticks: {
              color: '#64748B',
              maxTicksLimit: 14,
              font: { family: "'Inter', sans-serif", size: 11 },
            },
          },
          y: {
            grid: { color: 'rgba(6, 28, 65, 0.06)' },
            ticks: {
              color: '#64748B',
              callback: (val) => formatCompactINR(val),
              font: { family: "'Inter', sans-serif", size: 11 },
            },
          },
        },
      },
    });
  }

  // 2. Annual Cash Flows & Inflation-Adjusted Expenses Chart
  const cashflowCanvas = document.getElementById('cashflowChart');
  if (cashflowCanvas) {
    if (cashflowChartInstance) {
      cashflowChartInstance.destroy();
    }

    let chart2Labels = [];
    let chart2Datasets = [];

    if (isSipMode) {
      chart2Labels = accumulationRows.map(r => `Yr ${r.yearNumber} (${r.yearLabel || r.calendarYear})`);
      chart2Datasets = [
        {
          type: 'bar',
          label: 'Annual SIP Investment',
          data: accumulationRows.map(r => r.annualSip),
          backgroundColor: 'rgba(6, 28, 65, 0.85)',
          borderColor: '#061C41',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          type: 'line',
          label: `Annual Compounded Gain (@ ${inputs.expectedReturn}%)`,
          data: accumulationRows.map(r => r.gain),
          borderColor: '#CD9B30',
          backgroundColor: 'rgba(205, 155, 48, 0.15)',
          borderWidth: 2.4,
          tension: 0.25,
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: '#CD9B30',
        },
      ];

      const hasAnyFutureExp = accumulationRows.some(r => r.futureExpense > 0);
      if (hasAnyFutureExp) {
        chart2Datasets.push({
          type: 'bar',
          label: 'Future Goal Expenses',
          data: accumulationRows.map(r => r.futureExpense || 0),
          backgroundColor: 'rgba(137, 18, 40, 0.85)',
          borderColor: '#891228',
          borderWidth: 1,
          borderRadius: 4,
        });
      }
    } else {
      chart2Labels = retirementRows.slice(0, 35).map(r => `Age ${r.age} (Y${r.yearNumber})`);
      const retExpenses = retirementRows.slice(0, 35).map(r => r.householdExpense);
      const retGains = retirementRows.slice(0, 35).map(r => r.gain);

      chart2Datasets = [
        {
          type: 'bar',
          label: 'Annual Household Expenses (Inflated)',
          data: retExpenses,
          backgroundColor: 'rgba(137, 18, 40, 0.85)',
          borderColor: '#891228',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          type: 'line',
          label: `Annual Portfolio Gain (@ ${inputs.swpReturn}%)`,
          data: retGains,
          borderColor: '#CD9B30',
          backgroundColor: 'rgba(205, 155, 48, 0.1)',
          borderWidth: 2.2,
          tension: 0.25,
          fill: false,
          pointRadius: 2.5,
        },
      ];

      const hasAnyRetFutureExp = retirementRows.some(r => r.futureExpense > 0);
      if (hasAnyRetFutureExp) {
        chart2Datasets.push({
          type: 'bar',
          label: 'Future Goal Expenses',
          data: retirementRows.slice(0, 35).map(r => r.futureExpense || 0),
          backgroundColor: 'rgba(180, 83, 9, 0.85)',
          borderColor: '#B45309',
          borderWidth: 1,
          borderRadius: 4,
        });
      }
    }

    const ctx2 = cashflowCanvas.getContext('2d');
    cashflowChartInstance = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: chart2Labels,
        datasets: chart2Datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#061C41',
              font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
              usePointStyle: true,
            },
          },
          tooltip: {
            backgroundColor: '#061C41',
            titleColor: '#FFFFFF',
            bodyColor: '#F8FAFC',
            borderColor: '#CD9B30',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const val = context.raw || 0;
                return `${label}: ${formatINR(val)} (${formatCompactINR(val)})`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(6, 28, 65, 0.05)' },
            ticks: {
              color: '#64748B',
              maxTicksLimit: 12,
              font: { family: "'Inter', sans-serif", size: 10 },
            },
          },
          y: {
            grid: { color: 'rgba(6, 28, 65, 0.06)' },
            ticks: {
              color: '#64748B',
              callback: (val) => formatCompactINR(val),
              font: { family: "'Inter', sans-serif", size: 11 },
            },
          },
        },
      },
    });
  }
}

/**
 * Generates high-resolution base64 PNG images of the two charts for the PDF Financial Projection report.
 * Renders on offscreen canvases with explicit solid white backgrounds and high-DPI scaling.
 * Falls back gracefully to active on-screen canvases if available.
 * 
 * @param {Object} planData Output from calculateFinancialPlan
 * @returns {Promise<{ corpusImg: string|null, cashflowImg: string|null }>}
 */
export async function generateChartImagesForReport(planData) {
  if (typeof document === 'undefined') {
    return { corpusImg: null, cashflowImg: null };
  }

  if (!planData) {
    return { corpusImg: null, cashflowImg: null };
  }

  const { inputs, accumulationRows, retirementRows } = planData;
  const isSipMode = inputs && inputs.planningMode === 'sip';

  let corpusImg = null;
  let cashflowImg = null;

  const whiteBgPlugin = {
    id: 'reportWhiteBg',
    beforeDraw: (chart) => {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    },
  };

  // Method 1: Offscreen Canvas rendering with crisp DPI and solid white background
  try {
    const width = 760;
    const height = 500;

    // --- Chart 1: Corpus Progression Trajectory ---
    if (accumulationRows && accumulationRows.length > 0) {
      const labels1 = [];
      const corpusValues = [];
      const investedValues = [];
      const pointColors = [];
      const pointRadii = [];

      let cumInvested = (inputs && inputs.lumpsum) || 0;
      accumulationRows.forEach((row, idx) => {
        cumInvested += row.annualSip;
        const yearLabelShort = isSipMode ? `Yr ${row.yearNumber}` : `Age ${row.age}`;
        const yearPeriodLabel = row.yearLabel || row.calendarYear;

        // If a future expense was deducted in this year, insert the immediate withdrawal dip point
        if (row.futureExpense > 0) {
          labels1.push(`${yearLabelShort} (-${formatCompactINR(row.futureExpense)})`);
          corpusValues.push(row.netStartAmount);
          investedValues.push(Math.max(0, cumInvested - row.annualSip));
          pointColors.push('#891228'); // Red marker for goal withdrawal
          pointRadii.push(5.5);
        }

        const label = isSipMode
          ? `Yr ${row.yearNumber} (${yearPeriodLabel})`
          : `Age ${row.age} (Y${row.yearNumber})`;
        labels1.push(label);
        corpusValues.push(row.endAmount);
        investedValues.push(cumInvested);
        pointColors.push(idx === accumulationRows.length - 1 ? '#CD9B30' : '#061C41');
        pointRadii.push(idx === accumulationRows.length - 1 ? 6 : 2.5);
      });

      if (retirementRows && retirementRows.length > 0) {
        retirementRows.forEach((row, idx) => {
          // If a future expense was deducted in this retirement year, insert the withdrawal dip point
          if (row.futureExpense > 0) {
            labels1.push(`Age ${row.age} (-${formatCompactINR(row.futureExpense)})`);
            corpusValues.push(row.startingCorpusAfterFutureExpense);
            investedValues.push(cumInvested);
            pointColors.push('#891228');
            pointRadii.push(5.5);
          }

          labels1.push(`Age ${row.age} (R${row.yearNumber})`);
          corpusValues.push(row.endCorpus);
          investedValues.push(cumInvested);

          if (row.yearStatus === 'depleted') {
            pointColors.push('#891228');
            pointRadii.push(6);
          } else if (idx === 0) {
            pointColors.push('#CD9B30');
            pointRadii.push(5);
          } else {
            pointColors.push('#061C41');
            pointRadii.push(1.5);
          }
        });
      }

      const c1 = document.createElement('canvas');
      c1.width = width;
      c1.height = height;
      const ctx1 = c1.getContext('2d');

      const grad1 = ctx1.createLinearGradient(0, 0, 0, height);
      grad1.addColorStop(0, 'rgba(6, 28, 65, 0.16)');
      grad1.addColorStop(0.7, 'rgba(205, 155, 48, 0.08)');
      grad1.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

      const offChart1 = new Chart(ctx1, {
        type: 'line',
        data: {
          labels: labels1,
          datasets: [
            {
              label: 'Projected Corpus',
              data: corpusValues,
              borderColor: '#061C41',
              backgroundColor: grad1,
              borderWidth: 2.8,
              fill: true,
              tension: 0.18,
              pointBackgroundColor: pointColors,
              pointBorderColor: '#FFFFFF',
              pointBorderWidth: 1.5,
              pointRadius: pointRadii,
            },
            {
              label: 'Total Principal Invested',
              data: investedValues,
              borderColor: '#CD9B30',
              borderWidth: 2,
              borderDash: [5, 4],
              fill: false,
              tension: 0,
              pointRadius: 0,
            },
          ],
        },
        plugins: [whiteBgPlugin],
        options: {
          responsive: false,
          animation: false,
          maintainAspectRatio: false,
          layout: {
            padding: { left: 4, right: 6, top: 2, bottom: 2 }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#061C41',
                font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 8,
              },
            },
            tooltip: { enabled: false },
          },
          scales: {
            x: {
              grid: { color: 'rgba(6, 28, 65, 0.06)' },
              ticks: {
                color: '#64748B',
                maxTicksLimit: 12,
                font: { family: "'Inter', sans-serif", size: 11 },
              },
            },
            y: {
              grid: { color: 'rgba(6, 28, 65, 0.06)' },
              ticks: {
                color: '#64748B',
                callback: (val) => formatCompactINR(val),
                font: { family: "'Inter', sans-serif", size: 11 },
              },
            },
          },
        },
      });

      corpusImg = offChart1.toBase64Image('image/png', 1);
      offChart1.destroy();
    }

    // --- Chart 2: Inflation-Adjusted Household Expenses ---
    let chart2Labels = [];
    let chart2Datasets = [];

    if (retirementRows && retirementRows.length > 0) {
      chart2Labels = retirementRows.slice(0, 35).map((r) => `Age ${r.age} (Y${r.yearNumber})`);
      const retExpenses = retirementRows.slice(0, 35).map((r) => r.householdExpense);
      const retGains = retirementRows.slice(0, 35).map((r) => r.gain);

      chart2Datasets = [
        {
          type: 'bar',
          label: 'Annual Household Expenses (Inflated)',
          data: retExpenses,
          backgroundColor: 'rgba(137, 18, 40, 0.85)',
          borderColor: '#891228',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          type: 'line',
          label: `Annual Portfolio Gain (@ ${(inputs && inputs.swpReturn) || 9}%)`,
          data: retGains,
          borderColor: '#CD9B30',
          backgroundColor: 'rgba(205, 155, 48, 0.1)',
          borderWidth: 2.2,
          tension: 0.25,
          fill: false,
          pointRadius: 2.5,
        },
      ];

      const hasAnyRetFutureExp = retirementRows.some(r => r.futureExpense > 0);
      if (hasAnyRetFutureExp) {
        chart2Datasets.push({
          type: 'bar',
          label: 'Future Goal Expenses',
          data: retirementRows.slice(0, 35).map(r => r.futureExpense || 0),
          backgroundColor: 'rgba(180, 83, 9, 0.85)',
          borderColor: '#B45309',
          borderWidth: 1,
          borderRadius: 4,
        });
      }
    } else if (accumulationRows && accumulationRows.length > 0) {
      chart2Labels = accumulationRows.map((r) => `Yr ${r.yearNumber} (${r.yearLabel || r.calendarYear})`);
      chart2Datasets = [
        {
          type: 'bar',
          label: 'Annual SIP Investment',
          data: accumulationRows.map((r) => r.annualSip),
          backgroundColor: 'rgba(6, 28, 65, 0.85)',
          borderColor: '#061C41',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          type: 'line',
          label: `Annual Compounded Gain (@ ${(inputs && inputs.expectedReturn) || 12}%)`,
          data: accumulationRows.map((r) => r.gain),
          borderColor: '#CD9B30',
          backgroundColor: 'rgba(205, 155, 48, 0.15)',
          borderWidth: 2.4,
          tension: 0.25,
          fill: false,
          pointRadius: 3,
          pointBackgroundColor: '#CD9B30',
        },
      ];

      const hasAnyFutureExp = accumulationRows.some(r => r.futureExpense > 0);
      if (hasAnyFutureExp) {
        chart2Datasets.push({
          type: 'bar',
          label: 'Future Goal Expenses',
          data: accumulationRows.map(r => r.futureExpense || 0),
          backgroundColor: 'rgba(137, 18, 40, 0.85)',
          borderColor: '#891228',
          borderWidth: 1,
          borderRadius: 4,
        });
      }
    }

    if (chart2Labels.length > 0) {
      const c2 = document.createElement('canvas');
      c2.width = width;
      c2.height = height;
      const ctx2 = c2.getContext('2d');

      const offChart2 = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: chart2Labels,
          datasets: chart2Datasets,
        },
        plugins: [whiteBgPlugin],
        options: {
          responsive: false,
          animation: false,
          maintainAspectRatio: false,
          layout: {
            padding: { left: 4, right: 6, top: 2, bottom: 2 }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#061C41',
                font: { family: "'Inter', sans-serif", size: 12, weight: 600 },
                usePointStyle: true,
                padding: 8,
              },
            },
            tooltip: { enabled: false },
          },
          scales: {
            x: {
              grid: { color: 'rgba(6, 28, 65, 0.05)' },
              ticks: {
                color: '#64748B',
                maxTicksLimit: 12,
                font: { family: "'Inter', sans-serif", size: 11 },
              },
            },
            y: {
              grid: { color: 'rgba(6, 28, 65, 0.06)' },
              ticks: {
                color: '#64748B',
                callback: (val) => formatCompactINR(val),
                font: { family: "'Inter', sans-serif", size: 11 },
              },
            },
          },
        },
      });

      cashflowImg = offChart2.toBase64Image('image/png', 1);
      offChart2.destroy();
    }
  } catch (err) {
    console.warn('Offscreen chart generation notice:', err);
  }

  // Method 2 Fallback: if offscreen canvas failed, extract from live DOM canvas
  if (!corpusImg && corpusChartInstance) {
    try {
      corpusImg = corpusChartInstance.toBase64Image('image/png', 1);
    } catch (e) {}
  }
  if (!cashflowImg && cashflowChartInstance) {
    try {
      cashflowImg = cashflowChartInstance.toBase64Image('image/png', 1);
    } catch (e) {}
  }

  return { corpusImg, cashflowImg };
}
