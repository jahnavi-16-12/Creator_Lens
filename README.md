# Creator Lens AI

I built this for a technical screening challenge. The task was simple on paper —
RAG chatbot, two video URLs, ask questions about them. The part that kept me up
was figuring out how to make it not cost a fortune at scale without sacrificing
answer quality. That's where most of the actual engineering went.

---

## What It Does

Paste a YouTube URL and an Instagram Reel URL. The system pulls both transcripts,
grabs the metadata (views, likes, creator stats, hashtags, all of it), splits the
transcripts into chunks, and stores them as vectors. Then you get a three-panel
chat interface — Video A on the left, the AI chat in the middle, Video B on the right.

You can ask things like "why did Video B get more likes?" or "compare the opening
hooks" and the AI answers using the actual transcript content — not hallucinations.
Every answer shows which chunk from which video it pulled from.

---

## Architecture
User pastes two URLs
↓
POST /api/ingest (FastAPI)
↓                          ↓
YouTube URL                Instagram URL
youtube-transcript-api     yt-dlp + Whisper
(Whisper fallback if        (no public transcript
captions disabled)         API for Reels)
↓                          ↓
Gemini embedding-001 — 768 dimensions
↓
Qdrant Cloud — filtered by session_id + video_label
↓
Supabase ← metadata row per video
(views, likes, engagement_rate, creator, etc.)
User asks a question
↓
POST /api/chat/stream (SSE)
↓
LangGraph pipeline:
[classify]      Flash-Lite → what type of query is this?
↓
[fetch_metadata] pull from Supabase
↓
[retrieve]      embed query → search Qdrant
(comparison? → 4 chunks from A + 4 from B)
(everything else → top 6)
↓
[generate]      Flash or Flash-Lite depending on complexity
↓
[cite]          parse [Video A - Chunk N] patterns from response
↓
SSE stream → Next.js → ReactMarkdown + citation cards

---

## Tech Stack

| Layer | Choice | Why | Breaks at scale when... |
|---|---|---|---|
| LLM generation | gemini-2.5-flash | Handles long context well, cheaper than GPT-4o | Rate limits hit under high concurrency |
| LLM classification | gemini-2.5-flash-lite | It's a JSON routing call, Flash is overkill | Shares quota with generation model |
| Embeddings | gemini-embedding-001 (768-dim) | Same API key, 2048-token input limit | 1500 RPM free tier needs batching |
| Vector DB | Qdrant Cloud | Payload filtering without extra infra | Free tier is single node, no replication |
| Metadata DB | Supabase | Async Python client, easy to inspect | Connection pool under concurrent ingest |
| YouTube transcript | youtube-transcript-api → Whisper | API is instant; Whisper catches no-caption videos | Whisper base has ~10% WER on accented speech |
| Instagram transcript | yt-dlp + faster-whisper | No public API for Reels | Breaks when Instagram changes internals |
| Backend | FastAPI | Native async, SSE support | MemorySaver needs Redis for horizontal scale |
| Frontend | Next.js | App Router, localStorage for session state | All state is client-side only |
| Orchestration | LangGraph StateGraph | Explicit node graph, built-in checkpointing | MemorySaver lost on server restart |

---

## The Routing Decision (Most Important Part)

Every query hits a `classify` node first. Flash-Lite reads the question and
returns a JSON object — query type and whether it needs the complex model.
That's it. Flash-Lite costs $0.10 per million output tokens. Flash costs $0.30.
Classification responses are maybe 25 tokens. The individual cost difference
is negligible but the volume math matters.

The `generate` node then picks the model: Flash for comparison and suggestion
queries that need reasoning across 8+ chunks, Flash-Lite for metadata lookups
and simple engagement questions. About 60% of real queries fall into the
simpler bucket.

At 10,000 users/day with ~5 queries each, routing those 30,000 simple queries
to Flash-Lite instead of Flash saves roughly $400/month. Before counting
classification. That's the kind of decision that looks obvious in hindsight
but you have to actually sit down and do the math to catch it.

---

## Cost at 10,000 Users/Day

| Operation | Rate | Daily |
|---|---|---|
| Embeddings — 100M tokens | $0.15/1M | $15 |
| Classification — Flash-Lite | $0.10/1M output | $5 |
| Generation — Flash-Lite (60% of queries) | $0.10/1M output | $30 |
| Generation — Flash (40% of queries) | $0.30/1M output | $120 |
| **Total** | | **~$170/day** |
| GPT-4o for everything | $15/1M output | ~$1,500/day |
| **Savings** | | **~89%** |

GPT-4o is a stronger model but for analytics questions over short
video transcripts, Flash is more than sufficient and the cost
difference is not justifiable.

---

## Chunking

512 tokens, 64 overlap. I tried 256 first — chunks were too short to carry
a complete thought from a video script and retrieval quality was noisy.
Scores came back flat across too many fragments. Tried 1024 — the embeddings
started averaging over too much content, so a chunk covering both the hook
and the tutorial body would get pulled for both types of questions. 512 maps
roughly to one logical section of a video. The 64-token overlap stops
sentences from getting cut at chunk boundaries without wasting much storage.

Using `RecursiveCharacterTextSplitter` with double-newline → newline →
sentence-stop priority — this matters for transcripts specifically because
raw transcripts don't have clean paragraph breaks.

---

## What I'd Fix With More Time

**Instagram data is mostly null.** The platform blocks views and likes for
accounts you don't own. The LLM prompt tells the model not to treat null as
zero but that's a workaround. Real fix: manual input field on the ingest form
so creators can paste their own stats from the Instagram dashboard.

**Whisper base breaks on background music.** Works fine for clean voiceovers.
Falls apart on Reels with heavy background audio. Would swap the fallback to
Deepgram or AssemblyAI for production — keep the youtube-transcript-api fast
path as-is.

**MemorySaver dies on restart.** Chat history is in-process memory. Restart
the server and thread IDs stored in localStorage become orphaned. Redis
checkpointer is already stubbed in the config — one-file change, just
didn't get to it in the timeline.

**yt-dlp breaks every few weeks.** Instagram and YouTube change internals
often enough that yt-dlp needs regular updates. Before real users: add a
daily health-check job that runs yt-dlp on a known-good URL and alerts
on failure before users start seeing 500s.

---

## Setup

You need Python 3.11+, Node 20+, and ffmpeg.

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg
```

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in GEMINI_API_KEY, QDRANT_URL, QDRANT_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY
uvicorn app.main:app --reload --port 8000
```

**Supabase — run this SQL in the dashboard:**
```sql
CREATE TABLE IF NOT EXISTS video_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES video_sessions(session_id),
  video_label TEXT NOT NULL,
  url TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT,
  creator TEXT,
  follower_count BIGINT,
  views BIGINT,
  likes BIGINT,
  comments BIGINT,
  hashtags JSONB DEFAULT '[]',
  upload_date TEXT,
  duration_seconds INT,
  engagement_rate FLOAT,
  transcript_status TEXT DEFAULT 'pending',
  chunks_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Frontend:**
```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open `localhost:3000`. Paste a YouTube URL and any public Instagram Reel.
Ingest takes 30–90 seconds depending on video length.

---

## Author

G Jahnavi. Built this solo in the challenge window.
The dual-model routing is the decision I'd defend first in any
technical interview — not because it's clever but because it's
the kind of thing that separates a demo from a product.