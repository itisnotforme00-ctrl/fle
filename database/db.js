const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'devhunt.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initAndSeed();
  }
});

// Promisify database methods
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables
async function initTables() {
  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('backend', 'frontend', 'fullstack')) NOT NULL DEFAULT 'fullstack',
      stack TEXT,
      hourly_rate REAL DEFAULT 0,
      bio TEXT,
      github_url TEXT,
      linkedin_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Leads table
  await run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      company TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      stack_needed TEXT,
      source TEXT CHECK(source IN ('LinkedIn', 'GitHub', 'Referral', 'Cold Outreach', 'Other')),
      status TEXT CHECK(status IN ('new', 'contacted', 'proposal sent', 'negotiating', 'won', 'lost')) DEFAULT 'new',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Proposals table
  await run(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lead_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      tech_stack TEXT,
      estimated_hours REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      timeline_weeks INTEGER DEFAULT 1,
      payment_terms TEXT CHECK(payment_terms IN ('50% upfront', '30-70 split', 'milestone-based', 'net-30')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
    )
  `);

  // Projects table
  await run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      deadline TEXT,
      total_value REAL DEFAULT 0,
      status TEXT CHECK(status IN ('in progress', 'review', 'completed', 'on hold')) DEFAULT 'in progress',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Milestones table
  await run(`
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      status TEXT CHECK(status IN ('pending', 'complete')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Project notes table
  await run(`
    CREATE TABLE IF NOT EXISTS project_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // Invoices table
  await run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      issued_date TEXT,
      payment_status TEXT CHECK(payment_status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables initialized.');
}

// Seed demo data
async function seedData() {
  // Check if demo user exists
  const existing = await get('SELECT id FROM users WHERE email = ?', ['demo@devhunt.com']);
  if (existing) {
    console.log('Demo user already exists. Skipping seed.');
    return;
  }

  const passwordHash = bcrypt.hashSync('demo1234', 12);

  // Insert demo user
  const userResult = await run(
    'INSERT INTO users (name, email, password_hash, role, stack, hourly_rate, bio, github_url, linkedin_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['Alex Developer', 'demo@devhunt.com', passwordHash, 'fullstack', 'Node.js, React, PostgreSQL, AWS', 85, 'Senior fullstack developer with 8+ years building scalable web apps.', 'https://github.com/alexdev', 'https://linkedin.com/in/alexdev']
  );
  const userId = userResult.lastID;

  // Insert demo leads
  const leads = [
    { company: 'TechFlow Inc', contact_name: 'Sarah Chen', email: 'sarah@techflow.io', phone: '+1-555-0101', stack_needed: 'Node.js, React, PostgreSQL', source: 'LinkedIn', status: 'negotiating', notes: 'Interested in SaaS platform rebuild. Budget confirmed at $25k.' },
    { company: 'DataBridge', contact_name: 'Marcus Johnson', email: 'marcus@databridge.co', phone: '+1-555-0102', stack_needed: 'Python, AWS, Docker', source: 'Referral', status: 'proposal sent', notes: 'Data pipeline project for fintech startup.' },
    { company: 'CloudNine Systems', contact_name: 'Elena Rodriguez', email: 'elena@cloudnine.dev', phone: '+1-555-0103', stack_needed: 'Go, Kubernetes, gRPC', source: 'GitHub', status: 'new', notes: 'Microservices architecture consultation needed.' }
  ];

  const leadIds = [];
  for (const lead of leads) {
    const result = await run(
      'INSERT INTO leads (user_id, company, contact_name, email, phone, stack_needed, source, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, lead.company, lead.contact_name, lead.email, lead.phone, lead.stack_needed, lead.source, lead.status, lead.notes]
    );
    leadIds.push(result.lastID);
  }

  // Insert demo proposals
  await run(
    'INSERT INTO proposals (user_id, lead_id, title, description, tech_stack, estimated_hours, hourly_rate, timeline_weeks, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, leadIds[1], 'DataBridge Pipeline Modernization', 'Build a scalable ETL pipeline to process 10M+ daily transactions with real-time monitoring, automated alerting, and dashboard integration. Includes data validation, error handling, and AWS infrastructure setup.', 'Python, AWS Lambda, PostgreSQL, Docker, Grafana', 120, 85, 6, 'milestone-based']
  );

  await run(
    'INSERT INTO proposals (user_id, lead_id, title, description, tech_stack, estimated_hours, hourly_rate, timeline_weeks, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, leadIds[0], 'TechFlow SaaS Platform Rebuild', 'Complete rebuild of the existing monolithic application into a modern microservices architecture. Includes API redesign, frontend migration to React, database optimization, and CI/CD pipeline setup.', 'Node.js, React, PostgreSQL, Docker, AWS, Redis', 200, 90, 10, '50% upfront']
  );

  // Insert demo projects
  const project1 = await run(
    'INSERT INTO projects (user_id, client_name, title, description, start_date, deadline, total_value, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, 'GreenLeaf Analytics', 'GreenLeaf Dashboard Suite', 'Full-stack development of analytics dashboard with real-time data visualization, custom reporting, and multi-tenant support.', '2026-01-15', '2026-04-30', 18000, 'in progress']
  );

  const project2 = await run(
    'INSERT INTO projects (user_id, client_name, title, description, start_date, deadline, total_value, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [userId, 'NovaFin Tech', 'NovaFin API Gateway', 'Design and implement a high-performance API gateway handling 50k req/s with authentication, rate limiting, and request transformation.', '2026-02-01', '2026-05-15', 22000, 'in progress']
  );

  // Insert milestones
  const milestones1 = [
    ['Project Setup & Architecture', '2026-01-22', 'complete'],
    ['Database Schema Design', '2026-02-05', 'complete'],
    ['API Development Phase 1', '2026-03-01', 'pending'],
    ['Frontend Dashboard Build', '2026-03-20', 'pending'],
    ['Integration & Testing', '2026-04-15', 'pending']
  ];
  for (const m of milestones1) {
    await run('INSERT INTO milestones (project_id, title, due_date, status) VALUES (?, ?, ?, ?)', [project1.lastID, m[0], m[1], m[2]]);
  }

  const milestones2 = [
    ['Requirements & Design', '2026-02-10', 'complete'],
    ['Core Gateway Implementation', '2026-03-15', 'pending'],
    ['Authentication & Rate Limiting', '2026-04-10', 'pending'],
    ['Performance Optimization', '2026-05-01', 'pending']
  ];
  for (const m of milestones2) {
    await run('INSERT INTO milestones (project_id, title, due_date, status) VALUES (?, ?, ?, ?)', [project2.lastID, m[0], m[1], m[2]]);
  }

  // Insert project notes
  await run('INSERT INTO project_notes (project_id, content) VALUES (?, ?)', [project1.lastID, 'Initial kickoff call completed. Client confirmed tech stack preferences.']);
  await run('INSERT INTO project_notes (project_id, content) VALUES (?, ?)', [project1.lastID, 'Schema design approved by client. Moving to API development phase.']);
  await run('INSERT INTO project_notes (project_id, content) VALUES (?, ?)', [project2.lastID, 'Architecture document shared with client for review.']);

  // Insert invoices
  await run('INSERT INTO invoices (project_id, amount, issued_date, payment_status) VALUES (?, ?, ?, ?)', [project1.lastID, 9000, '2026-01-20', 'paid']);
  await run('INSERT INTO invoices (project_id, amount, issued_date, payment_status) VALUES (?, ?, ?, ?)', [project1.lastID, 9000, '2026-03-01', 'unpaid']);
  await run('INSERT INTO invoices (project_id, amount, issued_date, payment_status) VALUES (?, ?, ?, ?)', [project2.lastID, 11000, '2026-02-05', 'paid']);
  await run('INSERT INTO invoices (project_id, amount, issued_date, payment_status) VALUES (?, ?, ?, ?)', [project2.lastID, 11000, '2026-04-01', 'unpaid']);

  console.log('Demo data seeded successfully.');
  console.log('Login with: demo@devhunt.com / demo1234');
}

async function initAndSeed() {
  try {
    await initTables();
    await seedData();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Export database interface
module.exports = {
  run,
  get,
  all,
  db
};
