# WebChat UI Enhancement — Design Document

**Date:** 2026-02-28  
**Status:** Draft — Pending Review

---

## 1. Overview

Enhance the WebChat interface to support rich media messaging (images, voice, video) and improve text input UX.

---

## 2. Requirements Breakdown

| # | Requirement | Priority |
|---|-------------|----------|
| 1 | Send pictures, voice, video to AI | High |
| 2 | Mixed text + media in one message (e.g., screenshot + bug description) | High |
| 3 | Enter = new line, Ctrl+Enter = send | High |
| 4 | Voice message type (record & send audio) | Medium |

---

## 3. Design Approach

### 3.1 Architecture

```
┌─────────────────────────────────────────┐
│           Message Input Area            │
├─────────────────────────────────────────┤
│  [📎] [🎤] [🎥]  │  Text Area          │
│  Attachment      │  (multi-line)       │
│  Buttons         │                     │
│                  │  Ctrl+Enter to send │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Message Composition             │
├─────────────────────────────────────────┤
│  {                                      │
│    text: "bug description here",        │
│    attachments: [                       │
│      { type: "image", data: base64 },   │
│      { type: "video", url: blob }       │
│    ],                                   │
│    voice: { duration: 5s, blob: ... }   │
│  }                                      │
└─────────────────────────────────────────┘
```

### 3.2 Input Mode: Unified Composer

Instead of separate modes, use a **unified composer** where:
- Text area accepts multi-line input (textarea, not input)
- Attachments are previewed above/below the text area
- Voice recording happens inline (hold-to-record or click-to-record)

### 3.3 Keyboard Behavior

```
┌─────────────────────────────────────┐
│  When focus is in text area:        │
│                                     │
│  Enter        → Insert newline      │
│  Shift+Enter  → Insert newline      │
│  Ctrl+Enter   → Send message        │
│  Cmd+Enter    → Send message (Mac)  │
│                                     │
│  Visual hint below input:           │
│  "Ctrl+Enter to send"               │
└─────────────────────────────────────┘
```

---

## 4. UI Layout Draft

### 4.1 Input Bar (Bottom)

```
┌────────────────────────────────────────────────────────────┐
│  ┌─────┐ ┌─────┐ ┌─────┐  ┌──────────────────────────┐  ┌────┐  │
│  │ 📎  │ │ 🎤  │ │ 🎥  │  │  Type your message...    │  │ ➤  │  │
│  │File │ │Voice│ │Video│  │  (supports multi-line)   │  │Send│  │
│  └─────┘ └─────┘ └─────┘  │                          │  └────┘  │
│                           │  Ctrl+Enter to send ↵    │          │
│                           └──────────────────────────┘          │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Attachment Preview (Above Input)

When files are selected:

```
┌────────────────────────────────────────────────────────────┐
│  📎 Attachments (2):                                       │
│  ┌──────────┐ ┌──────────┐                                 │
│  │ 🖼️       │ │ 🎬       │  [x] [x] ← remove buttons      │
│  │ screenshot│ │ video.mp4│                                 │
│  │ 120KB    │ │ 2.4MB    │                                 │
│  └──────────┘ └──────────┘                                 │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Here's the bug I found on the login screen...       │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                           Ctrl+Enter to send ↵             │
└────────────────────────────────────────────────────────────┘
```

### 4.3 Voice Recording State

```
┌────────────────────────────────────────────────────────────┐
│  🎙️ Recording... 0:05 ────────●───────                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [🔴 Stop]  [✓ Send]  [✗ Cancel]                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### 4.4 Message Display (Received with Media)

```
┌────────────────────────────────────────┐
│ 👤 You  14:32                          │
│                                        │
│ 🖼️ [Screenshot_preview.jpg]            │
│                                        │
│ The login button doesn't work when     │
│ I click it twice quickly. See the      │
│ error in the console.                  │
└────────────────────────────────────────┘
```

---

## 5. Technical Implementation

### 5.1 File Handling

| Type | Max Size | Storage | Processing |
|------|----------|---------|------------|
| Image | 10MB | Base64 inline | Preview thumbnail |
| Video | 50MB | Blob URL | Preview first frame |
| Voice | 5min | Blob URL | Waveform visualization |

