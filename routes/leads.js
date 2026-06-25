const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /leads - List all leads
router.get('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const filter = req.query.status || 'all';
  
  let query = 'SELECT * FROM leads WHERE user_id = ?';
  const params = [userId];
  
  if (filter !== 'all') {
    query += ' AND status = ?';
    params.push(filter);
  }
  query += ' ORDER BY created_at DESC';
  
  const leads = await db.all(query, params);
  
  // Status counts for filter tabs
  const counts = await db.all(`
    SELECT status, COUNT(*) as count 
    FROM leads 
    WHERE user_id = ? 
    GROUP BY status
  `, [userId]);
  
  const statusCounts = { all: 0 };
  for (const c of counts) {
    statusCounts[c.status] = c.count;
    statusCounts.all += c.count;
  }

  res.render('leads/index', {
    title: 'Client Leads',
    leads,
    filter,
    statusCounts
  });
});

// POST /leads - Add new lead
router.post('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { company, contact_name, email, phone, stack_needed, source, notes } = req.body;
  
  if (!company || !contact_name) {
    return res.redirect('/leads?error=Company and contact name are required');
  }

  await db.run(`
    INSERT INTO leads (user_id, company, contact_name, email, phone, stack_needed, source, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)
  `, [userId, company, contact_name, email || '', phone || '', stack_needed || '', source || 'Other', notes || '']);

  res.redirect('/leads');
});

// POST /leads/:id/status - Update lead status
router.post('/:id/status', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { status } = req.body;
  const leadId = req.params.id;
  
  // Verify ownership
  const lead = await db.get('SELECT id FROM leads WHERE id = ? AND user_id = ?', [leadId, userId]);
  if (!lead) return res.redirect('/leads');

  await db.run('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, leadId]);
  res.redirect('/leads');
});

// POST /leads/:id/delete - Delete lead
router.post('/:id/delete', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const leadId = req.params.id;
  
  const lead = await db.get('SELECT id FROM leads WHERE id = ? AND user_id = ?', [leadId, userId]);
  if (!lead) return res.redirect('/leads');

  await db.run('DELETE FROM leads WHERE id = ?', [leadId]);
  res.redirect('/leads');
});

module.exports = router;
