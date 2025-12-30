/**
 * Escape special Markdown characters for Telegram
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

/**
 * Send comprehensive lead notification to Telegram
 * Tax preparer will receive instant notification via Telegram bot
 */
async function sendLeadToTelegram(leadData) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('Telegram not configured, skipping');
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

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
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
      throw new Error(`Telegram API error: ${errorData.description}`);
    }

    console.log('Telegram notification sent successfully');
    return true;
  } catch (error) {
    console.error('Telegram notification error:', error.message);
    return false;
  }
}

module.exports = { sendLeadToTelegram };