### 5.2 Message Payload Format

```json
{
  "id": "msg-uuid",
  "timestamp": "2026-02-28T15:15:00Z",
  "sender": "user",
  "content": {
    "text": "string or null",
    "attachments": [
      {
        "type": "image|video|audio",
        "name": "filename.jpg",
        "size": 12345,
        "data": "base64-or-blob-url",
        "mimeType": "image/jpeg"
      }
    ]
  }
}
```

### 5.3 Browser APIs Needed

- `FileReader` — Read files as base64
- `MediaRecorder` — Record voice/video
- `getUserMedia` — Access mic/camera
- `URL.createObjectURL` — Preview blobs

---

## 6. Flow Diagrams

### 6.1 Sending Mixed Message

```
User selects image ──→ Preview shown in attachment bar
       │
User types text ─────→ Text appears in textarea
       │
Ctrl+Enter pressed ──→ Compose message object
       │
       ▼
Send to OpenClaw ────→ AI receives text + attachments
       │
       ▼
Display in chat ─────→ Show image thumbnail + text
```

### 6.2 Voice Recording Flow

```
Click 🎤 button ─────→ Request mic permission
       │
Permission granted ──→ Show recording UI, start timer
       │
Click Stop ──────────→ Stop MediaRecorder, create blob
       │
       ▼
Preview playback ────→ Allow review before send
       │
Click Send ──────────→ Attach voice to message
```

---

## 7. UI/UX Details

### 7.1 Attachment Buttons

| Button | Icon | Action | File Picker |
|--------|------|--------|-------------|
| File | 📎 | Open file picker | `accept="image/*,video/*"` |
| Voice | 🎤 | Start recording | N/A (uses getUserMedia) |
| Video | 🎥 | Record video or upload | `accept="video/*"` |

### 7.2 Keyboard Shortcuts

- **Enter** — New line
- **Shift+Enter** — New line (same)
- **Ctrl+Enter** — Send message
- **Cmd+Enter** — Send message (Mac)
- **Esc** — Cancel recording / Clear attachments

### 7.3 Visual Feedback

- Attachment count badge on 📎 button
- Recording indicator pulses red
- Send button disabled if empty (no text, no attachments)
- Drag & drop files onto input area to attach

---

## 8. Open Questions

1. **Voice recording:** Hold-to-record or click-to-toggle?
2. **Video recording:** Inline or popup modal?
3. **File persistence:** Keep files in memory or upload to temp storage?
4. **Mobile support:** Same UI or simplified touch version?

---

## 9. Implementation Plan

### Phase 1: Input UX (1-2 hours)
- Change input to textarea
- Implement Ctrl+Enter send
- Add hint text

### Phase 2: File Attachments (2-3 hours)
- File picker integration
- Attachment preview UI
- Mixed message composition

### Phase 3: Voice Messages (2-3 hours)
- MediaRecorder integration
- Recording UI
- Playback preview

**Total estimate:** 5-8 hours

---

## 10. Draft Preview

### Before (Current)
```
┌─────────────────────────────────────┐
│  Hello, how can I help?             │
└─────────────────────────────────────┘
┌────────────────────────────────┐ ┌──┐
│ Type message...                │ │➤│
└────────────────────────────────┘ └──┘
        ↑ Press Enter = Send
```

### After (Proposed)
```
┌─────────────────────────────────────┐
│  Hello, how can I help?             │
└─────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│ 🖼️ [image.jpg]  🎬 [video.mp4]              │
├──────────────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌──────────────────────┐   │
│ │ 📎  │ │ 🎤  │ │ I found a bug...     │   │
│ └─────┘ └─────┘ │                      │   │
│                 │ See the screenshot.  │   │
│                 │                      │   │
│                 └──────────────────────┘   │
│                 Ctrl+Enter to send ↵       │
└──────────────────────────────────────────────┘
```

---

**Awaiting your review and approval before implementation.**

Please confirm:
1. Overall approach (unified composer)
2. Keyboard behavior (Enter = newline, Ctrl+Enter = send)
3. Attachment UI layout
4. Voice recording flow
5. Any changes or additions
