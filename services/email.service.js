const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create transporter - configured via environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send comprehensive tax intake notification email to preparer
 * Includes PDF attachment and all form data
 */
async function sendLeadNotification(leadData) {
  // Use preparer's email if available, otherwise fallback to NOTIFICATION_EMAIL
  const preparerEmail = leadData.preparer?.email;
  const notificationEmail = preparerEmail || process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    console.log('No notification email configured, skipping email');
    return false;
  }

  const {
    firstName, middleName, lastName, dob, ssn,
    phone, email, address1, address2, city, state, zipCode,
    filingStatus, employmentType, occupation, hasDependents, numDependents,
    licenseNumber, licenseExpiration,
    preferredFiling, refCode, preparer, wantsAdvance,
    idDocumentUrl, taxDocumentUrls, pdfPath
  } = leadData;

  const preparerName = preparer?.name || 'Tax Genius Pro';
  const filingMethod = preferredFiling === 'in-person' ? 'In-Person' : 'Remote';
  const advanceStatus = wantsAdvance ? 'YES - Wants Tax Advance' : 'No - Standard Filing';
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  const fullAddress = [address1, address2, city, state, zipCode].filter(Boolean).join(', ');

  const filingStatusDisplay = {
    'single': 'Single',
    'married_joint': 'Married Filing Jointly',
    'married_separate': 'Married Filing Separately',
    'head_household': 'Head of Household'
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 650px; margin: 0 auto; padding: 20px; }
        .header { background: ${wantsAdvance ? '#f59e0b' : '#1e40af'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
        .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
        .section { margin-bottom: 24px; }
        .section-title { font-weight: bold; color: #1e40af; font-size: 14px; text-transform: uppercase; border-bottom: 2px solid #1e40af; padding-bottom: 6px; margin-bottom: 12px; }
        .field { margin-bottom: 10px; display: flex; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; min-width: 140px; }
        .value { font-size: 14px; flex: 1; }
        .highlight { background: ${wantsAdvance ? '#fef3c7' : '#f0fdf4'}; padding: 12px; border-radius: 6px; border-left: 4px solid ${wantsAdvance ? '#f59e0b' : '#22c55e'}; margin-bottom: 16px; }
        .highlight-title { font-weight: bold; color: ${wantsAdvance ? '#92400e' : '#166534'}; font-size: 14px; }
        .cta { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; }
        .cta:hover { background: #1e3a8a; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .docs-list { background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
        .docs-list a { color: #1e40af; text-decoration: none; display: block; padding: 4px 0; }
        .docs-list a:hover { text-decoration: underline; }
        a { color: #1e40af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${wantsAdvance ? '💰 TAX ADVANCE REQUEST' : '📋 NEW TAX INTAKE FORM'}</h1>
          <p>Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })} EST</p>
        </div>

        <div class="content">
          <div class="highlight">
            <div class="highlight-title">${wantsAdvance ? '💰 CLIENT WANTS TAX ADVANCE' : '📋 STANDARD TAX FILING REQUEST'}</div>
          </div>

          <!-- Personal Information -->
          <div class="section">
            <div class="section-title">Personal Information</div>
            <div class="field"><span class="label">Full Name:</span><span class="value">${fullName}</span></div>
            <div class="field"><span class="label">Date of Birth:</span><span class="value">${dob || 'Not provided'}</span></div>
            <div class="field"><span class="label">SSN:</span><span class="value">${ssn ? '***-**-' + ssn.slice(-4) : 'Not provided'}</span></div>
          </div>

          <!-- Contact Information -->
          <div class="section">
            <div class="section-title">Contact Information</div>
            <div class="field"><span class="label">Phone:</span><span class="value"><a href="tel:${phone}">${phone}</a></span></div>
            <div class="field"><span class="label">Email:</span><span class="value"><a href="mailto:${email}">${email}</a></span></div>
            <div class="field"><span class="label">Address:</span><span class="value">${fullAddress || 'Not provided'}</span></div>
          </div>

          <!-- Tax Information -->
          <div class="section">
            <div class="section-title">Tax Information</div>
            <div class="field"><span class="label">Filing Status:</span><span class="value">${filingStatusDisplay[filingStatus] || filingStatus || 'Not specified'}</span></div>
            <div class="field"><span class="label">Employment Type:</span><span class="value">${employmentType || 'Not specified'}</span></div>
            <div class="field"><span class="label">Occupation:</span><span class="value">${occupation || 'Not specified'}</span></div>
            <div class="field"><span class="label">Has Dependents:</span><span class="value">${hasDependents === 'yes' ? 'Yes (' + numDependents + ')' : 'No'}</span></div>
          </div>

          <!-- ID Information -->
          <div class="section">
            <div class="section-title">ID / License Information</div>
            <div class="field"><span class="label">License/ID Number:</span><span class="value">${licenseNumber || 'Not provided'}</span></div>
            <div class="field"><span class="label">Expiration Date:</span><span class="value">${licenseExpiration || 'Not provided'}</span></div>
            ${idDocumentUrl ? `<div class="field"><span class="label">ID Document:</span><span class="value"><a href="${idDocumentUrl}" target="_blank">View Uploaded ID</a></span></div>` : ''}
          </div>

          <!-- Tax Documents -->
          ${taxDocumentUrls && taxDocumentUrls.length > 0 ? `
          <div class="section">
            <div class="section-title">Uploaded Tax Documents</div>
            <div class="docs-list">
              ${taxDocumentUrls.map((doc, i) => `<a href="${doc.url}" target="_blank">📄 ${doc.name}</a>`).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Filing Preference -->
          <div class="section">
            <div class="section-title">Filing Preference</div>
            <div class="field"><span class="label">Method:</span><span class="value">${filingMethod}</span></div>
            <div class="field"><span class="label">Wants Advance:</span><span class="value"><strong style="color: ${wantsAdvance ? '#f59e0b' : '#22c55e'};">${advanceStatus}</strong></span></div>
          </div>

          <!-- Assignment -->
          <div class="section">
            <div class="section-title">Assigned To</div>
            <div class="field"><span class="label">Tax Preparer:</span><span class="value">${preparerName} (${refCode || 'ow'})</span></div>
          </div>

          <a href="tel:${phone}" class="cta">📞 Call Client Now</a>
        </div>

        <div class="footer">
          <p>This is an automated notification from the Tax Genius Pro intake form.</p>
          <p>PDF with complete details is attached to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
TAX INTAKE FORM - ${wantsAdvance ? 'ADVANCE REQUEST' : 'STANDARD FILING'}
========================================

PERSONAL INFORMATION
- Name: ${fullName}
- DOB: ${dob || 'Not provided'}
- SSN: ${ssn ? '***-**-' + ssn.slice(-4) : 'Not provided'}

CONTACT INFORMATION
- Phone: ${phone}
- Email: ${email}
- Address: ${fullAddress || 'Not provided'}

TAX INFORMATION
- Filing Status: ${filingStatusDisplay[filingStatus] || filingStatus || 'Not specified'}
- Employment: ${employmentType || 'Not specified'}
- Occupation: ${occupation || 'Not specified'}
- Dependents: ${hasDependents === 'yes' ? 'Yes (' + numDependents + ')' : 'No'}

ID INFORMATION
- License #: ${licenseNumber || 'Not provided'}
- Expiration: ${licenseExpiration || 'Not provided'}

FILING PREFERENCE
- Method: ${filingMethod}
- WANTS ADVANCE: ${advanceStatus}

ASSIGNED TO: ${preparerName} (${refCode || 'ow'})

Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST
  `.trim();

  try {
    // CC to taxgenius.tax@gmail.com on all leads (unless it's the same as the recipient)
    const ccEmail = 'taxgenius.tax@gmail.com';
    const ccList = notificationEmail.toLowerCase() !== ccEmail.toLowerCase() ? [ccEmail] : [];

    // Build attachments array
    const attachments = [];

    // Add PDF if generated
    if (pdfPath && fs.existsSync(pdfPath)) {
      attachments.push({
        filename: `Tax_Intake_${firstName}_${lastName}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf'
      });
    }

    // Add ID document if it's a local file
    if (idDocumentUrl && leadData.idDocumentPath && fs.existsSync(leadData.idDocumentPath)) {
      attachments.push({
        filename: `ID_${firstName}_${lastName}${path.extname(leadData.idDocumentPath)}`,
        path: leadData.idDocumentPath,
        contentType: 'image/jpeg'
      });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: notificationEmail,
      cc: ccList,
      subject: `${wantsAdvance ? '💰 ADVANCE: ' : ''}Tax Intake: ${fullName} - ${zipCode}`,
      html: htmlContent,
      text: textContent,
      attachments: attachments
    });

    console.log('Email notification sent successfully to:', notificationEmail, ccList.length ? `(CC: ${ccList.join(', ')})` : '', attachments.length ? `with ${attachments.length} attachments` : '');
    return true;
  } catch (error) {
    console.error('Email notification error:', error.message);
    return false;
  }
}

module.exports = { sendLeadNotification };
