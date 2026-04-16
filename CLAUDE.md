# NAMA OS — Project Memory

## Roadmap Status

### ✅ Completed (V1–V5 + Security)
- V2: Leads CRM rebuild (HOT/WARM/COLD, 3-tab panel), Documents Hub, Comms templates
- V3: NAMA Copilot (floating AI, Paperclip context), AI Lead Scoring, Smart Pricing
- V4: Customer Portal (/portal/[bookingId]), Live Trip Tracker
- V5: Intelligence Sync API, Vendor Marketplace rewrite
- Security audit: HttpOnly cookies, API key auth, JWT middleware, CSP headers

### 🅱️ Parked — V6: NAMA Voice
**Concept:** Open-source TTS voice layer for NAMA OS
**Recommended stack:**
- Coqui TTS — default engine (multilingual, local/edge capable)
- OpenVoice — voice cloning + brand voice identity
- Bark (Suno) — emotional/storytelling narration (proposals, reels)
- OpenRouter — model routing brain (also useful for NAMA Copilot independently)

**High-ROI use cases identified:**
1. Voice itinerary narration (proposal differentiator)
2. Agent training simulations
3. Multi-language travel assistant
4. Audio summaries of proposals
5. WhatsApp voice responses (needs OGG/Opus conversion layer)

**Edge AI fit:** Coqui/OpenVoice can run locally at agency nodes — matches existing Gemma edge strategy.

**Note from Prateek:** OpenRouter worth pulling forward as a near-term win for NAMA Copilot model routing, independent of voice work.

**Status:** Research complete. Not yet started. Revisit when V5 intelligence network is live with real agency nodes.

---

## Key Technical Decisions
- Stack: Next.js 14 App Router + TypeScript + Tailwind, FastAPI on Railway, Neon PostgreSQL
- Demo mode: `nama_demo=1` cookie bypasses auth for dashboard (not /owner or /super-admin)
- Seed data fallback on every page — all 16 modules work without backend
- Auth cookie: HttpOnly, set server-side via /api/auth/set-cookie
- API routes: Bearer token via NAMA_API_KEY env var
- Middleware JWT check: 3-segment base64url, min 50 chars

## Repo
- GitHub: https://github.com/narumaam/nama-frontend
- Local: ~/Desktop/NAMA/07_Developer_Project
- Deployed: Vercel (auto-deploy on push to main)
