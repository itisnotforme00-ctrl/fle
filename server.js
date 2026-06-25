const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Initialize database
require('./database/db');

const { setUser } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const leadsRoutes = require('./routes/leads');
const proposalsRoutes = require('./routes/proposals');
const projectsRoutes = require('./routes/projects');
const calculatorRoutes = require('./routes/calculator');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'devhunt-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Make user available in all views
app.use(setUser);

// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/leads', leadsRoutes);
app.use('/proposals', proposalsRoutes);
app.use('/projects', projectsRoutes);
app.use('/calculator', calculatorRoutes);
app.use('/profile', profileRoutes);

// Landing page (public)
app.get('/', (req, res) => {
  res.render('landing', { title: 'DevHunt' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('landing', { title: 'Page Not Found' });
});

app.listen(PORT, () => {
  console.log(`DevHunt running on http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DATABASE_PATH || './database/devhunt.db'}`);
});
