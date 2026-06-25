const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const router = express.Router();

// GET /register
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('auth/register', { title: 'Register', error: null, form: {} });
});

// POST /register
router.post('/register', async (req, res) => {
  const { name, email, password, role, stack, hourly_rate } = req.body;
  
  if (!name || !email || !password || !role) {
    return res.render('auth/register', { 
      title: 'Register', 
      error: 'All required fields must be filled.',
      form: req.body 
    });
  }

  // Check if email exists
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.render('auth/register', { 
      title: 'Register', 
      error: 'Email already registered.',
      form: req.body 
    });
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const rate = parseFloat(hourly_rate) || 0;

  try {
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash, role, stack, hourly_rate) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, role, stack || '', rate]
    );
    
    req.session.userId = result.lastID;
    res.redirect('/dashboard');
  } catch (err) {
    res.render('auth/register', { 
      title: 'Register', 
      error: 'Registration failed. Please try again.',
      form: req.body 
    });
  }
});

// GET /login
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.render('auth/login', { title: 'Login', error: null });
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('auth/login', { title: 'Login', error: 'Email and password are required.' });
  }

  const user = await db.get('SELECT id, password_hash FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.render('auth/login', { title: 'Login', error: 'Invalid email or password.' });
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    return res.render('auth/login', { title: 'Login', error: 'Invalid email or password.' });
  }

  req.session.userId = user.id;
  res.redirect('/dashboard');
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
