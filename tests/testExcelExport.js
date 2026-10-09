import fs from 'fs';
import { calculateFinancialPlan } from '../src/calculator.js';
import { generateExcelWorkbook } from '../src/excelExport.js';

async function testExport() {
  console.log('Testing Excel export generation...');
  const plan = calculateFinancialPlan({
    monthlySip: 35000,
    sipPeriodYears: 20,
    lumpsum: 500000,
    expectedReturn: 12,
    swpReturn: 9,
    inflation: 5,
    annualExpenses: 2400000,
    currentAge: 43,
    projectionYears: 50,
  });

  const workbook = await generateExcelWorkbook(plan);
  const buffer = await workbook.xlsx.writeBuffer();
  fs.writeFileSync('test_output.xlsx', Buffer.from(buffer));
  console.log('✔ Successfully generated test_output.xlsx with size:', buffer.byteLength, 'bytes');
}

testExport().catch(err => {
  console.error('Export test failed:', err);
  process.exit(1);
});
