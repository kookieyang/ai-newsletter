#!/usr/bin/env node
/**
 * Knowledge Base Clip Command
 * Usage: /clip <url or text>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KNOWLEDGE_DIR = path.join(process.env.HOME, '.openclaw/workspace/knowledge');
const ENTRIES_DIR = path.join(KNOWLEDGE_DIR, 'entries');
const INDEX_FILE = path.join(KNOWLEDGE_DIR, 'KEYWORD_INDEX.md');

function generateId(title) {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 30)
    .replace(/-+$/, '');
  return `${timestamp}-${slug}`;
}

function extractKeywords(text, title) {
  // Simple keyword extraction - in practice this would use LLM
  const combined = `${title} ${text}`.toLowerCase();
  const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
  
  const words = combined
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !commonWords.has(w));
  
  const freq = {};
  words.forEach(w => freq[w] = (freq[w] || 0) + 1);
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

function updateKeywordIndex(entryId, keywords) {
  let indexContent = fs.readFileSync(INDEX_FILE, 'utf8');
  
  for (const keyword of keywords) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp('^- `' + escapedKeyword + '`:.*$', 'm');
    if (pattern.test(indexContent)) {
      // Add to existing keyword
      indexContent = indexContent.replace(
        pattern,
        match => match + ', `' + entryId + '`'
      );
    } else {
      // Create new keyword entry
      indexContent += '- `' + keyword + '`: `' + entryId + '`\n';
    }
  }
  
  fs.writeFileSync(INDEX_FILE, indexContent);
}

function updateStats() {
  const statsPath = path.join(KNOWLEDGE_DIR, 'stats.json');
  let stats = { totalEntries: 0, lastUpdated: new Date().toISOString() };
  
  if (fs.existsSync(statsPath)) {
    stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  }
  
  const entries = fs.readdirSync(ENTRIES_DIR).filter(f => f.endsWith('.md'));
  stats.totalEntries = entries.length;
  stats.lastUpdated = new Date().toISOString();
  
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  
  // Update index header
  let indexContent = fs.readFileSync(INDEX_FILE, 'utf8');
  indexContent = indexContent.replace(
    /Total Entries: \d+/,
    `Total Entries: ${stats.totalEntries}`
  );
  indexContent = indexContent.replace(
    /Last Updated: .*/,
    `Last Updated: ${new Date().toISOString().split('T')[0]}`
  );
  fs.writeFileSync(INDEX_FILE, indexContent);
}

async function clip(content, title, source = '') {
  // Ensure directories exist
  if (!fs.existsSync(ENTRIES_DIR)) {
    fs.mkdirSync(ENTRIES_DIR, { recursive: true });
  }
  
  const entryId = generateId(title);
  const keywords = extractKeywords(content, title);
  
  const entry = `---
id: ${entryId}
title: "${title.replace(/"/g, '\\"')}"
source: "${source.replace(/"/g, '\\"')}"
date_added: "${new Date().toISOString()}"
keywords:
${keywords.map(k => `  - ${k}`).join('\n')}
entry_type: clip
---

# ${title}

**Source:** ${source || 'Direct input'}
**Added:** ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}

## Content

${content}
`;

  const filePath = path.join(ENTRIES_DIR, `${entryId}.md`);
  fs.writeFileSync(filePath, entry);
  
  updateKeywordIndex(entryId, keywords);
  updateStats();
  
  return {
    id: entryId,
    title,
    keywords,
    path: filePath
  };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const content = args.join(' ');
  
  if (!content) {
    console.error('Usage: clip.js <content>');
    process.exit(1);
  }
  
  // Check if it's a URL
  const isUrl = /^https?:\/\//.test(content);
  const title = isUrl ? 'Clipped content' : content.slice(0, 50) + (content.length > 50 ? '...' : '');
  
  clip(content, title, isUrl ? content : '').then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}

module.exports = { clip, extractKeywords };
