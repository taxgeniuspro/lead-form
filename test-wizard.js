const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('=== Debugging Step 1 Validation ===\n');

  await page.goto('https://leads.taxgeniuspro.tax/?ref=gw', { waitUntil: 'networkidle2' });

  // Click "Just file my taxes" toggle
  await page.click('#fileBtn');
  await new Promise(r => setTimeout(r, 500));

  // Fill in all required fields
  await page.type('#firstName', 'Test');
  await page.type('#lastName', 'User');
  await page.type('#phone', '5551234567');
  await page.type('#zipCode', '30301');
  await page.click('#consent');

  // Check each required field value
  const debug = await page.evaluate(() => {
    const stepEl = document.getElementById('step1');
    const inputs = stepEl.querySelectorAll('input[required], select[required]');
    const results = [];

    inputs.forEach(input => {
      results.push({
        id: input.id,
        name: input.name,
        type: input.type,
        value: input.value,
        checked: input.checked,
        valueTrimmed: input.value.trim(),
        wouldPass: input.type === 'checkbox' ? input.checked : !!input.value.trim()
      });
    });

    return results;
  });

  console.log('Required fields in Step 1:');
  debug.forEach(f => {
    const status = f.wouldPass ? '✓' : '✗';
    console.log('  ' + status + ' ' + f.id + ' (type=' + f.type + '): value="' + f.value + '", checked=' + f.checked);
  });

  // Check what the current validation function thinks
  const validationResult = await page.evaluate(() => {
    const stepEl = document.getElementById('step1');
    const inputs = stepEl.querySelectorAll('input[required], select[required]');
    let valid = true;
    const failures = [];

    inputs.forEach(input => {
      if (input.type === 'radio') {
        const checked = stepEl.querySelector('input[name="' + input.name + '"]:checked');
        if (!checked) { valid = false; failures.push(input.name + ' (radio not checked)'); }
      } else if (!input.value.trim()) {
        valid = false;
        failures.push(input.id + ' (value empty after trim)');
      }
    });

    return { valid, failures };
  });

  console.log('\nCurrent validation result: ' + (validationResult.valid ? 'PASS' : 'FAIL'));
  if (validationResult.failures.length > 0) {
    console.log('Failures: ' + validationResult.failures.join(', '));
  }

  // The REAL issue: checkbox value vs checked
  const checkboxDebug = await page.evaluate(() => {
    const cb = document.getElementById('consent');
    return {
      value: cb.value,
      valueTrimmed: cb.value.trim(),
      checked: cb.checked,
      wouldFailCurrentValidation: !cb.value.trim() // This is what current code checks
    };
  });

  console.log('\n=== CHECKBOX BUG ===');
  console.log('consent.value = "' + checkboxDebug.value + '"');
  console.log('consent.value.trim() = "' + checkboxDebug.valueTrimmed + '"');
  console.log('consent.checked = ' + checkboxDebug.checked);
  console.log('Current validation (!value.trim()) would fail: ' + checkboxDebug.wouldFailCurrentValidation);

  await browser.close();
})();
