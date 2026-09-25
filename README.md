# AI Student Toolkit

One website with 10 small AI-powered tools for a classroom session, built from
the `AI_Classroom_Tasks.docx` spec: a resume builder, notes generator,
presentation generator, syllabus mind map, Google Sheets dashboard, quiz
generator, doubt-solving tutor chatbot, flashcard generator, study planner,
and an OCR + AI notes summarizer.

## Architecture

- **Frontend-only:** plain HTML/CSS/JavaScript with no build step, backend, or
  server-side secret management.
- **Direct Gemini calls:** users add their own Gemini API key in Settings. The
  key is stored in that browser's `localStorage` and sent directly to Google's
  Generative Language API.
- **Browser OCR:** the Photo Summarizer loads Tesseract.js from a CDN and runs
  recognition locally before sending extracted text to Gemini.
- **Google Sheets:** the Sheets Dashboard can load JSON rows from a deployed
  Google Apps Script Web App URL directly from the browser.

## Setup

No installation is required. Serve this folder with any static web server.
For local development:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`, then add a key from
https://aistudio.google.com/app/apikey in **Settings**. Never hard-code a key
in the frontend.

## Run

Deploy the folder to any static host such as GitHub Pages, Netlify, Vercel
static hosting, or Cloudflare Pages. The entry point is `index.html`.

## Using each tool

1. **Resume Builder** — provide identity, role, contact, and experience details; generate a structured resume draft.
2. **Notes Generator** — paste a lecture or article and generate structured study notes.
3. **Presentation Maker** — choose a slide count, generate slide cards with bullets and speaker notes, then download the outline.
4. **Syllabus Mind Map** — generate a central topic with branches and child concepts.
5. **Sheets Dashboard** — paste a deployed Google Apps Script Web App URL, load JSON rows, and ask AI to summarize, compare, or prioritize them.
6. **Quiz Generator** — generate multiple-choice questions, select answers, and check the score in place.
7. **Doubt-Solving Tutor** — ask follow-ups in a persistent visual conversation with context included in each prompt.
8. **Flashcards** — generate flip cards with previous/next navigation.
9. **Study Planner** — generate a seven-day plan with focus, sessions, and notes.
10. **Photo Notes Summarizer** — upload a photo, extract text with browser OCR, review it, and summarize it with AI.

## Notes on implementation choices

- Every AI-driven tool sends a focused prompt directly to Gemini and expects
  either plain text or a small JSON shape. JSON responses tolerate fenced
  output before parsing.
- Every tool has its own controls, output treatment, loading state, empty
  state, and API error state while sharing one visual system.

## Troubleshooting

- **Missing API key** — open Settings and add your own Gemini key.
- **Sheets errors** — deploy the Apps Script Web App with access set to
  "Anyone" and use its `/exec` URL. The endpoint must return JSON and allow
  browser CORS requests.
- **OCR is slow on the first run** — Tesseract.js downloads its language model
  from a CDN once; later runs are faster.
