const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF from lead data
 * - Advance Form: Simple PDF with basic lead info
 * - Intake Form: Comprehensive PDF with all fields
 * Returns the path to the generated PDF file
 */
async function generateLeadPDF(leadData) {
  return new Promise((resolve, reject) => {
    try {
      const {
        firstName, middleName, lastName, dob, ssn,
        phone, email, address1, address2, city, state, zipCode,
        filingStatus, employmentType, occupation, hasDependents, numDependents,
        dependentsUnder24, dependentsInCollege, childCare,
        claimedAsDependent, inCollege, hasMortgage, deniedEITC, hasIrsPin, irsPin,
        licenseNumber, licenseExpiration,
        preferredFiling, wantsAdvance,
        preparer, idDocumentUrl, taxDocumentUrls
      } = leadData;

      // Detect if this is a simple Advance Form (minimal fields) vs full Intake Form
      const isSimpleAdvanceForm = wantsAdvance && !dob && !ssn && !address1;

      // Create PDF directory if not exists
      const pdfDir = path.join(__dirname, '../pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // Generate unique filename based on form type
      const timestamp = Date.now();
      const safeName = `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = isSimpleAdvanceForm
        ? `advance_${safeName}_${timestamp}.pdf`
        : `intake_${safeName}_${timestamp}.pdf`;
      const pdfPath = path.join(pdfDir, filename);

      // Create PDF document
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      const filingMethod = preferredFiling === 'in-person' ? 'In-Person' : 'Remote/Virtual';

      // Helper function for sections
      const addSection = (title, color = '#1e40af') => {
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica-Bold').fillColor(color)
           .text(title);
        doc.moveTo(50, doc.y + 2).lineTo(562, doc.y + 2).stroke(color);
        doc.moveDown(0.5);
        doc.font('Helvetica').fillColor('#333333');
      };

      // Helper function for field rows
      const addField = (label, value) => {
        doc.fontSize(10);
        doc.font('Helvetica-Bold').text(label + ': ', { continued: true });
        doc.font('Helvetica').text(value || 'N/A');
      };

      const addFieldRow = (label1, value1, label2, value2) => {
        const y = doc.y;
        doc.fontSize(10);
        doc.font('Helvetica-Bold').text(label1 + ': ', 50, y, { continued: true, width: 250 });
        doc.font('Helvetica').text(value1 || 'N/A', { width: 200 });
        doc.font('Helvetica-Bold').text(label2 + ': ', 310, y, { continued: true, width: 250 });
        doc.font('Helvetica').text(value2 || 'N/A', { width: 200 });
        doc.y = y + 18;
      };

      if (isSimpleAdvanceForm) {
        // ========================================
        // SIMPLE ADVANCE FORM PDF
        // ========================================

        // Header - Orange theme for advance
        doc.fontSize(28).font('Helvetica-Bold')
           .fillColor('#f59e0b')
           .text('Tax Genius Pro', { align: 'center' });

        doc.fontSize(20).font('Helvetica-Bold')
           .fillColor('#92400e')
           .text('TAX ADVANCE REQUEST', { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#666666')
           .text(`Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`, { align: 'center' });

        doc.moveDown(1);

        // Orange banner
        doc.rect(50, doc.y, 512, 35).fill('#fef3c7');
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#92400e')
           .text('CLIENT WANTS TAX ADVANCE - CALL ASAP!', 50, doc.y - 28, { align: 'center', width: 512 });
        doc.moveDown(2);

        doc.fillColor('#333333');

        // Client Information - Large and clear
        addSection('Client Information', '#f59e0b');
        doc.fontSize(16);
        doc.font('Helvetica-Bold').text('Name: ', { continued: true });
        doc.font('Helvetica').text(fullName);
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Phone: ', { continued: true });
        doc.font('Helvetica').text(phone);
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Email: ', { continued: true });
        doc.font('Helvetica').text(email || 'Not provided');
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Zip Code: ', { continued: true });
        doc.font('Helvetica').text(zipCode);
        doc.moveDown(0.3);
        doc.font('Helvetica-Bold').text('Preferred Filing: ', { continued: true });
        doc.font('Helvetica').text(filingMethod);

        doc.moveDown(1);

        // Assigned Preparer
        addSection('Assigned Tax Preparer', '#f59e0b');
        doc.fontSize(12);
        addFieldRow('Name', preparer?.name || 'Tax Genius Pro', 'Code', preparer?.code || 'ow');
        addField('Email', preparer?.email || 'taxgenius.tax@gmail.com');

      } else {
        // ========================================
        // FULL INTAKE FORM PDF
        // ========================================

        // Header - Blue theme for standard intake
        doc.fontSize(24).font('Helvetica-Bold')
           .fillColor('#1e40af')
           .text('Tax Genius Pro', { align: 'center' });

        doc.fontSize(16).font('Helvetica')
           .fillColor('#333333')
           .text('Tax Intake Form', { align: 'center' });

        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#666666')
           .text(`Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`, { align: 'center' });

        doc.moveDown(1);

        // Status banner
        if (wantsAdvance) {
          doc.rect(50, doc.y, 512, 30).fill('#fef3c7');
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#92400e')
             .text('TAX ADVANCE REQUESTED', 50, doc.y - 25, { align: 'center', width: 512 });
        } else {
          doc.rect(50, doc.y, 512, 30).fill('#f0fdf4');
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#166534')
             .text('STANDARD TAX FILING', 50, doc.y - 25, { align: 'center', width: 512 });
        }
        doc.moveDown(1.5);
        doc.fillColor('#333333');

        // Personal Information
        addSection('Personal Information');
        addField('Full Name', fullName);
        addFieldRow('Date of Birth', dob, 'SSN', ssn || 'N/A');

        // Contact Information
        addSection('Contact Information');
        addFieldRow('Phone', phone, 'Email', email);
        addField('Street Address', [address1, address2].filter(Boolean).join(', ') || 'N/A');
        addFieldRow('City', city, 'State', state);
        addField('Zip Code', zipCode);

        // Tax Information
        addSection('Tax Information');
        const filingStatusDisplay = {
          'single': 'Single',
          'married_joint': 'Married Filing Jointly',
          'married_separate': 'Married Filing Separately',
          'head_household': 'Head of Household'
        };
        const yesNo = (val) => val === 'yes' ? 'Yes' : 'No';

        addFieldRow('Claimed as Dependent', yesNo(claimedAsDependent), 'Filing Status', filingStatusDisplay[filingStatus] || filingStatus || 'N/A');
        addFieldRow('Employment Type', employmentType, 'Occupation', occupation);
        addFieldRow('In College', yesNo(inCollege), '# of Dependents', numDependents || '0');
        addFieldRow('Dependents Under 24', yesNo(dependentsUnder24), 'Dependents in College', yesNo(dependentsInCollege));
        addFieldRow('Paid Child Care', yesNo(childCare), 'Has Mortgage', yesNo(hasMortgage));
        addFieldRow('Previously Denied EITC', yesNo(deniedEITC), 'IRS PIN', hasIrsPin === 'yes' && irsPin ? irsPin : 'No');
        addField('Wants Cash Advance', wantsAdvance ? 'YES' : 'No');

        // ID Information
        addSection('ID / License Information');
        addFieldRow('License/ID Number', licenseNumber, 'Expiration Date', licenseExpiration);
        if (idDocumentUrl) {
          addField('ID Document', 'Uploaded (see email attachment)');
        }

        // Tax Documents
        if (taxDocumentUrls && taxDocumentUrls.length > 0) {
          addSection('Tax Documents Uploaded');
          taxDocumentUrls.forEach((d, i) => {
            addField(`Document ${i + 1}`, d.name);
          });
        }

        // Filing Preference
        addSection('Filing Preference');
        addField('Method', filingMethod);

        // Assigned Preparer
        addSection('Assigned Tax Preparer');
        addFieldRow('Name', preparer?.name || 'Tax Genius Pro', 'Code', preparer?.code || 'ow');
        addField('Email', preparer?.email || 'taxgenius.tax@gmail.com');
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#999999')
         .text('This is an official tax document generated by Tax Genius Pro.', { align: 'center' })
         .text('All information is confidential and protected.', { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(pdfPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateLeadPDF };
