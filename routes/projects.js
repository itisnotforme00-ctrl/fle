const express = require('express');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /projects - List all projects
router.get('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  
  const projects = await db.all(`
    SELECT id, title, client_name, status, total_value, deadline, start_date
    FROM projects
    WHERE user_id = ?
    ORDER BY 
      CASE status 
        WHEN 'in progress' THEN 1 
        WHEN 'review' THEN 2 
        WHEN 'on hold' THEN 3 
        WHEN 'completed' THEN 4 
      END,
      deadline ASC
  `, [userId]);

  res.render('projects/index', { title: 'Projects', projects });
});

// POST /projects - Add new project
router.post('/', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { title, client_name, description, start_date, deadline, total_value, status } = req.body;

  if (!title || !client_name) {
    return res.redirect('/projects?error=Title and client name are required');
  }

  await db.run(`
    INSERT INTO projects (user_id, client_name, title, description, start_date, deadline, total_value, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    userId, client_name, title, description || '', start_date || '', deadline || '', 
    parseFloat(total_value) || 0, status || 'in progress'
  ]);

  res.redirect('/projects');
});

// GET /projects/:id - View project detail
router.get('/:id', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.params.id;

  const project = await db.get(`
    SELECT * FROM projects WHERE id = ? AND user_id = ?
  `, [projectId, userId]);

  if (!project) return res.redirect('/projects');

  const milestones = await db.all(`
    SELECT * FROM milestones WHERE project_id = ? ORDER BY created_at ASC
  `, [projectId]);

  const notes = await db.all(`
    SELECT * FROM project_notes WHERE project_id = ? ORDER BY created_at DESC
  `, [projectId]);

  const invoices = await db.all(`
    SELECT * FROM invoices WHERE project_id = ? ORDER BY created_at DESC
  `, [projectId]);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPaid = invoices.filter(inv => inv.payment_status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);

  res.render('projects/detail', {
    title: project.title,
    project,
    milestones,
    notes,
    invoices,
    totalInvoiced,
    totalPaid
  });
});

// POST /projects/:id/milestones - Add milestone
router.post('/:id/milestones', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.params.id;
  const { title, due_date } = req.body;

  // Verify ownership
  const project = await db.get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  if (!project) return res.redirect('/projects');

  if (title) {
    await db.run(`
      INSERT INTO milestones (project_id, title, due_date)
      VALUES (?, ?, ?)
    `, [projectId, title, due_date || '']);
  }

  res.redirect(`/projects/${projectId}`);
});

// POST /projects/:id/milestones/:milestoneId/toggle - Toggle milestone status
router.post('/:id/milestones/:milestoneId/toggle', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.params.id;
  const milestoneId = req.params.milestoneId;

  const project = await db.get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  if (!project) return res.redirect('/projects');

  const milestone = await db.get('SELECT status FROM milestones WHERE id = ? AND project_id = ?', [milestoneId, projectId]);
  if (!milestone) return res.redirect(`/projects/${projectId}`);

  const newStatus = milestone.status === 'complete' ? 'pending' : 'complete';
  await db.run('UPDATE milestones SET status = ? WHERE id = ?', [newStatus, milestoneId]);

  res.redirect(`/projects/${projectId}`);
});

// POST /projects/:id/notes - Add note
router.post('/:id/notes', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.params.id;
  const { content } = req.body;

  const project = await db.get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  if (!project) return res.redirect('/projects');

  if (content && content.trim()) {
    await db.run('INSERT INTO project_notes (project_id, content) VALUES (?, ?)', [projectId, content.trim()]);
  }

  res.redirect(`/projects/${projectId}`);
});

// POST /projects/:id/invoices - Add invoice
router.post('/:id/invoices', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.params.id;
  const { amount, issued_date } = req.body;

  const project = await db.get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  if (!project) return res.redirect('/projects');

  if (amount && parseFloat(amount) > 0) {
    await db.run(`
      INSERT INTO invoices (project_id, amount, issued_date, payment_status)
      VALUES (?, ?, ?, 'unpaid')
    `, [projectId, parseFloat(amount), issued_date || new Date().toISOString().split('T')[0]]);
  }

  res.redirect(`/projects/${projectId}`);
});

// POST /projects/:id/invoices/:invoiceId/pay - Mark invoice as paid
router.post('/:id/invoices/:invoiceId/pay', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const projectId = req.params.id;
  const invoiceId = req.params.invoiceId;

  const project = await db.get('SELECT id FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);
  if (!project) return res.redirect('/projects');

  await db.run("UPDATE invoices SET payment_status = 'paid' WHERE id = ? AND project_id = ?", [invoiceId, projectId]);
  res.redirect(`/projects/${projectId}`);
});

module.exports = router;
