# AI Student Toolkit

> A browser-based toolkit with 10 AI-powered tools for studying, teaching, and classroom productivity.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20App-2ea44f?logo=github)](https://aman-semwal.github.io/AI-Student-ToolKit/)
[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-222?logo=github)](https://pages.github.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-46.7%25-f7df1e?logo=javascript&logoColor=222)](https://github.com/Aman-Semwal/AI-Student-ToolKit)

**Try it live:** [aman-semwal.github.io/AI-Student-ToolKit](https://aman-semwal.github.io/AI-Student-ToolKit/)

AI Student Toolkit is a frontend-only web app based on the `AI_Classroom_Tasks.docx` specification. It brings common study and classroom workflows into one simple interface without a build step or backend.

## Features

| Tool | What it does |
| --- | --- |
| **Resume Builder** | Creates a structured resume draft from identity, role, contact, and experience details. |
| **Notes Generator** | Turns a lecture or article into organized study notes. |
| **Presentation Maker** | Generates slide cards with bullets and speaker notes, with outline download support. |
| **Syllabus Mind Map** | Builds a central topic with branches and related concepts. |
| **Sheets Dashboard** | Loads JSON rows from a Google Apps Script Web App and supports AI-powered analysis. |
| **Quiz Generator** | Creates multiple-choice questions and checks answers and scores in place. |
| **Doubt-Solving Tutor** | Provides a persistent visual conversation with context-aware follow-up prompts. |
| **Flashcards** | Generates flip cards with previous/next navigation. |
| **Study Planner** | Creates a focused seven-day study plan with sessions and notes. |
| **Photo Notes Summarizer** | Extracts text from an uploaded image in the browser and summarizes it with AI. |

## Quick start

No installation or build process is required.

1. Open the [live app](https://aman-semwal.github.io/AI-Student-ToolKit/), or clone the repository.
2. For local development, serve the project with any static web server:

   ```bash
   git clone https://github.com/Aman-Semwal/AI-Student-ToolKit.git
   cd AI-Student-ToolKit
   python -m http.server 8000
   ```

3. Open <http://localhost:8000>.
4. Open **Settings** and add an API key. The provider and model are detected from the key prefix.

## Supported AI providers

| Provider | Key prefix | Get a key |
| --- | --- | --- |
| Google Gemini | `AIza...` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| Anthropic Claude | `sk-ant-...` | [Anthropic Console](https://console.anthropic.com/) |
| OpenAI-compatible APIs | `sk-...` | [OpenAI API keys](https://platform.openai.com/api-keys) |

> **Security:** This application calls providers directly from the browser. Your API key is stored in `sessionStorage` and cleared when the tab closes; it is never hard-coded in the repository. Use a restricted, low-limit key where possible, and do not use this frontend-only pattern for production applications that require server-side secret protection.

## Architecture

- Plain HTML, CSS, and JavaScript with no framework, build step, backend, or server-side secret management.
- Provider-specific AI requests are made directly from the browser.
- JSON responses tolerate fenced output before parsing.
- Tesseract.js is loaded from a CDN and performs OCR locally before extracted text is sent to Gemini.
- The Sheets Dashboard reads JSON from a deployed Google Apps Script Web App URL.
- Each tool has dedicated controls, loading states, empty states, and error handling while sharing one visual system.

## Google Sheets setup

1. Deploy a Google Apps Script Web App with access set to **Anyone**.
2. Ensure the `/exec` endpoint returns JSON and permits browser CORS requests.
3. Paste the deployed URL into **Sheets Dashboard** and load the rows.
4. To test **Add row**, load at least one row, fill in the detected fields, and confirm the new object appears in the local dataset prompt.

Adding a row currently updates the in-browser dataset only. Persisting changes back to Google Sheets requires a write-enabled Apps Script endpoint, which is outside the current read-only contract.

## Deployment

The project entry point is `index.html`, so it can be deployed to any static host, including:

- [GitHub Pages](https://pages.github.com/)
- [Netlify](https://www.netlify.com/)
- [Vercel](https://vercel.com/)
- [Cloudflare Pages](https://pages.cloudflare.com/)

For GitHub Pages, publish the repository's `main` branch from the repository's **Settings → Pages** section.

## Troubleshooting

- **Missing API key:** Open **Settings** and add a supported key. Detection is based on the key prefix.
- **API errors or CORS failures:** Check the provider key, model availability, browser network panel, and provider usage limits.
- **Sheets errors:** Use the deployed `/exec` URL, confirm the endpoint returns JSON, and verify CORS and access settings.
- **Slow OCR on first use:** Tesseract.js downloads its language model from a CDN. Later runs should be faster because browser caching may apply.
- **Live site not updated:** Confirm GitHub Pages is enabled for the `main` branch and allow a short time for deployment to finish.

## Contributing

Issues and pull requests are welcome. For changes, keep the app dependency-light, avoid committing secrets, and test the affected tool in both a local static server and the deployed site when possible.

## License

No license file is currently included. Add a license before distributing or reusing this project outside the repository.
