const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Load preparers from JSON
const preparersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/preparers.json'), 'utf8'));

// Generate image for a specific preparer
async function generateShareCard(preparer) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  // Set viewport to 1080x1080 (Instagram size) with 2x for retina
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

  const fullName = `${preparer.firstName} ${preparer.lastName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      width: 1080px;
      height: 1080px;
      background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
      position: relative;
      overflow: hidden;
    }

    /* Logo at top */
    .logo-container {
      text-align: center;
      padding-top: 40px;
    }
    .logo {
      height: 60px;
    }

    /* Main content */
    .content {
      text-align: center;
      padding: 20px 60px;
    }

    /* Tax Season headline */
    .headline {
      color: #ffffff;
      font-size: 42px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }

    .subheadline {
      color: rgba(255,255,255,0.95);
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 24px;
    }

    /* Preparer photo */
    .photo-container {
      margin: 0 auto 20px;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      border: 8px solid #ffffff;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
      background: #ffffff;
    }
    .photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Preparer name */
    .preparer-name {
      color: #ffffff;
      font-size: 48px;
      font-weight: 900;
      margin-bottom: 8px;
      text-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }

    /* Phone number */
    .phone {
      color: rgba(255,255,255,0.95);
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 20px;
    }

    /* Link box */
    .link-box {
      background: #ffffff;
      border-radius: 20px;
      padding: 20px 40px;
      display: inline-block;
      margin-bottom: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .link-label {
      color: #16a34a;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 4px;
    }
    .link-url {
      color: #0f172a;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: -1px;
    }

    /* Features row */
    .features {
      display: flex;
      justify-content: center;
      gap: 50px;
      margin-bottom: 20px;
    }
    .feature {
      text-align: center;
    }
    .feature-icon {
      font-size: 36px;
      margin-bottom: 6px;
    }
    .feature-text {
      color: #ffffff;
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Bottom banner */
    .promo-banner {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #facc15 0%, #eab308 100%);
      padding: 24px 40px;
      text-align: center;
    }
    .promo-text {
      color: #713f12;
      font-size: 28px;
      font-weight: 800;
    }
  </style>
</head>
<body>

  <!-- Logo -->
  <div class="logo-container">
    <img src="https://taxgeniuspro.tax/images/logo-light-theme.png" alt="Tax Genius Pro" class="logo">
  </div>

  <!-- Main Content -->
  <div class="content">
    <h1 class="headline">It's Tax Season!</h1>
    <p class="subheadline">Do Your Taxes With Me</p>

    <!-- Photo -->
    <div class="photo-container">
      <img src="${preparer.avatarUrl}" alt="${fullName}" class="photo">
    </div>

    <!-- Name -->
    <h2 class="preparer-name">${fullName}</h2>

    <!-- Phone -->
    <p class="phone">📞 ${preparer.phone}</p>

    <!-- Link -->
    <div class="link-box">
      <p class="link-label">My Referral Link</p>
      <p class="link-url">taxgenius.tax/${preparer.code}</p>
    </div>

    <!-- Features -->
    <div class="features">
      <div class="feature">
        <div class="feature-icon">📱</div>
        <p class="feature-text">Easy Online</p>
      </div>
      <div class="feature">
        <div class="feature-icon">⚡</div>
        <p class="feature-text">Fast</p>
      </div>
      <div class="feature">
        <div class="feature-icon">💰</div>
        <p class="feature-text">Advance</p>
      </div>
    </div>
  </div>

  <!-- Bottom Promo Banner -->
  <div class="promo-banner">
    <p class="promo-text">💵 Tax Advance Available — Get Your Money Fast!</p>
  </div>

</body>
</html>
`;

  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Wait for images and fonts to load
  await new Promise(resolve => setTimeout(resolve, 3000));

  const outputPath = path.join(__dirname, `share-card-${preparer.code}.png`);
  await page.screenshot({
    path: outputPath,
    type: 'png',
    clip: { x: 0, y: 0, width: 1080, height: 1080 }
  });

  console.log(`✓ Generated: share-card-${preparer.code}.png (${fullName})`);

  await browser.close();
  return outputPath;
}

// Generate for a single preparer (for testing)
async function generateSample() {
  const gw = preparersData.preparers.find(p => p.code === 'gw');
  if (gw) {
    await generateShareCard(gw);
  }
}

// Generate for all preparers
async function generateAll() {
  console.log('Generating share cards for all preparers...\n');

  for (const preparer of preparersData.preparers) {
    await generateShareCard(preparer);
  }

  console.log('\n✅ All share cards generated!');
}

// Check command line args
const args = process.argv.slice(2);
if (args.includes('--all')) {
  generateAll().catch(console.error);
} else {
  generateSample().catch(console.error);
}
