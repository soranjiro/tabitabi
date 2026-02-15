#!/usr/bin/env node

const { default: lighthouse } = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function getScoreColor(score) {
  if (score >= 90) return COLORS.green;
  if (score >= 50) return COLORS.yellow;
  return COLORS.red;
}

function formatScore(score) {
  if (score === null || score === undefined) return 'N/A';
  return Math.round(score * 100);
}

async function runLighthouse(url, options = {}) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu'],
  });

  const config = {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: options.categories || ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: options.mobile ? 'mobile' : 'desktop',
      screenEmulation: options.mobile
        ? { mobile: true, width: 375, height: 667, deviceScaleFactor: 2 }
        : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 },
    },
  };

  const runnerResult = await lighthouse(url, {
    port: chrome.port,
    output: options.output || 'json',
  }, config);

  await chrome.kill();

  return runnerResult;
}

function printReport(result) {
  const { lhr } = result;
  const categories = lhr.categories;

  console.log(`\n${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log(`${COLORS.cyan}🔍 Lighthouse Report${COLORS.reset}`);
  console.log(`${COLORS.dim}   ${lhr.finalDisplayedUrl}${COLORS.reset}`);
  console.log(`${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);

  console.log(`\n${COLORS.bold}📊 Scores${COLORS.reset}`);

  for (const [key, category] of Object.entries(categories)) {
    const score = formatScore(category.score);
    const color = getScoreColor(category.score);
    const icon = {
      performance: '⚡',
      accessibility: '♿',
      'best-practices': '✅',
      seo: '🔍',
      pwa: '📱',
    }[key] || '📋';

    console.log(`   ${icon} ${category.title.padEnd(20)} ${color}${score}${COLORS.reset}/100`);
  }

  if (categories.performance) {
    const metrics = lhr.audits;
    console.log(`\n${COLORS.bold}⚡ Performance Metrics${COLORS.reset}`);

    const metricsToShow = [
      { key: 'first-contentful-paint', label: 'First Contentful Paint' },
      { key: 'largest-contentful-paint', label: 'Largest Contentful Paint' },
      { key: 'total-blocking-time', label: 'Total Blocking Time' },
      { key: 'cumulative-layout-shift', label: 'Cumulative Layout Shift' },
      { key: 'speed-index', label: 'Speed Index' },
    ];

    for (const { key, label } of metricsToShow) {
      if (metrics[key]) {
        const value = metrics[key].displayValue || 'N/A';
        const score = formatScore(metrics[key].score);
        const color = getScoreColor(metrics[key].score);
        console.log(`   ${label.padEnd(30)} ${color}${score}${COLORS.reset}/100  ${COLORS.dim}${value}${COLORS.reset}`);
      }
    }
  }

  console.log(`\n${COLORS.bold}💡 Recommendations${COLORS.reset}`);

  let hasIssues = false;
  for (const [key, category] of Object.entries(categories)) {
    if (category.score < 0.9) {
      hasIssues = true;
      console.log(`   ${COLORS.yellow}⚠ ${category.title}: Score ${formatScore(category.score)}/100${COLORS.reset}`);
    }
  }

  if (!hasIssues) {
    console.log(`   ${COLORS.green}✓ All scores are excellent!${COLORS.reset}`);
  }

  console.log('');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${COLORS.bold}Lighthouse Runner${COLORS.reset}
Run Lighthouse audits on your website.

${COLORS.bold}Usage:${COLORS.reset}
  node tools/run-lighthouse.js <url> [options]

${COLORS.bold}Options:${COLORS.reset}
  --mobile          Run with mobile emulation (default: desktop)
  --output <file>   Save HTML report to file
  --help, -h        Show this help

${COLORS.bold}Examples:${COLORS.reset}
  node tools/run-lighthouse.js http://localhost:5173
  node tools/run-lighthouse.js http://localhost:5173 --mobile
  node tools/run-lighthouse.js http://localhost:5173 --output report.html
`);
    process.exit(0);
  }

  const url = args.find((a) => a.startsWith('http'));
  if (!url) {
    console.error(`${COLORS.red}Error: Please provide a valid URL${COLORS.reset}`);
    process.exit(1);
  }

  const mobile = args.includes('--mobile');
  const outputIndex = args.indexOf('--output');
  const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;

  console.log(`${COLORS.bold}🚀 Running Lighthouse audit...${COLORS.reset}`);
  console.log(`   URL: ${url}`);
  console.log(`   Mode: ${mobile ? 'Mobile' : 'Desktop'}`);

  try {
    const result = await runLighthouse(url, {
      mobile,
      output: outputFile ? 'html' : 'json',
    });

    if (outputFile) {
      fs.writeFileSync(outputFile, result.report);
      console.log(`\n${COLORS.green}✓ Report saved to: ${outputFile}${COLORS.reset}`);
    }

    printReport(result);

    const avgScore = Object.values(result.lhr.categories).reduce(
      (sum, cat) => sum + (cat.score || 0),
      0
    ) / Object.keys(result.lhr.categories).length;

    process.exit(avgScore >= 0.9 ? 0 : 1);
  } catch (err) {
    console.error(`${COLORS.red}Error running Lighthouse: ${err.message}${COLORS.reset}`);
    process.exit(1);
  }
}

main();
