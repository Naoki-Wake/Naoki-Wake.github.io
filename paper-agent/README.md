# Paper agent

"Ask this paper" on naokiwake.com. Visitors open a panel under a paper, see suggested questions with
instant answers, and can ask free-form questions that an AI answers from the paper text, like a poster session.

## How it works

- `ask.js` (site root) adds an "Ask this paper" button to every `.papers li` whose arXiv ID is listed in
  `papers/faq/index.json`.
- Suggested questions come from `papers/faq/<arxiv>.json`. They are static, instant, and free.
- Free-form questions go to a Cloudflare Worker (`worker/`) at `https://ask.naokiwake.com/ask`. The Worker puts
  the paper text and author notes in the Gemini system prompt and streams the answer back. Full paper texts live
  only inside the Worker bundle and are not published as static files.
- If the Worker is down or over quota, the panel shows a short message and suggested questions still work.

## Files

| Path | Purpose |
| --- | --- |
| `papers.json` | Papers that have an agent (arXiv ID, title, Naoki's role). |
| `notes/<arxiv>.md` | Author notes: what is not in the paper. Text outside the HTML comment is sent to the agent and labelled "(author's note)". This repository is public. |
| `../papers/faq/<arxiv>.json` | Precomputed summary and 6 Q&As per paper. AI-drafted from the paper text; review before relying on them. |
| `scripts/fetch_papers.py` | Downloads arXiv PDFs and extracts text into `corpus-src/` (gitignored). |
| `scripts/build_corpus.py` | Bundles texts and notes into `worker/src/corpus.js` (gitignored) and writes `papers/faq/index.json`. |

## Deploy (GitHub Actions, no local machine needed)

`.github/workflows/deploy-paper-agent.yml` fetches the papers from arXiv, builds the corpus, and deploys the Worker
whenever `paper-agent/**` changes on `main`. It can also be run by hand from the Actions tab.

One-time setup, in the repository's Settings > Secrets and variables > Actions, add:

| Secret | Where to get it |
| --- | --- |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey, on a project without billing (shows "Free tier"). |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard > My Profile > API Tokens > "Edit Cloudflare Workers" template, scoped to your account and the `naokiwake.com` zone. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard > Workers & Pages overview (right sidebar). |

Then run the workflow once (Actions > Deploy paper agent > Run workflow). The last step checks
`https://ask.naokiwake.com/health`.

Keep the Gemini key on a project without billing so usage can never cost money; requests beyond the free quota
fail with 429 and the panel says the service is busy. Free-tier inputs may be used by Google to improve its
products, so put only public material in the notes. Change the model with `GEMINI_MODEL` in `wrangler.toml`.

## Deploy from a local machine (optional)

Requirements: Node.js 20+, `pdftotext` (poppler-utils), and the same Cloudflare account and Gemini key.

```sh
cd paper-agent
python3 scripts/fetch_papers.py
cd worker
npm install
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npm run deploy
```

## Add a paper

1. Add it to `papers.json` (it must also appear on the site with an `arxiv.org/abs/` link).
2. Add `papers/faq/<arxiv>.json` and optionally `notes/<arxiv>.md`.
3. Merge to `main`; the workflow redeploys the Worker and GitHub Pages publishes the site.

## Local test

Create `worker/.dev.vars` with `GEMINI_API_KEY=...` and
`ALLOWED_ORIGINS=http://127.0.0.1:8800`, run `npm run dev` in `worker/`, and serve the site with
`python3 -m http.server 8800`. Point `data-endpoint` in the page at `http://127.0.0.1:8787/ask` while testing.
