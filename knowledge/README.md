# Knowledge Base System

Personal knowledge base for Louis with keyword indexing and contextual retrieval.

## Storage Structure

```
~/.openclaw/workspace/knowledge/
├── entries/
│   └── YYYY-MM-DD-HH-MM-SS-{slug}.md    # Individual entries
├── indexes/
│   └── KEYWORD_INDEX.md                  # Keyword → entry mappings
└── stats.json                            # Usage statistics
```

## Entry Format

Each entry is a markdown file with YAML frontmatter:

```yaml
---
id: 2026-02-27-19-35-12-example-title
title: "Human-readable title"
source: "URL or text description"
date_added: "2026-02-27T19:35:12+08:00"
keywords:
  - keyword1
  - keyword2
  - keyword3
entry_type: "clip" | "read"
summary: "Brief summary if /read was used"
---

Full content of the clipped or summarized material.
```

## Commands

### /clip
Store content directly to knowledge base with keyword extraction.

**Usage:**
```
/clip https://example.com/article
[or paste text directly after /clip]
```

**What happens:**
1. Extract/fetch content
2. Generate 5-10 relevant keywords
3. Create entry file
4. Update keyword index
5. Confirm storage with entry ID

### /read
Summarize content first, then store to knowledge base.

**Usage:**
```
/read https://example.com/long-article
[or paste text directly after /read]
```

**What happens:**
1. Extract/fetch content
2. Generate concise summary (3-5 bullet points)
3. Present summary to user
4. Generate keywords
5. Create entry with summary
6. Update keyword index

## Context Retrieval

During conversations, Amy will:
1. Monitor for keywords that match indexed entries
2. Silently retrieve relevant entries (if confidence > 0.7)
3. Include relevant context in responses naturally

## Manual Access

List all entries:
```bash
ls -la ~/.openclaw/workspace/knowledge/entries/
```

Search entries:
```bash
grep -r "keyword" ~/.openclaw/workspace/knowledge/entries/
```

View index:
```bash
cat ~/.openclaw/workspace/knowledge/KEYWORD_INDEX.md
```
