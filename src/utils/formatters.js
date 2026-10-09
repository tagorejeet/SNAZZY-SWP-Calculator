/**
 * Indian Rupee & Number Formatting Utilities
 */

/**
 * Formats a number according to Indian numbering system (Lakhs and Crores)
 * e.g., 12345678 -> "1,23,45,678"
 */
export function formatIndianNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const isNegative = num < 0;
  const absNum = Math.abs(num);
  
  const fixed = absNum.toFixed(decimals);
  const parts = fixed.split('.');
  let intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';

  // Indian grouping: last 3 digits, then every 2 digits
  let lastThree = intPart.substring(intPart.length - 3);
  let otherNumbers = intPart.substring(0, intPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return (isNegative ? '-' : '') + formattedInt + decPart;
}

/**
 * Formats number as Indian Rupee with currency symbol
 * e.g., 2400000 -> "₹24,00,000"
 */
export function formatINR(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  const prefix = num < 0 ? '-₹' : '₹';
  return prefix + formatIndianNumber(Math.abs(num), decimals);
}

/**
 * Formats compact Rupee amounts for KPI cards
 * e.g. 15000000 -> "₹1.50 Cr", 450000 -> "₹4.50 L"
 */
export function formatCompactINR(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  const isNeg = num < 0;
  const val = Math.abs(num);

  let formatted = '';
  if (val >= 10000000) { // 1 Crore
    formatted = (val / 10000000).toFixed(2) + ' Cr';
  } else if (val >= 100000) { // 1 Lakh
    formatted = (val / 100000).toFixed(2) + ' L';
  } else if (val >= 1000) { // 1 Thousand
    formatted = (val / 1000).toFixed(1) + ' k';
  } else {
    formatted = val.toFixed(0);
  }

  return (isNeg ? '-₹' : '₹') + formatted;
}

/**
 * Formats percentage
 * e.g., 12 -> "12.00%"
 */
export function formatPercent(num, decimals = 2) {
  if (num === null || num === undefined || isNaN(num)) return '0.00%';
  return Number(num).toFixed(decimals) + '%';
}

/**
 * Parses user input removing currency symbols, spaces, commas
 */
export function parseNumberInput(val, fallback = 0) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const clean = String(val).replace(/[^0-9.-]/g, '');
  if (clean === '' || isNaN(Number(clean))) return fallback;
  return Number(clean);
}
