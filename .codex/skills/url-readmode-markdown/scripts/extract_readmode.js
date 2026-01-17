#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const TurndownService = require("turndown");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/120.0 Safari/537.36";

function sanitizeFilename(title, maxLen = 120) {
  let cleaned = (title || "").trim();
  cleaned = cleaned.replace(/[\\/:*?"<>|]/g, "-");
  cleaned = cleaned.replace(/\s+/g, "_");
  if (!cleaned) cleaned = "readmode";
  return cleaned.slice(0, maxLen).trim();
}

function ensureUniquePath(targetPath) {
  if (!fs.existsSync(targetPath)) return targetPath;
  const ext = path.extname(targetPath);
  const base = targetPath.slice(0, -ext.length);
  for (let i = 1; i < 1000; i += 1) {
    const candidate = `${base}-${i}${ext}`;
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Unable to find a unique output filename");
}

function parseArgs(argv) {
  const args = {
    url: null,
    outputDir: ".",
    title: "",
  };

  const rest = argv.slice(2);
  if (rest.length === 0) {
    throw new Error("Usage: extract_readmode.js <url> [-o <output-dir>] [--title <title>]");
  }

  args.url = rest[0];
  for (let i = 1; i < rest.length; i += 1) {
    const value = rest[i];
    if (value === "-o" || value === "--output-dir") {
      i += 1;
      args.outputDir = rest[i] || ".";
    } else if (value === "--title") {
      i += 1;
      args.title = rest[i] || "";
    }
  }

  return args;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function main() {
  const { url, outputDir, title } = parseArgs(process.argv);
  fs.mkdirSync(outputDir, { recursive: true });

  const html = await fetchHtml(url);
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.content) {
    throw new Error("Readability extraction returned empty output");
  }

  const turndown = new TurndownService({ headingStyle: "atx" });
  const markdown = turndown.turndown(article.content).trim();

  const fileTitle = (title || "").trim() || article.title || "";
  const filename = sanitizeFilename(fileTitle);
  const outputPath = ensureUniquePath(path.join(outputDir, `${filename}.md`));

  fs.writeFileSync(outputPath, `${markdown}\n`, "utf8");
  console.log(outputPath);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
