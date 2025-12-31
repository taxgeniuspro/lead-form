const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Capture console
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  console.log('=== Deep Button Debug ===\n');

  await page.goto('https://leads.taxgeniuspro.tax/?ref=gw', { waitUntil: 'networkidle2' });

  // Click "Just file my taxes" toggle
  await page.click('#fileBtn');
  await new Promise(r => setTimeout(r, 500));

  // Check all buttons in the page
  const buttons = await page.evaluate(() => {
    const allButtons = document.querySelectorAll('button');
    return Array.from(allButtons).map((btn, i) => ({
      index: i,
      id: btn.id,
      onclick: btn.getAttribute('onclick'),
      text: btn.textContent.trim().substring(0, 30),
      type: btn.type,
      inStep1: !!btn.closest('#step1'),
      isVisible: getComputedStyle(btn).display !== 'none' && getComputedStyle(btn.closest('.form-step') || btn).display !== 'none'
    }));
  });

  console.log('All buttons on page:');
  buttons.forEach(b => {
    console.log(`  [${b.index}] ${b.text} - onclick: ${b.onclick}, inStep1: ${b.inStep1}, visible: ${b.isVisible}`);
  });

  // Find the step1 button specifically
  const step1Buttons = buttons.filter(b => b.inStep1);
  console.log('\nButtons in Step 1:', step1Buttons.length);

  // Inject debug logging into nextStep
  await page.evaluate(() => {
    const originalNextStep = window.nextStep;
    window.nextStep = function() {
      console.log('>>> nextStep() CALLED!');
      console.log('>>> currentStep:', currentStep);
      console.log('>>> totalSteps:', totalSteps);
      const result = originalNextStep.apply(this, arguments);
      console.log('>>> After nextStep, currentStep:', currentStep);
      return result;
    };

    const originalValidateStep = window.validateStep;
    window.validateStep = function(step) {
      console.log('>>> validateStep(' + step + ') CALLED!');
      const result = originalValidateStep.apply(this, arguments);
      console.log('>>> validateStep returned:', result);
      return result;
    };
  });

  // Fill fields
  await page.type('#firstName', 'Test');
  await page.type('#lastName', 'User');
  await page.type('#phone', '5551234567');
  await page.type('#zipCode', '30301');
  await page.click('#consent');

  console.log('\n=== Clicking button (Puppeteer page.click) ===');

  // Click using Puppeteer
  await page.click('#step1 button');
  await new Promise(r => setTimeout(r, 1000));

  const state1 = await page.evaluate(() => ({
    step2Active: document.getElementById('step2').classList.contains('active')
  }));
  console.log('After Puppeteer click - Step 2 active:', state1.step2Active);

  // Try scrolling to button first then clicking
  console.log('\n=== Scrolling to button and clicking ===');
  await page.evaluate(() => {
    document.querySelector('#step1 button').scrollIntoView({ block: 'center' });
  });
  await new Promise(r => setTimeout(r, 300));
  await page.click('#step1 button');
  await new Promise(r => setTimeout(r, 500));

  const state2 = await page.evaluate(() => ({
    step2Active: document.getElementById('step2').classList.contains('active')
  }));
  console.log('After scroll + click - Step 2 active:', state2.step2Active);

  // Try using evaluate to click with event
  console.log('\n=== Dispatching click event via JavaScript ===');
  await page.evaluate(() => {
    const btn = document.querySelector('#step1 button');
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    btn.dispatchEvent(event);
  });
  await new Promise(r => setTimeout(r, 500));

  const state3 = await page.evaluate(() => ({
    step2Active: document.getElementById('step2').classList.contains('active')
  }));
  console.log('After dispatchEvent - Step 2 active:', state3.step2Active);

  await browser.close();
})();
