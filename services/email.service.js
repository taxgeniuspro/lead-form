const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create transporter - configured via environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other
  ignoreTLS: true, // Skip STARTTLS - Postal accepts plain AUTH
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

/**
 * Send tax intake/advance notification email to preparer
 * - Advance Form: Simple email with basic lead info
 * - Intake Form: Full email with all fields + attachments (images, PDF)
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
    dependentsUnder24, dependentsInCollege, childCare,
    claimedAsDependent, inCollege, hasMortgage, deniedEITC, hasIrsPin, irsPin,
    licenseNumber, licenseExpiration,
    preferredFiling, refCode, preparer, wantsAdvance,
    idDocumentUrl, taxDocumentUrls, pdfPath
  } = leadData;

  const preparerName = preparer?.name || 'Tax Genius Pro';
  const filingMethod = preferredFiling === 'in-person' ? 'In-Person' : 'Remote';
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  const fullAddress = [address1, address2, city, state, zipCode].filter(Boolean).join(', ');

  // Detect if this is a simple Advance Form (minimal fields) vs full Intake Form
  const isSimpleAdvanceForm = wantsAdvance && !dob && !ssn && !address1;

  // Generate appropriate email based on form type
  let htmlContent;
  let textContent;
  let subjectLine;

  if (isSimpleAdvanceForm) {
    // SIMPLE ADVANCE FORM - Only show the fields that were collected
    subjectLine = `💰 TAX ADVANCE REQUEST: ${fullName} - ${zipCode}`;

    htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 500px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 24px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
        .content { background: #fffbeb; padding: 28px; border: 2px solid #fcd34d; border-top: 0; }
        .field { margin-bottom: 16px; }
        .label { font-weight: bold; color: #92400e; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
        .value { font-size: 18px; color: #1f2937; }
        .value a { color: #f59e0b; text-decoration: none; font-weight: bold; }
        .cta { display: block; background: #f59e0b; color: white; padding: 16px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; text-align: center; font-size: 18px; font-weight: bold; }
        .footer { background: #fef3c7; padding: 16px; text-align: center; font-size: 12px; color: #92400e; border-radius: 0 0 12px 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💰 TAX ADVANCE REQUEST</h1>
          <p>Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })} EST</p>
        </div>
        <div class="content">
          <div class="field">
            <div class="label">Client Name</div>
            <div class="value">${fullName}</div>
          </div>
          <div class="field">
            <div class="label">Phone</div>
            <div class="value"><a href="tel:${phone}">${phone}</a></div>
          </div>
          <div class="field">
            <div class="label">Email</div>
            <div class="value"><a href="mailto:${email}">${email || 'Not provided'}</a></div>
          </div>
          <div class="field">
            <div class="label">Zip Code</div>
            <div class="value">${zipCode}</div>
          </div>
          <div class="field">
            <div class="label">Preferred Filing</div>
            <div class="value">${filingMethod}</div>
          </div>
          <div class="field">
            <div class="label">Assigned To</div>
            <div class="value">${preparerName} (${refCode || 'ow'})</div>
          </div>
          <a href="tel:${phone}" class="cta">📞 CALL CLIENT NOW</a>
        </div>
        <div class="footer">
          <p>Client wants a Tax Advance. Call them ASAP!</p>
        </div>
      </div>
    </body>
    </html>
    `;

    textContent = `
💰 TAX ADVANCE REQUEST
======================

Client Name: ${fullName}
Phone: ${phone}
Email: ${email || 'Not provided'}
Zip Code: ${zipCode}
Preferred Filing: ${filingMethod}

Assigned To: ${preparerName} (${refCode || 'ow'})

Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST

Client wants a Tax Advance - call them ASAP!
    `.trim();

  } else {
    // FULL INTAKE FORM - Comprehensive email with all fields + attachments
    subjectLine = `📋 Tax Intake: ${fullName} - ${zipCode}`;

    const filingStatusDisplay = {
      'single': 'Single',
      'married_joint': 'Married Filing Jointly',
      'married_separate': 'Married Filing Separately',
      'head_household': 'Head of Household'
    };

    const yesNo = (val) => val === 'yes' ? 'Yes' : 'No';
    const advanceStatus = wantsAdvance ? 'YES - Wants Tax Advance' : 'No - Standard Filing';

    htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 650px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }
        .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
        .section { margin-bottom: 24px; }
        .section-title { font-weight: bold; color: #1e40af; font-size: 14px; text-transform: uppercase; border-bottom: 2px solid #1e40af; padding-bottom: 6px; margin-bottom: 12px; }
        .field { margin-bottom: 10px; display: flex; }
        .label { font-weight: bold; color: #6b7280; font-size: 12px; min-width: 160px; }
        .value { font-size: 14px; flex: 1; }
        .highlight { background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 4px solid #22c55e; margin-bottom: 16px; }
        .highlight-title { font-weight: bold; color: #166534; font-size: 14px; }
        .cta { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .docs-list { background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
        .docs-list a { color: #1e40af; text-decoration: none; display: block; padding: 4px 0; }
        a { color: #1e40af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 NEW TAX INTAKE FORM</h1>
          <p>Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })} EST</p>
        </div>

        <div class="content">
          <div class="highlight">
            <div class="highlight-title">📋 COMPLETE TAX INTAKE DATA</div>
          </div>

          <!-- Personal Information -->
          <div class="section">
            <div class="section-title">Personal Information</div>
            <div class="field"><span class="label">Full Name:</span><span class="value">${fullName}</span></div>
            <div class="field"><span class="label">Date of Birth:</span><span class="value">${dob || 'Not provided'}</span></div>
            <div class="field"><span class="label">SSN:</span><span class="value">${ssn || 'Not provided'}</span></div>
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
            <div class="field"><span class="label">Claimed as Dependent:</span><span class="value">${yesNo(claimedAsDependent)}</span></div>
            <div class="field"><span class="label">Filing Status:</span><span class="value">${filingStatusDisplay[filingStatus] || filingStatus || 'Not specified'}</span></div>
            <div class="field"><span class="label">Employment Type:</span><span class="value">${employmentType || 'Not specified'}</span></div>
            <div class="field"><span class="label">Occupation:</span><span class="value">${occupation || 'Not specified'}</span></div>
            <div class="field"><span class="label">In College:</span><span class="value">${yesNo(inCollege)}</span></div>
            <div class="field"><span class="label"># of Dependents:</span><span class="value">${numDependents || '0'}</span></div>
            <div class="field"><span class="label">Dependents Under 24:</span><span class="value">${yesNo(dependentsUnder24)}</span></div>
            <div class="field"><span class="label">Dependents in College:</span><span class="value">${yesNo(dependentsInCollege)}</span></div>
            <div class="field"><span class="label">Paid Child Care:</span><span class="value">${yesNo(childCare)}</span></div>
            <div class="field"><span class="label">Has Mortgage:</span><span class="value">${yesNo(hasMortgage)}</span></div>
            <div class="field"><span class="label">Previously Denied EITC:</span><span class="value">${yesNo(deniedEITC)}</span></div>
            <div class="field"><span class="label">IRS PIN:</span><span class="value">${hasIrsPin === 'yes' && irsPin ? irsPin : 'No'}</span></div>
            <div class="field"><span class="label">Wants Cash Advance:</span><span class="value"><strong style="color: ${wantsAdvance ? '#f59e0b' : '#22c55e'};">${advanceStatus}</strong></span></div>
          </div>

          <!-- ID Information -->
          <div class="section">
            <div class="section-title">ID / License Information</div>
            <div class="field"><span class="label">License/ID Number:</span><span class="value">${licenseNumber || 'Not provided'}</span></div>
            <div class="field"><span class="label">Expiration Date:</span><span class="value">${licenseExpiration || 'Not provided'}</span></div>
            ${idDocumentUrl ? `<div class="field"><span class="label">ID Document:</span><span class="value"><a href="${idDocumentUrl}" target="_blank">📄 View Uploaded ID</a></span></div>` : ''}
          </div>

          <!-- Tax Documents -->
          ${taxDocumentUrls && taxDocumentUrls.length > 0 ? `
          <div class="section">
            <div class="section-title">Uploaded Tax Documents (${taxDocumentUrls.length})</div>
            <div class="docs-list">
              ${taxDocumentUrls.map((doc, i) => `<a href="${doc.url}" target="_blank">📄 ${doc.name}</a>`).join('')}
            </div>
          </div>
          ` : ''}

          <!-- Assignment -->
          <div class="section">
            <div class="section-title">Assigned To</div>
            <div class="field"><span class="label">Tax Preparer:</span><span class="value">${preparerName} (${refCode || 'ow'})</span></div>
            <div class="field"><span class="label">Filing Method:</span><span class="value">${filingMethod}</span></div>
          </div>

          <a href="tel:${phone}" class="cta">📞 Call Client Now</a>
        </div>

        <div class="footer">
          <p>This is an automated notification from the Tax Genius Pro intake form.</p>
          ${pdfPath ? '<p>📎 PDF with complete details is attached to this email.</p>' : ''}
          ${idDocumentUrl ? '<p>📎 ID document is attached to this email.</p>' : ''}
        </div>
      </div>
    </body>
    </html>
    `;

    textContent = `
📋 TAX INTAKE FORM
======================

PERSONAL INFORMATION
- Name: ${fullName}
- DOB: ${dob || 'Not provided'}
- SSN: ${ssn || 'Not provided'}

CONTACT INFORMATION
- Phone: ${phone}
- Email: ${email}
- Address: ${fullAddress || 'Not provided'}

TAX INFORMATION
- Claimed as Dependent: ${yesNo(claimedAsDependent)}
- Filing Status: ${filingStatusDisplay[filingStatus] || filingStatus || 'Not specified'}
- Employment: ${employmentType || 'Not specified'}
- Occupation: ${occupation || 'Not specified'}
- In College: ${yesNo(inCollege)}
- # of Dependents: ${numDependents || '0'}
- Dependents Under 24: ${yesNo(dependentsUnder24)}
- Dependents in College: ${yesNo(dependentsInCollege)}
- Paid Child Care: ${yesNo(childCare)}
- Has Mortgage: ${yesNo(hasMortgage)}
- Previously Denied EITC: ${yesNo(deniedEITC)}
- IRS PIN: ${hasIrsPin === 'yes' && irsPin ? irsPin : 'No'}
- Wants Cash Advance: ${advanceStatus}

ID INFORMATION
- License #: ${licenseNumber || 'Not provided'}
- Expiration: ${licenseExpiration || 'Not provided'}

ASSIGNED TO: ${preparerName} (${refCode || 'ow'})
FILING METHOD: ${filingMethod}

Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST

Attachments: ${[pdfPath ? 'PDF' : null, idDocumentUrl ? 'ID Document' : null, taxDocumentUrls?.length ? `${taxDocumentUrls.length} Tax Doc(s)` : null].filter(Boolean).join(', ') || 'None'}
    `.trim();
  }

  try {
    // CC to both taxgenius.tax@gmail.com and taxgenius.taxes@gmail.com on all leads
    const ccEmails = ['taxgenius.tax@gmail.com', 'taxgenius.taxes@gmail.com'];
    const ccList = ccEmails.filter(cc => cc.toLowerCase() !== notificationEmail.toLowerCase());

    // Build attachments array
    const attachments = [];

    // Add PDF if generated (for both Advance and Intake forms)
    if (pdfPath && fs.existsSync(pdfPath)) {
      const pdfFileName = isSimpleAdvanceForm
        ? `Tax_Advance_${firstName}_${lastName}.pdf`
        : `Tax_Intake_${firstName}_${lastName}.pdf`;
      attachments.push({
        filename: pdfFileName,
        path: pdfPath,
        contentType: 'application/pdf'
      });
    }

    // Add ID document if available (Intake form only - but include if provided)
    if (idDocumentUrl && leadData.idDocumentPath && fs.existsSync(leadData.idDocumentPath)) {
      attachments.push({
        filename: `ID_${firstName}_${lastName}${path.extname(leadData.idDocumentPath)}`,
        path: leadData.idDocumentPath,
        contentType: 'image/jpeg'
      });
    }

    // Add tax documents if available (Intake form only)
    if (taxDocumentUrls && taxDocumentUrls.length > 0) {
      for (const doc of taxDocumentUrls) {
        if (doc.path && fs.existsSync(doc.path)) {
          attachments.push({
            filename: doc.name,
            path: doc.path,
            contentType: 'application/octet-stream'
          });
        }
      }
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: notificationEmail,
      cc: ccList,
      subject: subjectLine,
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
