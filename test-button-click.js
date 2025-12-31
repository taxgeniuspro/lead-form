const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Collect console messages and errors
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => pageErrors.push(err.message));

  console.log('=== Testing nextStep() Function ===\n');

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

  console.log('1. Filled all fields, consent checked');

  // Get state BEFORE clicking
  const beforeState = await page.evaluate(() => {
    return {
      currentStep: window.currentStep,
      totalSteps: window.totalSteps,
      step1Active: document.getElementById('step1').classList.contains('active'),
      step2Active: document.getElementById('step2').classList.contains('active'),
      nextStepExists: typeof window.nextStep === 'function',
      showStepExists: typeof window.showStep === 'function',
      validateStepExists: typeof window.validateStep === 'function'
    };
  });

  console.log('\n2. BEFORE clicking button:');
  console.log('   currentStep:', beforeState.currentStep);
  console.log('   totalSteps:', beforeState.totalSteps);
  console.log('   step1 active:', beforeState.step1Active);
  console.log('   step2 active:', beforeState.step2Active);
  console.log('   nextStep() exists:', beforeState.nextStepExists);
  console.log('   showStep() exists:', beforeState.showStepExists);
  console.log('   validateStep() exists:', beforeState.validateStepExists);

  // TRY 1: Click the button directly
  console.log('\n3. Clicking "START MY TAX FILING" button...');
  await page.click('#step1 button');
  await new Promise(r => setTimeout(r, 1000));

  // Get state AFTER clicking
  const afterClick = await page.evaluate(() => {
    return {
      currentStep: window.currentStep,
      step1Active: document.getElementById('step1').classList.contains('active'),
      step2Active: document.getElementById('step2').classList.contains('active')
    };
  });

  console.log('\n4. AFTER button click:');
  console.log('   currentStep:', afterClick.currentStep);
  console.log('   step1 active:', afterClick.step1Active);
  console.log('   step2 active:', afterClick.step2Active);

  if (!afterClick.step2Active) {
    // TRY 2: Call nextStep() directly via evaluate
    console.log('\n5. Button click failed - calling nextStep() directly...');

    const directResult = await page.evaluate(() => {
      try {
        // Check validation first
        const validationResult = validateStep(1);

        // Try calling nextStep
        nextStep();

        return {
          validationResult,
          currentStep: window.currentStep,
          step1Active: document.getElementById('step1').classList.contains('active'),
          step2Active: document.getElementById('step2').classList.contains('active'),
          error: null
        };
      } catch (e) {
        return {
          error: e.message,
          stack: e.stack
        };
      }
    });

    console.log('\n6. Direct nextStep() call result:');
    if (directResult.error) {
      console.log('   ERROR:', directResult.error);
      console.log('   STACK:', directResult.stack);
    } else {
      console.log('   validateStep(1):', directResult.validationResult);
      console.log('   currentStep:', directResult.currentStep);
      console.log('   step1 active:', directResult.step1Active);
      console.log('   step2 active:', directResult.step2Active);
    }
  }

  // TRY 3: Manual showStep call
  console.log('\n7. Trying showStep(2) directly...');
  const showStepResult = await page.evaluate(() => {
    try {
      showStep(2);
      return {
        currentStep: window.currentStep,
        step1Active: document.getElementById('step1').classList.contains('active'),
        step2Active: document.getElementById('step2').classList.contains('active'),
        error: null
      };
    } catch (e) {
      return { error: e.message, stack: e.stack };
    }
  });

  console.log('   After showStep(2):');
  if (showStepResult.error) {
    console.log('   ERROR:', showStepResult.error);
  } else {
    console.log('   currentStep:', showStepResult.currentStep);
    console.log('   step1 active:', showStepResult.step1Active);
    console.log('   step2 active:', showStepResult.step2Active);
  }

  // Report errors
  if (pageErrors.length > 0) {
    console.log('\n=== PAGE ERRORS ===');
    pageErrors.forEach(e => console.log('  ', e));
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const finalState = await page.evaluate(() => ({
    step2Active: document.getElementById('step2').classList.contains('active')
  }));

  if (finalState.step2Active) {
    console.log('SUCCESS: Wizard advanced to Step 2');
  } else {
    console.log('FAIL: Wizard still on Step 1');
  }

  await browser.close();
})();
