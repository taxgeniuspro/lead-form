const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Load preparers data
const preparersPath = path.join(__dirname, '../data/preparers.json');
let preparersData = null;

function loadPreparers() {
  if (!preparersData) {
    try {
      const rawData = fs.readFileSync(preparersPath, 'utf8');
      preparersData = JSON.parse(rawData);
    } catch (error) {
      console.error('Failed to load preparers.json:', error.message);
      preparersData = { preparers: [], defaultCode: 'ow' };
    }
  }
  return preparersData;
}

/**
 * GET /api/preparer/by-code?code=xx
 * Returns preparer info based on their code
 * Falls back to default preparer (Owliver Owl) if code not found
 */
router.get('/by-code', (req, res) => {
  const { code } = req.query;
  const data = loadPreparers();

  // Find preparer by code (case-insensitive)
  let preparer = null;
  if (code) {
    preparer = data.preparers.find(
      p => p.code.toLowerCase() === code.toLowerCase()
    );
  }

  // Fallback to default preparer if not found
  if (!preparer) {
    preparer = data.preparers.find(
      p => p.code.toLowerCase() === data.defaultCode.toLowerCase()
    );
  }

  if (!preparer) {
    // Ultimate fallback - first preparer in list
    preparer = data.preparers[0] || {
      code: 'ow',
      firstName: 'Tax',
      lastName: 'Genius',
      email: 'taxgenius.tax@gmail.com',
      phone: '1 (404) 627-1015',
      title: 'Professional Tax Services',
      avatarUrl: '/images/default-avatar.png'
    };
  }

  res.json({
    success: true,
    preparer: {
      code: preparer.code,
      firstName: preparer.firstName,
      lastName: preparer.lastName,
      title: preparer.title,
      avatarUrl: preparer.avatarUrl,
      fullName: `${preparer.firstName} ${preparer.lastName}`
    }
  });
});

/**
 * GET /api/preparer/all
 * Returns list of all preparers (for admin/debugging)
 */
router.get('/all', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.ADMIN_API_KEY;

  // Only allow with API key
  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = loadPreparers();
  res.json({
    success: true,
    total: data.preparers.length,
    defaultCode: data.defaultCode,
    preparers: data.preparers.map(p => ({
      code: p.code,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email
    }))
  });
});

/**
 * GET /api/preparer/internal/:code
 * Internal endpoint - returns full preparer info including email
 * Used server-side for sending notifications to the right preparer
 */
router.get('/internal/:code', (req, res) => {
  // Only allow internal calls (check for internal header)
  const internalKey = req.headers['x-internal-key'];
  if (internalKey !== 'lead-form-internal-2024') {
    return res.status(403).json({ error: 'Internal endpoint' });
  }

  const { code } = req.params;
  const data = loadPreparers();

  let preparer = data.preparers.find(
    p => p.code.toLowerCase() === code.toLowerCase()
  );

  if (!preparer) {
    preparer = data.preparers.find(
      p => p.code.toLowerCase() === data.defaultCode.toLowerCase()
    );
  }

  res.json({ success: true, preparer });
});

// Export the loadPreparers function for use in other modules
router.loadPreparers = loadPreparers;

module.exports = router;
