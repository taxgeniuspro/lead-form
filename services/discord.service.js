/**
 * Send simplified lead notification to Discord webhook
 * Shows only: Form Type, Last Name, Assigned To, Timestamp
 */
async function sendLeadToDiscord(leadData) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('Discord webhook not configured, skipping');
    return false;
  }

  const {
    lastName, preparer, wantsAdvance, dob, ssn, address1
  } = leadData;

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const preparerName = preparer?.name || 'Tax Genius Pro';
  const preparerCode = preparer?.code || 'ow';

  // Check if simple form vs full intake
  const isSimpleForm = wantsAdvance && !dob && !ssn && !address1;

  const formType = isSimpleForm
    ? '💰 TAX ADVANCE REQUEST'
    : '📋 NEW TAX INTAKE FORM';

  const message = `${formType}

Name: ${lastName}

👨‍💼 Assigned To: ${preparerName} (${preparerCode})

🕐 Submitted: ${timestamp} EST`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    console.log('Discord notification sent successfully');
    return true;
  } catch (error) {
    console.error('Discord notification error:', error.message);
    return false;
  }
}

module.exports = { sendLeadToDiscord };
