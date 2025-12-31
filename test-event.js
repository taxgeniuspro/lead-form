const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  console.log('=== Investigating Why Button Click Fails ===\n');

  await page.goto('https://leads.taxgeniuspro.tax/?ref=gw', { waitUntil: 'networkidle2' });

  // Click "Just file my taxes" toggle
  await page.click('#fileBtn');
  await new Promise(r => setTimeout(r, 500));

  // Check button state
  const buttonInfo = await page.evaluate(() => {
    const btn = document.querySelector('#step1 button');
    const computed = getComputedStyle(btn);
    const rect = btn.getBoundingClientRect();

    // Check if button is visible and clickable
    return {
      onclick: btn.getAttribute('onclick'),
      type: btn.getAttribute('type'),
      disabled: btn.disabled,
      pointerEvents: computed.pointerEvents,
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      textContent: btn.textContent.trim(),
      parentTag: btn.parentElement.tagName,
      ancestorForm: btn.closest('form') ? btn.closest('form').id : 'no form'
    };
  });

  console.log('Button Info:');
  console.log('  onclick:', buttonInfo.onclick);
  console.log('  type:', buttonInfo.type);
  console.log('  disabled:', buttonInfo.disabled);
  console.log('  pointer-events:', buttonInfo.pointerEvents);
  console.log('  display:', buttonInfo.display);
  console.log('  visibility:', buttonInfo.visibility);
  console.log('  opacity:', buttonInfo.opacity);
  console.log('  dimensions:', buttonInfo.width, 'x', buttonInfo.height);
  console.log('  position:', buttonInfo.top, buttonInfo.left);
  console.log('  text:', buttonInfo.textContent);
  console.log('  parent:', buttonInfo.parentTag);
  console.log('  ancestor form:', buttonInfo.ancestorForm);

  // Check if there's a form submit handler that might intercept
  const formInfo = await page.evaluate(() => {
    const step1 = document.getElementById('step1');
    const form = step1.closest('form');
    if (!form) return { hasForm: false };

    return {
      hasForm: true,
      formId: form.id,
      hasOnSubmit: !!form.onsubmit || form.hasAttribute('onsubmit'),
      action: form.action,
      method: form.method
    };
  });

  console.log('\nForm Info:');
  console.log('  has form:', formInfo.hasForm);
  if (formInfo.hasForm) {
    console.log('  form id:', formInfo.formId);
    console.log('  has onsubmit:', formInfo.hasOnSubmit);
    console.log('  action:', formInfo.action);
    console.log('  method:', formInfo.method);
  }

  // Check for overlapping elements
  const overlapping = await page.evaluate(() => {
    const btn = document.querySelector('#step1 button');
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const elementAtPoint = document.elementFromPoint(centerX, centerY);

    return {
      elementAtButtonCenter: elementAtPoint ? {
        tag: elementAtPoint.tagName,
        id: elementAtPoint.id,
        class: elementAtPoint.className,
        isButton: elementAtPoint === btn
      } : null
    };
  });

  console.log('\nElement at button center:');
  console.log('  tag:', overlapping.elementAtButtonCenter?.tag);
  console.log('  id:', overlapping.elementAtButtonCenter?.id);
  console.log('  class:', overlapping.elementAtButtonCenter?.class);
  console.log('  is the button:', overlapping.elementAtButtonCenter?.isButton);

  // Add a test click handler to see if click events reach the button
  console.log('\n=== Adding test event listener ===');
  await page.evaluate(() => {
    const btn = document.querySelector('#step1 button');
    btn.addEventListener('click', function(e) {
      console.log('CLICK EVENT RECEIVED!');
      window.__testClickReceived = true;
    }, true);  // Use capture phase
  });

  // Fill fields and click
  await page.type('#firstName', 'Test');
  await page.type('#lastName', 'User');
  await page.type('#phone', '5551234567');
  await page.type('#zipCode', '30301');
  await page.click('#consent');

  // Try clicking
  console.log('\nClicking button with Puppeteer...');
  await page.click('#step1 button');
  await new Promise(r => setTimeout(r, 500));

  const clickReceived = await page.evaluate(() => window.__testClickReceived);
  console.log('Click event received by button:', clickReceived);

  // Check step state
  const state = await page.evaluate(() => ({
    step1Active: document.getElementById('step1').classList.contains('active'),
    step2Active: document.getElementById('step2').classList.contains('active')
  }));
  console.log('Step 1 active:', state.step1Active);
  console.log('Step 2 active:', state.step2Active);

  await browser.close();
})();
