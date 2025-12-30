const pool = require('../config/database');

const LeadModel = {
  /**
   * Create a new lead in the database
   */
  async create(leadData) {
    const { firstName, lastName, phone, email, zipCode, preferredFiling, refCode, consent, wantsAdvance, imageUrl } = leadData;

    const [result] = await pool.execute(
      `INSERT INTO leads (first_name, last_name, phone, email, zip_code, preferred_filing, ref_code, consent, wants_advance, image_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        firstName,
        lastName,
        phone,
        email ? email.toLowerCase() : null,
        zipCode,
        preferredFiling || 'remote',
        refCode || 'ow',
        consent ? 1 : 0,
        wantsAdvance ? 1 : 0,
        imageUrl || null
      ]
    );

    return {
      id: result.insertId,
      ...leadData,
      createdAt: new Date(),
    };
  },

  /**
   * Check if email already exists
   */
  async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT id, first_name, last_name, email FROM leads WHERE email = ?',
      [email.toLowerCase()]
    );
    return rows[0] || null;
  },

  /**
   * Get all leads (for admin purposes)
   */
  async findAll(limit = 100, offset = 0) {
    const [rows] = await pool.execute(
      'SELECT * FROM leads ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [String(limit), String(offset)]
    );
    return rows;
  },

  /**
   * Get lead count
   */
  async count() {
    const [rows] = await pool.execute('SELECT COUNT(*) as total FROM leads');
    return rows[0].total;
  }
};

module.exports = LeadModel;
