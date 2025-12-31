const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'lead-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WEBP, and PDF are allowed.'));
    }
  }
});

// Handle multiple file fields
const uploadFields = upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'taxDocuments', maxCount: 10 },
  { name: 'image', maxCount: 1 } // Keep backward compatibility
]);

const LeadModel = require('../models/lead.model');
const { sendLeadNotification } = require('../services/email.service');
const { sendLeadToDiscord } = require('../services/discord.service');
const { sendLeadToTelegram } = require('../services/telegram.service');

// PDF service is optional - may not be installed on all hosts
let generateLeadPDF = null;
try {
  generateLeadPDF = require('../services/pdf.service').generateLeadPDF;
} catch (err) {
  console.log('PDF service not available:', err.message);
}

// Load preparers data
let preparersData = null;
function loadPreparers() {
  if (!preparersData) {
    try {
      const rawData = fs.readFileSync(path.join(__dirname, '../data/preparers.json'), 'utf8');
      preparersData = JSON.parse(rawData);
    } catch (error) {
      console.error('Failed to load preparers:', error.message);
      preparersData = { preparers: [], defaultCode: 'ow' };
    }
  }
  return preparersData;
}

// Find preparer by code
function getPreparerByCode(code) {
  const data = loadPreparers();
  let preparer = data.preparers.find(p => p.code.toLowerCase() === (code || '').toLowerCase());
  if (!preparer) {
    preparer = data.preparers.find(p => p.code.toLowerCase() === data.defaultCode.toLowerCase());
  }
  return preparer;
}

// Validation middleware (relaxed for intake form - more fields optional)
const validateLead = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name too long')
    .escape(),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name too long')
    .escape(),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^[\d\s\-\(\)\+]+$/).withMessage('Invalid phone format')
    .isLength({ min: 10, max: 20 }).withMessage('Phone must be 10-20 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('zipCode')
    .trim()
    .notEmpty().withMessage('Zip code is required')
    .matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid zip code (use 5 digits)'),
  body('consent')
    .custom(value => value === true || value === 'true' || value === 'on')
    .withMessage('You must agree to be contacted'),
  body('refCode')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('Invalid ref code'),
  // Optional intake fields - validate if present
  body('middleName').optional().trim().isLength({ max: 50 }).escape(),
  body('ssn').optional().trim(),
  body('dob').optional().trim(),
  body('address1').optional().trim().isLength({ max: 100 }).escape(),
  body('address2').optional().trim().isLength({ max: 50 }).escape(),
  body('city').optional().trim().isLength({ max: 50 }).escape(),
  body('state').optional().trim().isLength({ max: 2 }).escape(),
  body('filingStatus').optional().trim(),
  body('employmentType').optional().trim(),
  body('occupation').optional().trim().isLength({ max: 100 }).escape(),
  body('hasDependents').optional().trim(),
  body('numDependents').optional().trim(),
  body('licenseNumber').optional().trim().isLength({ max: 50 }).escape(),
  body('licenseExpiration').optional().trim(),
];

/**
 * POST /api/leads - Submit a new lead (full tax intake form)
 * Main purpose: Send complete tax intake data to preparer via email with PDF + Discord + Telegram
 */
