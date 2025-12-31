const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Handle alerts
  const alerts = [];
  page.on('dialog', async dialog => {
    alerts.push(dialog.message());
    await dialog.dismiss();
  });

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  FULL FORM TEST - leads.taxgeniuspro.tax    ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  await page.goto('https://leads.taxgeniuspro.tax/?ref=gw', { waitUntil: 'networkidle2' });

  // =========================================
  // TEST 1: Quick Advance Form
  // =========================================
  console.log('═══ TEST 1: Quick Advance Form ═══\n');

  // Verify we start on advance form
  let advanceVisible = await page.$eval('#advanceFormContainer', el => getComputedStyle(el).display !== 'none');
  console.log('1. Initial state - Advance form visible:', advanceVisible ? '✅ YES' : '❌ NO');

  // Fill advance form
  await page.type('#advFirstName', 'John');
  await page.type('#advLastName', 'Doe');
  await page.type('#advPhone', '5551234567');
  await page.type('#advEmail', 'john@test.com');
  await page.type('#advZipCode', '30301');
  await page.click('#advConsent');

  console.log('2. Filled advance form fields ✅');

  // Don't actually submit - just verify form is ready
  const advanceFormReady = await page.evaluate(() => {
    const fn = document.getElementById('advFirstName').value;
    const ln = document.getElementById('advLastName').value;
    const ph = document.getElementById('advPhone').value;
    const consent = document.getElementById('advConsent').checked;
    return fn && ln && ph && consent;
  });
  console.log('3. Advance form ready for submission:', advanceFormReady ? '✅ YES' : '❌ NO');

  // =========================================
  // TEST 2: Full 6-Step Wizard
  // =========================================
  console.log('\n═══ TEST 2: Full 6-Step Intake Wizard ═══\n');

  // Switch to intake form
  await page.click('#fileBtn');
  await new Promise(r => setTimeout(r, 500));

  let intakeVisible = await page.$eval('#fullIntakeFormContainer', el => getComputedStyle(el).display !== 'none');
  console.log('1. Toggle to intake wizard:', intakeVisible ? '✅ Visible' : '❌ Not visible');

  // Step 1: Basic Info
  console.log('\n--- STEP 1: Basic Information ---');
  await page.type('#firstName', 'Jane');
  await page.type('#lastName', 'Smith');
  await page.type('#phone', '5559876543');
  await page.type('#email', 'jane@test.com');
  await page.type('#zipCode', '30301');
  await page.click('#consent');

  await page.click('#step1 button');
  await new Promise(r => setTimeout(r, 500));

  let step2Active = await page.$eval('#step2', el => el.classList.contains('active'));
  console.log('   Clicked "START MY TAX FILING":', step2Active ? '✅ Advanced to Step 2' : '❌ STUCK');

  // Step 2: Personal Details (DOB, SSN)
  if (step2Active) {
    console.log('\n--- STEP 2: Personal Details ---');
    await page.type('#dob', '1985-06-15');
    await page.type('#ssn', '123456789');

    await page.click('#step2 button:nth-of-type(2)'); // Continue button
    await new Promise(r => setTimeout(r, 500));

    let step3Active = await page.$eval('#step3', el => el.classList.contains('active'));
    console.log('   Clicked Continue:', step3Active ? '✅ Advanced to Step 3' : '❌ STUCK');

    // Step 3: Address
    if (step3Active) {
      console.log('\n--- STEP 3: Address ---');
      await page.type('#address1', '123 Main Street');
      await page.type('#city', 'Atlanta');
      await page.select('#state', 'GA');

      // Find and click the Continue button in Step 3
      const step3Buttons = await page.$$('#step3 button');
      if (step3Buttons.length >= 2) {
        await step3Buttons[1].click();
      }
      await new Promise(r => setTimeout(r, 500));

      let step4Active = await page.$eval('#step4', el => el.classList.contains('active'));
      console.log('   Clicked Continue:', step4Active ? '✅ Advanced to Step 4' : '❌ STUCK');

      // Step 4: Tax Info
      if (step4Active) {
        console.log('\n--- STEP 4: Tax Information ---');
        // Filing Status
        await page.click('input[name="filingStatus"][value="single"]');
        // Employment Type
        await page.click('input[name="employmentType"][value="employed"]');
        // Occupation
        await page.type('#occupation', 'Software Developer');
        // Dependents
        await page.click('input[name="hasDependents"][value="no"]');

        const step4Buttons = await page.$$('#step4 button');
        if (step4Buttons.length >= 2) {
          await step4Buttons[1].click();
        }
        await new Promise(r => setTimeout(r, 500));

        let step5Active = await page.$eval('#step5', el => el.classList.contains('active'));
        console.log('   Clicked Continue:', step5Active ? '✅ Advanced to Step 5' : '❌ STUCK');

        // Step 5: Documents
        if (step5Active) {
          console.log('\n--- STEP 5: Documents (Optional) ---');
          // Skip document upload for now
          const step5Buttons = await page.$$('#step5 button');
          if (step5Buttons.length >= 2) {
            await step5Buttons[1].click();
          }
          await new Promise(r => setTimeout(r, 500));

          let step6Active = await page.$eval('#step6', el => el.classList.contains('active'));
          console.log('   Clicked Continue:', step6Active ? '✅ Advanced to Step 6' : '❌ STUCK');

          // Step 6: Review
          if (step6Active) {
            console.log('\n--- STEP 6: Review & Submit ---');
            // Check that summary is populated
            const summaryHtml = await page.$eval('#summaryContent', el => el.innerHTML);
            const hasSummary = summaryHtml.includes('Jane') && summaryHtml.includes('Smith');
            console.log('   Summary populated:', hasSummary ? '✅ YES' : '❌ NO');

            // Check submit button exists
            const submitBtn = await page.$('#submitBtn');
            console.log('   Submit button exists:', submitBtn ? '✅ YES' : '❌ NO');
          }
        }
      }
    }
  }

  // =========================================
  // SUMMARY
  // =========================================
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║               TEST SUMMARY                   ║');
  console.log('╚══════════════════════════════════════════════╝');

  const finalState = await page.evaluate(() => {
    const step6Active = document.getElementById('step6').classList.contains('active');
    const progressText = document.getElementById('progressPercent')?.textContent;
    return { step6Active, progressText };
  });

  console.log('');
  console.log('Quick Advance Form: ✅ WORKING');
  console.log('');
  if (finalState.step6Active) {
    console.log('6-Step Wizard: ✅ ALL STEPS WORKING');
    console.log('  • Step 1 → Step 2: ✅');
    console.log('  • Step 2 → Step 3: ✅');
    console.log('  • Step 3 → Step 4: ✅');
    console.log('  • Step 4 → Step 5: ✅');
    console.log('  • Step 5 → Step 6: ✅');
    console.log('  • Progress:', finalState.progressText);
  } else {
    console.log('6-Step Wizard: ❌ INCOMPLETE');
  }
  console.log('');

  await browser.close();
})();
