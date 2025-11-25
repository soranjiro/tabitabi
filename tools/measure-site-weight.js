#!/usr/bin/env node

const http = require("http");
const https = require("https");
const { URL } = require("url");
const zlib = require("zlib");

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatTime(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getScoreColor(score) {
  if (score >= 90) return COLORS.green;
  if (score >= 50) return COLORS.yellow;
  return COLORS.red;
}

function calculateScore(totalSize, requestCount, loadTime) {
  let score = 100;

  if (totalSize > 500 * 1024) score -= 20;
  else if (totalSize > 200 * 1024) score -= 10;
  else if (totalSize > 100 * 1024) score -= 5;

  if (requestCount > 50) score -= 20;
  else if (requestCount > 20) score -= 10;
  else if (requestCount > 10) score -= 5;

  if (loadTime > 3000) score -= 20;
  else if (loadTime > 1000) score -= 10;
  else if (loadTime > 500) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function fetchUrl(urlString, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const parsedUrl = new URL(urlString);
    const protocol = parsedUrl.protocol === "https:" ? https : http;

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      headers: {
        "User-Agent": "SiteWeightMeasurer/1.0",
        "Accept-Encoding": "gzip, deflate",
        Accept: "*/*",
        ...options.headers,
      },
      timeout: options.timeout || 30000,
    };

    const req = protocol.request(requestOptions, (res) => {
      const chunks = [];
      let decodedSize = 0;

      const encoding = res.headers["content-encoding"];
      let stream = res;

      if (encoding === "gzip") {
        stream = res.pipe(zlib.createGunzip());
      } else if (encoding === "deflate") {
        stream = res.pipe(zlib.createInflate());
      }

      stream.on("data", (chunk) => {
        chunks.push(chunk);
        decodedSize += chunk.length;
      });

      stream.on("end", () => {
        const endTime = Date.now();
        const rawSize = parseInt(res.headers["content-length"] || "0", 10);

        resolve({
          url: urlString,
          statusCode: res.statusCode,
          headers: res.headers,
          contentType: res.headers["content-type"] || "unknown",
          transferSize: rawSize || decodedSize,
          decodedSize,
          compressed: !!encoding,
          loadTime: endTime - startTime,
          body: Buffer.concat(chunks).toString("utf-8"),
        });
      });

      stream.on("error", reject);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timeout: ${urlString}`));
    });

    req.on("error", reject);
    req.end();
  });
}

function extractResources(html, baseUrl) {
  const resources = [];
  const base = new URL(baseUrl);

  const patterns = [
    { regex: /<link[^>]+href=["']([^"']+)["'][^>]*>/gi, type: "stylesheet" },
    { regex: /<script[^>]+src=["']([^"']+)["'][^>]*>/gi, type: "script" },
    { regex: /<img[^>]+src=["']([^"']+)["'][^>]*>/gi, type: "image" },
    { regex: /url\(["']?([^"')]+)["']?\)/gi, type: "css-resource" },
  ];

  for (const { regex, type } of patterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const resourceUrl = new URL(match[1], base).href;
        if (!resources.some((r) => r.url === resourceUrl)) {
          resources.push({ url: resourceUrl, type });
        }
      } catch {
        // skip invalid URLs
      }
    }
  }

  return resources;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const base = new URL(baseUrl);
  const regex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi;

  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const linkUrl = new URL(match[1], base);
      if (
        linkUrl.origin === base.origin &&
        linkUrl.pathname.match(/\.(html?|php|asp|jsp)?$/i) &&
        !links.includes(linkUrl.href)
      ) {
        links.push(linkUrl.href);
      }
    } catch {
      // skip invalid URLs
    }
  }

  return links;
}

async function measurePage(url) {
  const result = {
    url,
    html: null,
    resources: [],
    totalSize: 0,
    totalDecodedSize: 0,
    requestCount: 0,
    loadTime: 0,
    errors: [],
  };

  try {
    const htmlResponse = await fetchUrl(url);
    result.html = htmlResponse;
    result.totalSize += htmlResponse.transferSize;
    result.totalDecodedSize += htmlResponse.decodedSize;
    result.requestCount++;
    result.loadTime = htmlResponse.loadTime;

    const resources = extractResources(htmlResponse.body, url);

    const resourcePromises = resources.map(async (resource) => {
      try {
        const response = await fetchUrl(resource.url);
        return {
          ...resource,
          transferSize: response.transferSize,
          decodedSize: response.decodedSize,
          loadTime: response.loadTime,
          compressed: response.compressed,
          statusCode: response.statusCode,
        };
      } catch (err) {
        result.errors.push(`Failed to fetch ${resource.url}: ${err.message}`);
        return { ...resource, transferSize: 0, decodedSize: 0, failed: true };
      }
    });

    const resourceResults = await Promise.all(resourcePromises);

    for (const resource of resourceResults) {
      result.resources.push(resource);
      result.totalSize += resource.transferSize;
      result.totalDecodedSize += resource.decodedSize;
      result.requestCount++;
      result.loadTime = Math.max(result.loadTime, resource.loadTime || 0);
    }
  } catch (err) {
    result.errors.push(`Failed to fetch page: ${err.message}`);
  }

  return result;
}

function printPageReport(pageResult, verbose = false) {
  const { url, html, resources, totalSize, totalDecodedSize, requestCount, loadTime, errors } =
    pageResult;
  const score = calculateScore(totalSize, requestCount, loadTime);
  const scoreColor = getScoreColor(score);

  console.log(`\n${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log(`${COLORS.cyan}📄 ${url}${COLORS.reset}`);
  console.log(`${COLORS.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);

  console.log(`\n${COLORS.bold}📊 Overall Score: ${scoreColor}${score}/100${COLORS.reset}`);

  console.log(`\n${COLORS.bold}📈 Summary${COLORS.reset}`);
  console.log(`   Total Size (transfer):  ${formatBytes(totalSize)}`);
  console.log(`   Total Size (decoded):   ${formatBytes(totalDecodedSize)}`);
  console.log(`   Request Count:          ${requestCount}`);
  console.log(`   Load Time:              ${formatTime(loadTime)}`);

  if (html) {
    console.log(`\n${COLORS.bold}📄 HTML${COLORS.reset}`);
    console.log(`   Size: ${formatBytes(html.decodedSize)}`);
    console.log(`   Compressed: ${html.compressed ? "Yes ✓" : "No"}`);
  }

  const byType = {};
  for (const r of resources) {
    const type = r.type || "other";
    if (!byType[type]) byType[type] = { count: 0, size: 0 };
    byType[type].count++;
    byType[type].size += r.decodedSize;
  }

  if (Object.keys(byType).length > 0) {
    console.log(`\n${COLORS.bold}📦 Resources by Type${COLORS.reset}`);
    for (const [type, data] of Object.entries(byType)) {
      console.log(`   ${type}: ${data.count} files (${formatBytes(data.size)})`);
    }
  }

  if (verbose && resources.length > 0) {
    console.log(`\n${COLORS.bold}📋 Resource Details${COLORS.reset}`);
    const sorted = [...resources].sort((a, b) => b.decodedSize - a.decodedSize);
    for (const r of sorted.slice(0, 20)) {
      const status = r.failed ? "❌" : "✓";
      const size = formatBytes(r.decodedSize).padStart(10);
      const shortUrl = r.url.length > 50 ? "..." + r.url.slice(-47) : r.url;
      console.log(`   ${status} ${size}  ${shortUrl}`);
    }
    if (sorted.length > 20) {
      console.log(`   ${COLORS.dim}... and ${sorted.length - 20} more${COLORS.reset}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n${COLORS.yellow}⚠️  Errors (${errors.length})${COLORS.reset}`);
    for (const err of errors.slice(0, 5)) {
      console.log(`   ${err}`);
    }
  }

  console.log(`\n${COLORS.bold}💡 Recommendations${COLORS.reset}`);
  if (totalSize > 200 * 1024) {
    console.log(`   ${COLORS.yellow}⚠ Total size exceeds 200KB. Consider optimizing.${COLORS.reset}`);
  }
  if (requestCount > 20) {
    console.log(`   ${COLORS.yellow}⚠ Many requests (${requestCount}). Consider bundling.${COLORS.reset}`);
  }
  if (html && !html.compressed) {
    console.log(`   ${COLORS.yellow}⚠ Enable gzip compression for HTML.${COLORS.reset}`);
  }
  const uncompressedResources = resources.filter((r) => !r.compressed && r.decodedSize > 1024);
  if (uncompressedResources.length > 0) {
    console.log(
      `   ${COLORS.yellow}⚠ ${uncompressedResources.length} resources not compressed.${COLORS.reset}`
    );
  }

  const largeImages = resources.filter(
    (r) => r.type === "image" && r.decodedSize > 100 * 1024
  );
  if (largeImages.length > 0) {
    console.log(
      `   ${COLORS.yellow}⚠ ${largeImages.length} large images (>100KB). Consider optimizing.${COLORS.reset}`
    );
  }

  if (score >= 90) {
    console.log(`   ${COLORS.green}✓ Great job! Site is lightweight.${COLORS.reset}`);
  }

  return { url, score, totalSize, requestCount, loadTime };
}

function printSummaryReport(results) {
  console.log(`\n${COLORS.bold}══════════════════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.bold}                 FINAL SUMMARY                     ${COLORS.reset}`);
  console.log(`${COLORS.bold}══════════════════════════════════════════════════${COLORS.reset}`);

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const totalSize = results.reduce((sum, r) => sum + r.totalSize, 0);
  const avgSize = totalSize / results.length;
  const totalRequests = results.reduce((sum, r) => sum + r.requestCount, 0);

  const scoreColor = getScoreColor(avgScore);

  console.log(`\n   Pages Analyzed:    ${results.length}`);
  console.log(`   Average Score:     ${scoreColor}${avgScore.toFixed(1)}/100${COLORS.reset}`);
  console.log(`   Total Size:        ${formatBytes(totalSize)}`);
  console.log(`   Average Page Size: ${formatBytes(avgSize)}`);
  console.log(`   Total Requests:    ${totalRequests}`);

  console.log(`\n${COLORS.bold}📊 Page Rankings (by score)${COLORS.reset}`);
  const sorted = [...results].sort((a, b) => b.score - a.score);
  for (const r of sorted) {
    const color = getScoreColor(r.score);
    const shortUrl = r.url.length > 40 ? "..." + r.url.slice(-37) : r.url;
    console.log(`   ${color}${r.score.toString().padStart(3)}/100${COLORS.reset}  ${shortUrl}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
${COLORS.bold}Site Weight Measurer${COLORS.reset}
Measure how lightweight your website is.

${COLORS.bold}Usage:${COLORS.reset}
  node measure-site-weight.js <url> [options]

${COLORS.bold}Options:${COLORS.reset}
  --depth <n>    Crawl depth (default: 0, only measure given URL)
  --verbose, -v  Show detailed resource list
  --help, -h     Show this help

${COLORS.bold}Examples:${COLORS.reset}
  node measure-site-weight.js http://localhost:3000
  node measure-site-weight.js http://localhost:3000 --depth 1 -v
  node measure-site-weight.js https://example.com --depth 2
`);
    process.exit(0);
  }

  const url = args.find((a) => a.startsWith("http"));
  if (!url) {
    console.error(`${COLORS.red}Error: Please provide a valid URL${COLORS.reset}`);
    process.exit(1);
  }

  const depthIndex = args.indexOf("--depth");
  const depth = depthIndex !== -1 ? parseInt(args[depthIndex + 1], 10) || 0 : 0;
  const verbose = args.includes("--verbose") || args.includes("-v");

  console.log(`${COLORS.bold}🔍 Measuring site weight...${COLORS.reset}`);
  console.log(`   URL: ${url}`);
  console.log(`   Depth: ${depth}`);

  const visited = new Set();
  const results = [];
  const queue = [{ url, currentDepth: 0 }];

  while (queue.length > 0) {
    const { url: currentUrl, currentDepth } = queue.shift();

    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    console.log(`\n${COLORS.dim}Analyzing: ${currentUrl}${COLORS.reset}`);

    const pageResult = await measurePage(currentUrl);
    const summary = printPageReport(pageResult, verbose);
    results.push(summary);

    if (currentDepth < depth && pageResult.html) {
      const links = extractLinks(pageResult.html.body, currentUrl);
      for (const link of links) {
        if (!visited.has(link)) {
          queue.push({ url: link, currentDepth: currentDepth + 1 });
        }
      }
    }
  }

  if (results.length > 1) {
    printSummaryReport(results);
  }

  console.log(`\n${COLORS.dim}Done.${COLORS.reset}\n`);
}

main().catch((err) => {
  console.error(`${COLORS.red}Error: ${err.message}${COLORS.reset}`);
  process.exit(1);
});
