# Knowledge Base Skills

Commands: `/clip` and `/read`

## Usage

### /clip - Quick Save
Store content immediately with keyword indexing.

```
/clip https://interesting-article.com
```

Or paste text:
```
/clip This is an interesting insight I just learned about AI...
```

**Response:** Entry ID + keywords extracted

### /read - Summarize Then Save
Get a summary first, then store to knowledge base.

```
/read https://long-article.com
```

Or paste text:
```
/read [long text you want summarized]
```

**Response:** Summary + confirm storage

## How It Works

### /clip Flow
1. Detect `/clip` command
2. Fetch content (if URL) or use provided text
3. Extract 5-10 keywords using frequency analysis
4. Create entry file in `knowledge/entries/`
5. Update `KEYWORD_INDEX.md`
6. Confirm with entry ID

### /read Flow
1. Detect `/read` command
2. Fetch content (if URL) or use provided text
3. Generate 3-5 bullet point summary using LLM
4. Show summary to user
5. Extract keywords
6. Create entry with summary
7. Update index
8. Confirm storage

### Context Retrieval
When you discuss topics, Amy will:
1. Check if any keywords match the knowledge base
2. If match confidence > 0.7, silently read relevant entries
3. Include relevant insights naturally in responses

## Storage Location

```
~/.openclaw/workspace/knowledge/
├── entries/           # Individual entries
├── indexes/           # Search indexes
├── KEYWORD_INDEX.md   # Keyword mappings
└── stats.json         # Usage stats
```

## Manual Search

Find entries by keyword:
```bash
grep -r "keyword" ~/.openclaw/workspace/knowledge/entries/
```

View index:
```bash
cat ~/.openclaw/workspace/knowledge/KEYWORD_INDEX.md
```

List all entries:
```bash
ls -la ~/.openclaw/workspace/knowledge/entries/
```
