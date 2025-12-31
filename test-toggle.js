const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  console.log('=== Testing leads.taxgeniuspro.tax ===\n');
  
  await page.goto('https://leads.taxgeniuspro.tax/?ref=gw', { waitUntil: 'networkidle2' });
  
  // Check initial state
  const advanceFormVisible = await page.$eval('#advanceFormContainer', el => getComputedStyle(el).display !== 'none');
  const intakeFormVisible = await page.$eval('#fullIntakeFormContainer', el => getComputedStyle(el).display !== 'none');
  
  console.log('INITIAL STATE:');
  console.log(`  Advance Form visible: ${advanceFormVisible}`);
  console.log(`  Intake Wizard visible: ${intakeFormVisible}`);
  
  // Click "Just file my taxes" toggle
  console.log('\n--- Clicking "Just file my taxes" toggle ---');
  await page.click('#fileBtn');
  await new Promise(r => setTimeout(r, 500));
  
  const advanceAfter = await page.$eval('#advanceFormContainer', el => getComputedStyle(el).display !== 'none');
  const intakeAfter = await page.$eval('#fullIntakeFormContainer', el => getComputedStyle(el).display !== 'none');
  const progressHasShow = await page.$eval('#progressContainer', el => el.classList.contains('show'));
  const step1Active = await page.$eval('#step1', el => el.classList.contains('active'));
  
  console.log('\nAFTER CLICKING "Just file my taxes":');
  console.log(`  Advance Form visible: ${advanceAfter}`);
  console.log(`  Intake Wizard visible: ${intakeAfter}`);
  console.log(`  Progress Bar has .show class: ${progressHasShow}`);
  console.log(`  Step 1 has .active class: ${step1Active}`);
  
  const step1Button = await page.$eval('#step1 button', el => el.textContent.trim());
  console.log(`  Step 1 button text: "${step1Button}"`);
  
  // Click back to "I want an advance"
  console.log('\n--- Clicking "I want an advance" toggle ---');
  await page.click('#advanceBtn');
  await new Promise(r => setTimeout(r, 500));
  
  const advanceFinal = await page.$eval('#advanceFormContainer', el => getComputedStyle(el).display !== 'none');
  const intakeFinal = await page.$eval('#fullIntakeFormContainer', el => getComputedStyle(el).display !== 'none');
  
  console.log('\nAFTER CLICKING "I want an advance":');
  console.log(`  Advance Form visible: ${advanceFinal}`);
  console.log(`  Intake Wizard visible: ${intakeFinal}`);
  
  console.log('\n=== TEST SUMMARY ===');
  if (intakeAfter && progressHasShow && step1Active && advanceFinal && !intakeFinal) {
    console.log('✅ PASS: Both toggles work correctly!');
    console.log('   - "Just file my taxes" → Shows 6-step wizard with progress bar');
    console.log('   - "I want an advance" → Shows quick form');
  } else {
    console.log('❌ FAIL: Toggle not working as expected');
  }
  
  await browser.close();
})();
