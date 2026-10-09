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

  // Build combined timeline for Corpus Trajectory
  const labels = [];
  const corpusValues = [];
  const investedValues = [];
  const pointColors = [];
  const pointRadii = [];

  let cumInvested = inputs.lumpsum;

  // Accumulation points
  accumulationRows.forEach((row, idx) => {
    cumInvested += row.annualSip;
    const label = isSipMode ? `Yr ${row.yearNumber} (${row.calendarYear})` : `Age ${row.age} (Y${row.yearNumber})`;
    labels.push(label);
    corpusValues.push(row.endAmount);
    investedValues.push(cumInvested);
    pointColors.push(idx === accumulationRows.length - 1 ? '#CD9B30' : '#061C41');
    pointRadii.push(idx === accumulationRows.length - 1 ? 6 : 2.5);
  });

  // Retirement points (Rendered in both modes when SWP rows exist)
  if (retirementRows && retirementRows.length > 0) {
    retirementRows.forEach((row, idx) => {
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
            tension: 0.25,
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
      chart2Labels = accumulationRows.map(r => `Yr ${r.yearNumber} (${r.calendarYear})`);
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
