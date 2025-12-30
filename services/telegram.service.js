/**
 * Escape special Markdown characters for Telegram
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Fetch with retry and timeout for unreliable network
 */
async function fetchWithRetry(url, options, maxRetries = 3, timeout = 30000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.log(`Telegram attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Send comprehensive lead notification to Telegram
 * Sends to BOTH English and Spanish bots for redundancy
 */
async function sendLeadToTelegram(leadData) {
  const chatId = process.env.TELEGRAM_CHAT_ID || '7154912264';

  // Both bots for redundancy
  const bots = [
    {
      name: 'English',
      token: process.env.TELEGRAM_BOT_TOKEN || '7904997613:AAFWL7jt240sSn5Vt8ShOHmt7iV8krKb0Jo'
    },
    {
      name: 'Spanish',
      token: process.env.TELEGRAM_BOT_TOKEN_ES || '7776905155:AAF0FCIGHoAi5e2KVR_AbBizF1SW-1qD-DQ'
    }
  ];

  if (!chatId) {
    console.log('Telegram chat ID not configured, skipping');
    return false;
  }

  const {
    firstName, middleName, lastName, dob, ssn,
    phone, email, address1, address2, city, state, zipCode,
    filingStatus, employmentType, occupation, hasDependents, numDependents,
    licenseNumber, licenseExpiration,
    preferredFiling, refCode, preparer, wantsAdvance,
    idDocumentUrl, taxDocumentUrls
  } = leadData;

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const preparerName = preparer?.name || 'Tax Genius Pro';
  const filingMethod = preferredFiling === 'in-person' ? 'In-Person' : 'Remote';
  const advanceStatus = wantsAdvance ? '✅ YES - Wants Advance' : '❌ No - Standard Filing';
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  const fullAddress = [address1, address2, city, state, zipCode].filter(Boolean).join(', ');

  const filingStatusDisplay = {
    'single': 'Single',
    'married_joint': 'Married Filing Jointly',
    'married_separate': 'Married Filing Separately',
    'head_household': 'Head of Household'
  };

  // Format phone for clickable link
  const phoneDigits = phone.replace(/\D/g, '');

  // Escape user-provided data to prevent Markdown parsing errors
  const safeName = escapeMarkdown(fullName);
  const safeEmail = escapeMarkdown(email);
  const safeAddress = escapeMarkdown(fullAddress);
  const safeOccupation = escapeMarkdown(occupation);
  const safeLicense = escapeMarkdown(licenseNumber);
  const safePreparerName = escapeMarkdown(preparerName);
  const safeRefCode = escapeMarkdown(refCode || 'ow');
  const safePhone = escapeMarkdown(phone);
  const safeDob = escapeMarkdown(dob || 'Not provided');
  const safeFilingStatus = escapeMarkdown(filingStatusDisplay[filingStatus] || filingStatus || 'Not specified');
  const safeEmployment = escapeMarkdown(employmentType || 'Not specified');
  const safeLicenseExp = escapeMarkdown(licenseExpiration || 'Not provided');
  const safeDependents = hasDependents === 'yes' ? `Yes \\(${escapeMarkdown(numDependents)}\\)` : 'No';

  const message = `
${wantsAdvance ? '💰 *TAX ADVANCE REQUEST*' : '📋 *NEW TAX INTAKE FORM*'}
━━━━━━━━━━━━━━━━━━━━━━

👤 *PERSONAL INFORMATION*
Name: ${safeName}
DOB: ${safeDob}
SSN: ${ssn ? '\\*\\*\\*\\-\\*\\*\\-' + ssn.slice(-4) : 'Not provided'}

📞 *CONTACT*
Phone: ${safePhone}
Email: ${safeEmail}
Address: ${safeAddress || 'Not provided'}

📋 *TAX INFORMATION*
Filing Status: ${safeFilingStatus}
Employment: ${safeEmployment}
Occupation: ${safeOccupation || 'Not specified'}
Dependents: ${safeDependents}

🪪 *ID INFORMATION*
License/ID \\#: ${safeLicense || 'Not provided'}
Expiration: ${safeLicenseExp}

📝 *FILING PREFERENCE*
Method: ${filingMethod}
💵 *Tax Advance:* ${advanceStatus}

👨‍💼 *Assigned To:* ${safePreparerName} \\(${safeRefCode}\\)

🕐 *Submitted:* ${timestamp} EST
${idDocumentUrl ? `\n📎 *ID Photo:* ${escapeMarkdown(idDocumentUrl)}` : ''}
${taxDocumentUrls && taxDocumentUrls.length > 0 ? `\n📄 *Tax Docs:* ${taxDocumentUrls.length} file\\(s\\) uploaded` : ''}
━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  // Send to all bots in parallel
  const results = await Promise.allSettled(
    bots.map(async (bot) => {
      try {
        const url = `https://api.telegram.org/bot${bot.token}/sendMessage`;
        const response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`${bot.name} bot error: ${errorData.description}`);
        }

        console.log(`Telegram ${bot.name} bot: sent successfully`);
        return { bot: bot.name, success: true };
      } catch (error) {
        console.error(`Telegram ${bot.name} bot failed:`, error.message);
        return { bot: bot.name, success: false, error: error.message };
      }
    })
  );

  // Return true if at least one bot succeeded
  const successes = results.filter(r => r.status === 'fulfilled' && r.value.success);
  if (successes.length > 0) {
    console.log(`Telegram notifications: ${successes.length}/${bots.length} bots succeeded`);
    return true;
  }

  console.error('All Telegram bots failed to send notification');
  return false;
}

module.exports = { sendLeadToTelegram };
