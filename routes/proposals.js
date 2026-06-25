const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /proposals - List all proposals
router.get('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  
  const proposals = await db.all(`
    SELECT p.*, l.company, l.contact_name, l.email as lead_email
    FROM proposals p
    LEFT JOIN leads l ON p.lead_id = l.id
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
  `, [userId]);

  res.render('proposals/index', { title: 'Proposals', proposals });
});

// GET /proposals/new - New proposal form
router.get('/new', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  
  const leads = await db.all(`
    SELECT id, company, contact_name 
    FROM leads 
    WHERE user_id = ? AND status IN ('new', 'contacted', 'negotiating')
    ORDER BY company ASC
  `, [userId]);

  const user = await db.get('SELECT hourly_rate FROM users WHERE id = ?', [userId]);

  res.render('proposals/new', { 
    title: 'New Proposal', 
    leads, 
    hourlyRate: user.hourly_rate,
    error: null 
  });
});

// POST /proposals - Create proposal
router.post('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { lead_id, title, description, tech_stack, estimated_hours, hourly_rate, timeline_weeks, payment_terms } = req.body;

  if (!title || !description || !estimated_hours || !hourly_rate) {
    const leads = await db.all('SELECT id, company, contact_name FROM leads WHERE user_id = ?', [userId]);
    return res.render('proposals/new', {
      title: 'New Proposal',
      leads,
      hourlyRate: hourly_rate,
      error: 'Please fill all required fields.'
    });
  }

  await db.run(`
    INSERT INTO proposals (user_id, lead_id, title, description, tech_stack, estimated_hours, hourly_rate, timeline_weeks, payment_terms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    userId, lead_id || null, title, description, tech_stack || '', 
    parseFloat(estimated_hours), parseFloat(hourly_rate), parseInt(timeline_weeks) || 1, payment_terms || 'milestone-based'
  ]);

  res.redirect('/proposals');
});

// GET /proposals/:id - View proposal
router.get('/:id', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const proposalId = req.params.id;

  const proposal = await db.get(`
    SELECT p.*, l.company, l.contact_name, l.email as lead_email
    FROM proposals p
    LEFT JOIN leads l ON p.lead_id = l.id
    WHERE p.id = ? AND p.user_id = ?
  `, [proposalId, userId]);

  if (!proposal) return res.redirect('/proposals');

  const user = await db.get('SELECT name, email, role, stack, hourly_rate, bio, github_url, linkedin_url FROM users WHERE id = ?', [userId]);

  // Auto-generate 3 bullet points from description
  const sentences = proposal.description.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 3);
  const approachBullets = sentences.length >= 3 ? sentences.map(s => s.trim() + '.') : [
    'Comprehensive analysis and planning phase to align technical architecture with business goals.',
    'Iterative development with weekly demos and continuous feedback integration.',
    'Thorough testing, documentation, and post-launch support for seamless delivery.'
  ];

  // Generate milestones
  const totalCost = proposal.estimated_hours * proposal.hourly_rate;
  const milestoneCount = Math.min(proposal.timeline_weeks, 4);
  const milestones = [];
  const startDate = new Date();
  for (let i = 0; i < milestoneCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + ((i + 1) * Math.floor(proposal.timeline_weeks / milestoneCount) * 7));
    milestones.push({
      title: i === milestoneCount - 1 ? 'Final Delivery & Launch' : `Phase ${i + 1} - ${['Discovery', 'Development', 'Integration', 'Testing'][i] || 'Implementation'}`,
      date: date.toISOString().split('T')[0]
    });
  }

  res.render('proposals/view', {
    title: proposal.title,
    proposal,
    user,
    approachBullets,
    totalCost,
    milestones
  });
});

module.exports = router;
