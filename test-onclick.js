const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Collect console and alerts
  const alerts = [];
  page.on('dialog', async dialog => {
    alerts.push(dialog.message());
    await dialog.dismiss();
  });

  console.log('=== Testing Button Onclick Behavior ===\n');

  await page.goto('https://leads.taxgeniuspro.tax/?ref=gw', { waitUntil: 'networkidle2' });

  // Click "Just file my taxes" toggle
  await page.click('#fileBtn');
  await new Promise(r => setTimeout(r, 500));

  console.log('1. Testing click WITHOUT filling fields:');
  await page.click('#step1 button');
  await new Promise(r => setTimeout(r, 500));

  if (alerts.length > 0) {
    console.log('   Alert shown:', alerts[alerts.length - 1]);
  }

  let state = await page.evaluate(() => ({
    step1Active: document.getElementById('step1').classList.contains('active'),
    step2Active: document.getElementById('step2').classList.contains('active')
  }));
  console.log('   Step 1 active:', state.step1Active);
  console.log('   Step 2 active:', state.step2Active);

  // Now fill the fields
  console.log('\n2. Filling all required fields...');
  await page.type('#firstName', 'Test');
  await page.type('#lastName', 'User');
  await page.type('#phone', '5551234567');
  await page.type('#zipCode', '30301');
  await page.click('#consent');

  // Check values
  const fieldValues = await page.evaluate(() => ({
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    phone: document.getElementById('phone').value,
    zipCode: document.getElementById('zipCode').value,
    consentChecked: document.getElementById('consent').checked
  }));
  console.log('   Field values:', fieldValues);

  console.log('\n3. Clicking button AFTER filling fields...');
  const alertsBefore = alerts.length;
  await page.click('#step1 button');
  await new Promise(r => setTimeout(r, 500));

  if (alerts.length > alertsBefore) {
    console.log('   Alert shown:', alerts[alerts.length - 1]);
  } else {
    console.log('   No alert shown');
  }

  state = await page.evaluate(() => ({
    step1Active: document.getElementById('step1').classList.contains('active'),
    step2Active: document.getElementById('step2').classList.contains('active')
  }));
  console.log('   Step 1 active:', state.step1Active);
  console.log('   Step 2 active:', state.step2Active);

  // Try clicking the button via JavaScript
  console.log('\n4. Triggering click via JavaScript:');
  await page.evaluate(() => {
    const btn = document.querySelector('#step1 button');
    btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  state = await page.evaluate(() => ({
    step1Active: document.getElementById('step1').classList.contains('active'),
    step2Active: document.getElementById('step2').classList.contains('active')
  }));
  console.log('   Step 1 active:', state.step1Active);
  console.log('   Step 2 active:', state.step2Active);

  // Try triggering onclick directly
  console.log('\n5. Triggering onclick attribute directly:');
  await page.evaluate(() => {
    const btn = document.querySelector('#step1 button');
    const onclick = btn.getAttribute('onclick');
    console.log('onclick attribute:', onclick);
    eval(onclick);  // Execute the onclick content
  });
  await new Promise(r => setTimeout(r, 500));

  state = await page.evaluate(() => ({
    step1Active: document.getElementById('step1').classList.contains('active'),
    step2Active: document.getElementById('step2').classList.contains('active')
  }));
  console.log('   Step 1 active:', state.step1Active);
  console.log('   Step 2 active:', state.step2Active);

  // Summary
  console.log('\n=== SUMMARY ===');
  if (state.step2Active) {
    console.log('SUCCESS: Wizard is on Step 2');
  } else {
    console.log('FAIL: Wizard stuck on Step 1');
  }

  await browser.close();
})();
