const db = require('../database/db');

// Auth middleware - protect routes
async function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// Make user available to all views
async function setUser(req, res, next) {
  res.locals.user = null;
  if (req.session && req.session.userId) {
    try {
      const user = await db.get('SELECT id, name, email, role, stack, hourly_rate, bio, github_url, linkedin_url FROM users WHERE id = ?', [req.session.userId]);
      if (user) {
        res.locals.user = user;
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  }
  next();
}

module.exports = { requireAuth, setUser };
