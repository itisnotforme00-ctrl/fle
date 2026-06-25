const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;

  // Summary stats
  const totalLeads = (await db.get('SELECT COUNT(*) as count FROM leads WHERE user_id = ?', [userId])).count;
  const activeProjects = (await db.get('SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = ?', [userId, 'in progress'])).count;
  const proposalsSent = (await db.get('SELECT COUNT(*) as count FROM proposals WHERE user_id = ?', [userId])).count;
  
  // Get user's hourly rate
  const user = await db.get('SELECT hourly_rate FROM users WHERE id = ?', [userId]);
  
  // Estimate monthly revenue: user rate * 160 hours (full-time) * number of active projects
  const activeProjectCount = await db.get('SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = ?', [userId, 'in progress']);
  const monthlyRevenue = Math.round(user.hourly_rate * 160 * (activeProjectCount ? activeProjectCount.count : 0));

  // Recent leads (last 5)
  const recentLeads = await db.all(`
    SELECT id, company, contact_name, status, created_at 
    FROM leads 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 5
  `, [userId]);

  // Recent projects (last 5)
  const recentProjects = await db.all(`
    SELECT id, title, client_name, status, total_value, deadline 
    FROM projects 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 5
  `, [userId]);

  res.render('dashboard', {
    title: 'Dashboard',
    stats: { totalLeads, activeProjects, proposalsSent, monthlyRevenue },
    recentLeads,
    recentProjects
  });
});

module.exports = router;
