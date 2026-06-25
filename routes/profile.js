const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /profile
router.get('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;

  const user = await db.get(`
    SELECT id, name, email, role, stack, hourly_rate, bio, github_url, linkedin_url, created_at 
    FROM users 
    WHERE id = ?
  `, [userId]);

  if (!user) return res.redirect('/logout');

  // Stats
  const totalLeadsAdded = (await db.get('SELECT COUNT(*) as count FROM leads WHERE user_id = ?', [userId])).count;
  const proposalsSent = (await db.get('SELECT COUNT(*) as count FROM proposals WHERE user_id = ?', [userId])).count;
  const projectsCompleted = (await db.get('SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = ?', [userId, 'completed'])).count;
  
  // Total revenue from paid invoices
  const revenueResult = await db.get(`
    SELECT COALESCE(SUM(i.amount), 0) as total 
    FROM invoices i
    JOIN projects p ON i.project_id = p.id
    WHERE p.user_id = ? AND i.payment_status = ?
  `, [userId, 'paid']);
  const totalRevenue = revenueResult ? revenueResult.total : 0;

  res.render('profile', {
    title: 'Profile',
    user,
    stats: {
      totalLeadsAdded,
      proposalsSent,
      projectsCompleted,
      totalRevenue
    },
    success: req.query.success || null
  });
});

// POST /profile - Update profile
router.post('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { name, email, role, stack, hourly_rate, bio, github_url, linkedin_url } = req.body;

  await db.run(`
    UPDATE users 
    SET name = ?, email = ?, role = ?, stack = ?, hourly_rate = ?, bio = ?, github_url = ?, linkedin_url = ?
    WHERE id = ?
  `, [
    name, email, role, stack || '', parseFloat(hourly_rate) || 0, bio || '', 
    github_url || '', linkedin_url || '', userId
  ]);

  res.redirect('/profile?success=Profile updated successfully');
});

module.exports = router;
