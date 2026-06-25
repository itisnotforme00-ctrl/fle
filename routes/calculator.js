const express = require('express');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Rate calculation logic
function calculateRate(years, role, stack, region, workType) {
  // Base rate matrix by role + region (USD/hour)
  const baseRates = {
    'backend': {
      'North America': 75, 'Europe': 55, 'Southeast Asia': 30, 
      'South Asia': 25, 'LatAm': 35, 'Africa': 28
    },
    'frontend': {
      'North America': 70, 'Europe': 50, 'Southeast Asia': 28, 
      'South Asia': 22, 'LatAm': 32, 'Africa': 25
    },
    'fullstack': {
      'North America': 85, 'Europe': 60, 'Southeast Asia': 35, 
      'South Asia': 28, 'LatAm': 40, 'Africa': 32
    }
  };

  // Stack premium multipliers
  const stackPremiums = {
    'Node.js': 1.05, 'React': 1.05, 'Python': 1.08, 'Go': 1.12, 'Rust': 1.15,
    'PostgreSQL': 1.04, 'AWS': 1.10, 'Docker': 1.06, 'Kubernetes': 1.12,
    'TypeScript': 1.04, 'GraphQL': 1.06, 'Redis': 1.03, 'MongoDB': 1.02,
    'React Native': 1.05, 'Vue.js': 1.03, 'Angular': 1.03, 'Java': 1.04,
    'PHP': 0.95, 'WordPress': 0.90, 'Laravel': 1.02, 'Django': 1.05,
    'Flask': 1.03, 'Spring Boot': 1.05, 'Terraform': 1.10, 'CI/CD': 1.06
  };

  // Work type multipliers
  const workTypeMultipliers = {
    'freelance': 1.0, 'contract': 1.15, 'consulting': 1.25
  };

  // XP modifiers
  const xpModifier = 1 + ((years - 1) * 0.04); // 4% per year of experience

  // Get base rate
  const roleBase = baseRates[role] || baseRates['fullstack'];
  const regionBase = roleBase[region] || roleBase['North America'];
  const baseRate = regionBase * xpModifier * (workTypeMultipliers[workType] || 1.0);

  // Calculate stack premium
  const selectedStacks = Array.isArray(stack) ? stack : (stack ? [stack] : []);
  let stackMultiplier = 1.0;
  for (const s of selectedStacks) {
    stackMultiplier += (stackPremiums[s] || 1.0) - 1.0;
  }
  // Cap stack premium at 1.5x
  stackMultiplier = Math.min(stackMultiplier, 1.5);

  const finalRate = Math.round(baseRate * stackMultiplier);
  const minRate = Math.round(finalRate * 0.85);
  const maxRate = Math.round(finalRate * 1.20);

  // Monthly estimates
  const monthly20 = Math.round(finalRate * 20 * 4.33); // 20 hrs/week
  const monthly40 = Math.round(finalRate * 40 * 4.33); // 40 hrs/week

  // Negotiation tips based on region + role
  const tips = getNegotiationTips(region, role);

  // Upwork comparison (simplified averages)
  const upworkAvg = getUpworkAverage(role);

  return {
    minRate,
    maxRate,
    recommendedRate: finalRate,
    monthly20,
    monthly40,
    tips,
    upworkAvg,
    vsUpwork: ((finalRate - upworkAvg) / upworkAvg * 100).toFixed(0)
  };
}

function getUpworkAverage(role) {
  const averages = { 'backend': 45, 'frontend': 40, 'fullstack': 50 };
  return averages[role] || 45;
}

function getNegotiationTips(region, role) {
  const tips = {
    'North America': [
      'Emphasize value-based pricing over hourly rates. Enterprise clients in NA expect ROI justification.',
      'Highlight compliance expertise (SOC2, HIPAA) if relevant — it commands 30%+ premium.',
      'Use previous project outcomes and metrics to justify premium rates.'
    ],
    'Europe': [
      'GDPR and data privacy expertise is highly valued — mention it explicitly in rate discussions.',
      'European clients appreciate detailed scope documents; use them to justify fixed-rate premiums.',
      'Consider billing in EUR if working with EU clients to reduce currency friction.'
    ],
    'Southeast Asia': [
      'Regional startups are price-sensitive but speed-hungry — emphasize rapid delivery capability.',
      'Local currency billing reduces client hesitation about forex costs.',
      'Portfolio of similar regional projects builds immediate trust for rate negotiations.'
    ],
    'South Asia': [
      'Differentiate from low-cost competition by specializing in niche, high-value technologies.',
      'Offer retainer models instead of pure hourly to create predictable revenue.',
      'International client experience is a strong differentiator — highlight it prominently.'
    ],
    'LatAm': [
      'Time zone alignment with US clients is a major advantage — price it accordingly.',
      'Bilingual capability (English/Spanish/Portuguese) commands a significant premium.',
      'Nearshore positioning allows you to charge 70-80% of US rates while being highly competitive.'
    ],
    'Africa': [
      'Focus on remote-work infrastructure reliability to reduce client concerns.',
      'Specialize in globally-in-demand stacks to compete on the international market.',
      'Building a strong GitHub presence and open-source contributions accelerates rate growth.'
    ]
  };

  const regionTips = tips[region] || tips['North America'];
  
  const roleTip = role === 'backend' 
    ? 'Backend scalability and architecture expertise is in high demand — never undersell system design skills.'
    : role === 'frontend'
    ? 'UI/UX sensibility combined with technical frontend skills commands higher rates than pure implementation.'
    : 'Fullstack developers who can own entire features end-to-end are among the highest-paid freelancers.';

  return [regionTips[0], roleTip, regionTips[2]];
}

// GET /calculator
router.get('/', requireAuth, (req, res) => {
  res.render('calculator', { 
    title: 'Rate Calculator', 
    result: null,
    form: {}
  });
});

// POST /calculator
router.post('/', requireAuth, (req, res) => {
  const { years, role, stack, region, work_type } = req.body;
  
  const result = calculateRate(
    parseInt(years) || 1,
    role || 'fullstack',
    stack || [],
    region || 'North America',
    work_type || 'freelance'
  );

  res.render('calculator', {
    title: 'Rate Calculator',
    result,
    form: req.body
  });
});

module.exports = router;