router.post('/', uploadFields, validateLead, async (req, res) => {
  // DEBUG: Log received form data
  console.log('=== FORM SUBMISSION RECEIVED ===');
  console.log('Body keys:', Object.keys(req.body));
  console.log('Body data:', JSON.stringify(req.body, null, 2));
  console.log('Files:', req.files ? Object.keys(req.files) : 'none');
  console.log('================================');

  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => e.msg),
    });
  }

  const {
    // Basic info
    firstName, middleName, lastName, dob, ssn,
    // Contact
    phone, email, address1, address2, city, state, zipCode,
    // Tax info
    filingStatus, employmentType, occupation, hasDependents, numDependents,
    // Additional tax questions
    dependentsUnder24, dependentsInCollege, childCare,
    claimedAsDependent, inCollege, hasMortgage, deniedEITC, hasIrsPin, irsPin,
    // ID info
    licenseNumber, licenseExpiration,
    // Form settings
    refCode, preferredFiling, wantsAdvance, lang
  } = req.body;

  // Get uploaded files
  const host = req.get('host');
  const protocol = req.protocol;

  let idDocumentUrl = null;
  let idDocumentPath = null;
  let taxDocumentUrls = [];

  // ID Document
  if (req.files && req.files['idDocument'] && req.files['idDocument'][0]) {
    const idFile = req.files['idDocument'][0];
    idDocumentUrl = `${protocol}://${host}/uploads/${idFile.filename}`;
    idDocumentPath = idFile.path;
  }

  // Tax Documents (multiple)
  if (req.files && req.files['taxDocuments']) {
    taxDocumentUrls = req.files['taxDocuments'].map(f => ({
      name: f.originalname,
      url: `${protocol}://${host}/uploads/${f.filename}`,
      path: f.path
    }));
  }

  // Legacy image field (backward compatibility)
  if (req.files && req.files['image'] && req.files['image'][0]) {
    const imgFile = req.files['image'][0];
    idDocumentUrl = idDocumentUrl || `${protocol}://${host}/uploads/${imgFile.filename}`;
    idDocumentPath = idDocumentPath || imgFile.path;
  }

  // Get the preparer for this lead
  const preparer = getPreparerByCode(refCode);
  const preparerCode = preparer ? preparer.code : 'ow';
  const preparerEmail = preparer ? preparer.email : process.env.NOTIFICATION_EMAIL;
  const preparerName = preparer ? `${preparer.firstName} ${preparer.lastName}` : 'Tax Genius Pro';

  // Parse wantsAdvance from form data
  const wantsAdvanceValue = wantsAdvance === true || wantsAdvance === 'true';

  // Full lead data object
  const leadData = {
    // Personal
    firstName,
    middleName: middleName || '',
    lastName,
    dob: dob || '',
    ssn: ssn || '',
    // Contact
    phone,
    email,
    address1: address1 || '',
    address2: address2 || '',
    city: city || '',
    state: state || '',
    zipCode,
    // Tax info
    filingStatus: filingStatus || '',
    employmentType: employmentType || '',
    occupation: occupation || '',
    hasDependents: hasDependents || 'no',
    numDependents: numDependents || '0',
    // Additional tax questions
    dependentsUnder24: dependentsUnder24 || 'no',
    dependentsInCollege: dependentsInCollege || 'no',
    childCare: childCare || 'no',
    claimedAsDependent: claimedAsDependent || 'no',
    inCollege: inCollege || 'no',
    hasMortgage: hasMortgage || 'no',
    deniedEITC: deniedEITC || 'no',
    hasIrsPin: hasIrsPin || 'no',
    irsPin: irsPin || '',
    // ID info
    licenseNumber: licenseNumber || '',
    licenseExpiration: licenseExpiration || '',
    // Form settings
    preferredFiling: preferredFiling || 'remote',
    refCode: preparerCode,
    consent: true,
    wantsAdvance: wantsAdvanceValue,
    lang: lang || 'en', // Language for notification routing
    // Files
    idDocumentUrl: idDocumentUrl,
    idDocumentPath: idDocumentPath,
    taxDocumentUrls: taxDocumentUrls,
    // Preparer info for notifications
    preparer: {
      code: preparerCode,
      name: preparerName,
      email: preparerEmail,
    }
  };

  console.log('=== LEAD DATA TO SEND ===');
  console.log('Name:', firstName, middleName, lastName);
  console.log('Contact:', phone, email);
  console.log('Address:', address1, city, state, zipCode);
  console.log('Tax:', filingStatus, employmentType, hasDependents, numDependents);
  console.log('Preparer:', preparerName, '(' + preparerCode + ')');
  console.log('Advance:', wantsAdvanceValue, 'Lang:', lang);
  console.log('=========================');

  try {
    // Generate PDF from form data (if PDF service is available)
    let pdfPath = null;
    if (generateLeadPDF) {
      try {
        pdfPath = await generateLeadPDF(leadData);
        console.log('PDF generated:', pdfPath);
      } catch (pdfError) {
        console.error('PDF generation failed (continuing):', pdfError.message);
      }
    } else {
      console.log('PDF generation skipped (pdfkit not installed)');
    }

    // Save to database (backup/record keeping)
    let savedLead = null;
    try {
      savedLead = await LeadModel.create({
        ...leadData,
        imageUrl: idDocumentUrl // For backward compatibility with DB schema
      });
      console.log('Lead saved to database, ID:', savedLead.id);
    } catch (dbError) {
      console.error('Database save failed (continuing with notifications):', dbError.message);
    }

    // Return success to user IMMEDIATELY (don't wait for notifications)
    res.json({
      success: true,
      message: 'Thank you! Your tax intake form has been submitted successfully.',
      leadId: savedLead?.id || null,
    });

    // Send notifications in background (don't block response)
    const notificationData = {
      ...leadData,
      pdfPath: pdfPath
    };

    // Fire and forget - notifications happen after response is sent
    Promise.allSettled([
      sendLeadNotification(notificationData),
      sendLeadToDiscord(notificationData),
      sendLeadToTelegram(notificationData),
    ]).then(results => {
      const services = ['Email', 'Discord', 'Telegram'];
      let successCount = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
          console.log(`${services[index]}: sent`);
        } else {
          console.log(`${services[index]}: failed or skipped`, result.reason?.message || '');
        }
      });
      console.log(`Notifications sent: ${successCount}/3`);
    });

  } catch (error) {
    console.error('Lead submission error:', error);
    res.status(500).json({
      error: 'Failed to submit form. Please try again.',
    });
  }
});

/**
 * GET /api/leads - Get all leads (simple admin endpoint)
 * Protected by a simple API key check
 */
router.get('/', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const leads = await LeadModel.findAll(100, 0);
    const count = await LeadModel.count();
    res.json({ total: count, leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

module.exports = router;
