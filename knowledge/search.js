#!/usr/bin/env node
/**
 * Knowledge Base Search Utility
 * Search entries by keyword
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(process.env.HOME, '.openclaw/workspace/knowledge');
const ENTRIES_DIR = path.join(KNOWLEDGE_DIR, 'entries');
const INDEX_FILE = path.join(KNOWLEDGE_DIR, 'KEYWORD_INDEX.md');

function searchByKeyword(keyword) {
  if (!fs.existsSync(INDEX_FILE)) {
    return [];
  }
  
  const indexContent = fs.readFileSync(INDEX_FILE, 'utf8');
  const escapedKeyword = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp('^- `' + escapedKeyword + '`: (.+)$', 'm');
  const match = indexContent.match(pattern);
  
  if (!match) return [];
  
  const entryIds = match[1].match(/`([^`]+)`/g)?.map(s => s.slice(1, -1)) || [];
  
  return entryIds.map(id => {
    const filePath = path.join(ENTRIES_DIR, `${id}.md`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const frontmatter = content.match(/---\n([\s\S]*?)\n---/);
      if (frontmatter) {
        const meta = {};
        frontmatter[1].split('\n').forEach(line => {
          const [key, ...value] = line.split(':');
          if (key && value.length) {
            meta[key.trim()] = value.join(':').trim().replace(/^"|"$/g, '');
          }
        });
        return { id, ...meta };
      }
    }
    return null;
  }).filter(Boolean);
}

function searchByText(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const results = new Map();
  
  for (const word of words) {
    const entries = searchByKeyword(word);
    for (const entry of entries) {
      results.set(entry.id, entry);
    }
  }
  
  return Array.from(results.values());
}

function listAllEntries() {
  if (!fs.existsSync(ENTRIES_DIR)) return [];
  
  return fs.readdirSync(ENTRIES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(ENTRIES_DIR, f), 'utf8');
      const frontmatter = content.match(/---\n([\s\S]*?)\n---/);
      if (frontmatter) {
        const meta = { id: f.replace('.md', '') };
        frontmatter[1].split('\n').forEach(line => {
          const [key, ...value] = line.split(':');
          if (key && value.length && !key.startsWith('  -')) {
            meta[key.trim()] = value.join(':').trim().replace(/^"|"$/g, '');
          }
        });
        return meta;
      }
      return null;
    })
    .filter(Boolean);
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'keyword' && args[1]) {
    const results = searchByKeyword(args[1]);
    console.log(JSON.stringify(results, null, 2));
  } else if (command === 'text' && args[1]) {
    const results = searchByText(args.slice(1).join(' '));
    console.log(JSON.stringify(results, null, 2));
  } else if (command === 'list') {
    const results = listAllEntries();
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('Usage:');
    console.log('  search.js keyword <keyword>');
    console.log('  search.js text <search text>');
    console.log('  search.js list');
  }
}

module.exports = { searchByKeyword, searchByText, listAllEntries };
