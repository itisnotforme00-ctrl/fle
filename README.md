# DevHunt

A client hunting and freelance project management tool built for senior developers (backend, frontend, fullstack).

## Features

- **Lead Radar** — Track prospects from first contact to signed contract
- **Proposal Generator** — Create professional proposals with auto-generated scope, timeline, and cost breakdowns
- **Project Tracker** — Manage projects with milestones, notes, and invoicing
- **Rate Calculator** — Calculate optimal rates based on experience, stack, and region
- **Client CRM** — Organize contacts and track communication history
- **Revenue Dashboard** — Monitor estimated monthly revenue and pipeline

## Tech Stack

- Node.js + Express
- EJS (server-side rendering)
- Vanilla JS + CSS (no build tools)
- SQLite via better-sqlite3
- Sessions via express-session

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. The database auto-initializes on first run
#    A demo user with sample data is created automatically

# 4. Start the server
node server.js
```

The app will be running at `http://localhost:3000`

## Demo Login

- **Email:** `demo@devhunt.com`
- **Password:** `demo1234`

The demo account comes pre-loaded with:
- 3 sample leads (in various stages)
- 2 sample proposals
- 2 sample projects with milestones, notes, and invoices

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `SESSION_SECRET` | Session cookie secret | Random string |
| `DATABASE_PATH` | SQLite database file path | `./database/devhunt.db` |

## Project Structure

```
devhunt/
├── server.js              # Main Express app
├── package.json           # Dependencies
├── .env.example           # Environment template
├── database/
│   └── db.js              # Database init + seed
├── routes/
│   ├── auth.js            # Register/login/logout
│   ├── dashboard.js       # Dashboard stats
│   ├── leads.js           # Lead CRM
│   ├── proposals.js       # Proposal generator
│   ├── projects.js        # Project tracker
│   ├── calculator.js      # Rate calculator
│   └── profile.js         # User profile
├── middleware/
│   └── auth.js            # Auth middleware
├── views/                 # EJS templates
│   ├── layout.ejs         # Main layout
│   ├── landing.ejs        # Landing page
│   ├── auth/              # Login/register
│   ├── dashboard.ejs
│   ├── leads/
│   ├── proposals/
│   ├── projects/
│   ├── calculator.ejs
│   └── profile.ejs
└── public/
    ├── css/main.css       # All styles
    └── js/main.js         # Frontend JS
```

## Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing page | No |
| `/register` | Create account | No |
| `/login` | Sign in | No |
| `/logout` | End session | No |
| `/dashboard` | Overview + stats | Yes |
| `/leads` | Lead CRM | Yes |
| `/proposals` | Proposal list | Yes |
| `/proposals/new` | Create proposal | Yes |
| `/proposals/:id` | View proposal | Yes |
| `/projects` | Project list | Yes |
| `/projects/:id` | Project detail | Yes |
| `/calculator` | Rate calculator | Yes |
| `/profile` | Edit profile | Yes |

## Security

- Passwords hashed with bcrypt (salt rounds: 12)
- All database queries use parameterized statements
- Session-based authentication with middleware protection
- Session secret from environment variable
