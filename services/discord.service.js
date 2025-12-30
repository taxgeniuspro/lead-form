/**
 * Send comprehensive lead notification to Discord webhook
 * Tax preparer will receive instant notification in Discord
 */
async function sendLeadToDiscord(leadData) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('Discord webhook not configured, skipping');
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

  const timestamp = new Date().toISOString();
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

  const embed = {
    title: wantsAdvance ? '💰 TAX ADVANCE REQUEST' : '📋 New Tax Intake Form',
    color: wantsAdvance ? 16766720 : 3066993, // Gold for advance, Green for regular
    fields: [
      // Personal Info
      {
        name: '👤 Full Name',
        value: fullName,
        inline: true
      },
      {
        name: '📅 Date of Birth',
        value: dob || 'Not provided',
        inline: true
      },
      {
        name: '🔐 SSN',
        value: ssn ? `***-**-${ssn.slice(-4)}` : 'Not provided',
        inline: true
      },
      // Contact
      {
        name: '📱 Phone',
        value: `[${phone}](tel:${phone.replace(/\D/g, '')})`,
        inline: true
      },
      {
        name: '📧 Email',
        value: `[${email}](mailto:${email})`,
        inline: true
      },
      {
        name: '📍 Location',
        value: fullAddress || 'Not provided',
        inline: true
      },
      // Tax Info
      {
        name: '📋 Filing Status',
        value: filingStatusDisplay[filingStatus] || filingStatus || 'Not specified',
        inline: true
      },
      {
        name: '💼 Employment',
        value: employmentType || 'Not specified',
        inline: true
      },
      {
        name: '👔 Occupation',
        value: occupation || 'Not specified',
        inline: true
      },
      {
        name: '👨‍👩‍👧 Dependents',
        value: hasDependents === 'yes' ? `Yes (${numDependents})` : 'No',
        inline: true
      },
      // ID Info
      {
        name: '🪪 License/ID #',
        value: licenseNumber || 'Not provided',
        inline: true
      },
      {
        name: '📆 ID Expiration',
        value: licenseExpiration || 'Not provided',
        inline: true
      },
      // Filing Preference
      {
        name: '🏢 Filing Method',
        value: filingMethod,
        inline: true
      },
      {
        name: '💵 Tax Advance',
        value: advanceStatus,
        inline: true
      },
      // Assignment
      {
        name: '👨‍💼 Assigned To',
        value: `${preparerName} (${refCode || 'ow'})`,
        inline: false
      },
    ],
    timestamp: timestamp,
    footer: {
      text: 'Tax Genius Pro Intake Form'
    },
  };

  // Add ID image to embed if uploaded
  if (idDocumentUrl) {
    embed.image = { url: idDocumentUrl };
  }

  // Add tax documents as description if any
  if (taxDocumentUrls && taxDocumentUrls.length > 0) {
    embed.fields.push({
      name: '📎 Tax Documents',
      value: taxDocumentUrls.map((doc, i) => `[${doc.name}](${doc.url})`).join('\n'),
      inline: false
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: wantsAdvance ? '@here 💰 **TAX ADVANCE REQUEST!**' : '@here New tax intake form submitted!',
        embeds: [embed]
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
