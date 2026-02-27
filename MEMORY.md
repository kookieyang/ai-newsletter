# MEMORY.md — Long-Term Memory

_Last updated: 2026-02-27_

---

## 🔗 Permanent Portal

**GitHub Pages (always live):**
https://kookieyang.github.io/ai-newsletter/

What's there:
- Task Board — completed & pending tasks
- AI Daily Brief newsletters
- Knowledge base entries

---

## 📰 AI Daily Newsletter System

**Status:** Active, runs automatically
**Schedule:** Every day at 10:00 AM SGT
**Cron ID:** `3e4daa13-1739-4319-8488-982dd4ea4f6e`

What it does:
1. Searches for AI news (US, China, Global)
2. Picks 10-15 top stories
3. Generates dark-theme HTML newsletter
4. Saves to `ai-newsletter-YYYY-MM-DD.html`
5. Adds entry to portal with date in title
6. Announces completion on WhatsApp

Current newsletters:
- Feb 26, 2026 — 15 stories
- Feb 27, 2026 — 14 stories

---

## 📋 Task Board

**Location:** https://kookieyang.github.io/ai-newsletter/task-board.html
**Data file:** `tasks.json` (auto-updated)

Tracks:
- Completed tasks (with details & timestamps)
- Pending tasks (with priority & blockers)

Recent completed:
1. AI Newsletter System (Feb 26)
2. Portal & GitHub Pages setup (Feb 26)
3. Skills installation: find-skills, skill-creator, suno-music-creator (Feb 27)
4. Knowledge base /clip system (Feb 27)
5. Task Board UI (Feb 27)

Pending:
- Extract WeChat article (need browser attach)
- Compose Suno song (need Louis preferences)
- Install Gemini video skill

---

## 📚 Knowledge Base (/clip & /read)

**Storage:** `knowledge/entries/YYYY-MM-DD-HH-MM-SS-{slug}.md`
**Index:** `knowledge/KEYWORD_INDEX.md`

First entry:
- ID: `2026-02-27-19-42-38-ai-game-entrepreneurs`
- Source: 晚点AI WeChat article
- Status: Partial (WeChat JS protection blocked full fetch)
- Needs: Browser attach to complete

Commands:
- `/clip [URL/text]` — Quick save
- `/read [URL/text]` — Summarize then save

---

## 🛠️ Installed Skills

| Skill | Purpose | Status |
|-------|---------|--------|
| `find-skills` | Discover new skills from ecosystem | Ready |
| `skill-creator` | Build custom skills | Ready |
| `suno-music-creator` | AI music composition via Suno | Ready, needs browser |
| `nano-banana-pro` | Gemini image generation | Ready |
| `openai-image-gen` | OpenAI image generation | Ready |

---

## ⚠️ Known Issues

1. **Session isolation** — WhatsApp vs laptop sessions don't share history
   - Workaround: Read this file + tasks.json on every new session
   - Long-term fix: Session bridge (under consideration)

2. **WeChat articles** — JavaScript protection prevents full fetch
   - Requires: Browser attach + manual extraction

3. **Localtunnel** — Temporary, dies when laptop sleeps
   - Solution: Use GitHub Pages URL (permanent)

---

## 📱 Contact Channels

- **WhatsApp:** +6583463780 (primary, always on)
- **Laptop:** Web chat (when at desk)
- **Timezone:** Asia/Singapore (GMT+8)

---

## 🎯 Active Projects

1. **Daily AI Newsletter** — automated, monitoring
2. **Knowledge base** — building up clips/reads
3. **Task tracking** — using Task Board

---

_This file is read at the start of every session. Keep it current._
