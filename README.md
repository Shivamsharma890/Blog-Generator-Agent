# BlogCraft AI — Agentic Blog Generator

BlogCraft AI is an AI-powered blog-writing workspace built with **React, Tailwind CSS, FastAPI, LangGraph, LangChain, and Groq**. It guides a blog through research, human review, drafting, another human review, and final editing.

> **Workflow:** Research Agent → Human Research Review → Writer Agent → Human Draft Review → Editor Agent → Final Blog

## Features

- Generate a research outline for a topic and target audience.
- Approve research or request revisions with human feedback.
- Generate a complete blog draft based on the approved research.
- Approve the draft or request changes before final editing.
- Polish the approved draft into a final Markdown blog.
- Resume a saved workflow using the same LangGraph `thread_id`, when checkpointing is configured.
- Copy the final blog from the interface.
- Dark UI built with React and Tailwind CSS.

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, JavaScript  
**Backend:** Python, FastAPI, LangGraph, LangChain, Groq API (`langchain-groq`)  
**Persistence:** SQLite checkpointing (as configured in `Graph.py`)

## Example Project Structure

```text
BlogCraft-AI/
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   │   └── logo.png
│   │   ├── components/
│   │   │   ├── BlogForm.jsx
│   │   │   └── BlogReview.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── .env
└── backend/
    ├── Agents.py
    ├── Graph.py
    ├── State.py
    ├── user.py
    ├── .env
    └── Blog.sqlite
```

Adapt folder names and file names to match your repository. The frontend structure assumes `App.jsx` imports `./components/BlogForm` and `./components/BlogReview`.

## Prerequisites

- Python 3.10+ (use a version supported by your installed LangGraph/LangChain packages)
- Node.js LTS and npm
- A Groq API key

## 1. Set Up the Backend

Open a terminal in the backend directory:

```bash
cd backend
```

Create and activate a virtual environment.

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If activation is blocked, use Command Prompt:

```bat
.venv\Scripts\activate.bat
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install fastapi "uvicorn[standard]" langgraph langgraph-checkpoint-sqlite langchain-core langchain-groq python-dotenv
```

If your repository has a `requirements.txt`, use:

```bash
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Replace the placeholder with your own key. Never commit `.env` or expose the key in frontend code.

### Run the Backend

If the FastAPI instance is defined as `app` inside `user.py`:

```bash
uvicorn user:app --reload --host 127.0.0.1 --port 8000
```

If the module has a different name, replace `user` with that filename (without `.py`). For example, `main.py` uses `uvicorn main:app --reload`.

Open the API docs at <http://127.0.0.1:8000/docs>.

## 2. Set Up the Frontend

Open a second terminal in the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL shown by Vite, usually <http://localhost:5173>.

### API Base URL

The current `App.jsx` version uses:

```js
const API = "http://127.0.0.1:8000";
```

With that code, a frontend environment variable is not required. Alternatively, add `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Then change the API constant to:

```js
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
```

Restart Vite after changing environment variables. Never put secret API keys in `VITE_` variables because frontend variables are exposed to the browser.

## 3. Tailwind CSS

If Tailwind is already working in your Vite project, keep your existing configuration. Make sure the main CSS file is imported in `main.jsx`, for example:

```jsx
import "./index.css";
```

For a new setup, follow the official instructions for your chosen Tailwind version; Tailwind v3 and v4 use different setup steps.

## 4. Use BlogCraft AI

1. Start the backend and frontend.
2. Enter a unique **Thread ID**, blog topic, and target audience.
3. Click **Start blog workflow**.
4. Review the research outline and approve it or request revisions.
5. Review the generated draft and approve it or submit revision feedback.
6. Read and copy the final blog.
7. Use the same Thread ID to load a saved workflow. Use a new unique ID for a separate blog.

The current frontend requires a Thread ID before starting. Reusing an existing ID may continue or conflict with an earlier checkpoint depending on the backend implementation.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/graph` | Start a blog workflow |
| `POST` | `/graph/resume` | Submit approval or revision feedback |
| `GET` | `/graph/{thread_id}` | Load a saved workflow |

The current frontend sends `POST /graph` with `thread_id`, `topic`, and `audience`. It sends resume data as query parameters, for example:

```text
/graph/resume?thread_id=YOUR_THREAD_ID&action=approve&feedback=
```

For a revision, it sends `action=revise` and a non-empty `feedback` value. Ensure your backend accepts this request format; otherwise update the frontend or backend to match.

## Troubleshooting

### `GROQ_API_KEY` is not set
- Confirm `.env` is in the backend directory and is loaded by the application.
- Check the variable name is exactly `GROQ_API_KEY`.
- Restart the backend after changing `.env`.

### Frontend cannot connect to FastAPI
- Confirm the backend is running on `127.0.0.1:8000`.
- Open `/docs` to verify the API is reachable.
- Check the frontend API base URL.
- If the browser reports a CORS error, configure FastAPI to allow the frontend origin, commonly `http://localhost:5173` and `http://127.0.0.1:5173`.

### API returns `404` or `422`
- Confirm endpoint paths and request formats match between frontend and backend.
- Check that `thread_id`, `topic`, and `audience` are provided when starting a workflow.
- Confirm `feedback` is non-empty when `action=revise`.

### Workflow does not resume
- Confirm `Graph.py` compiles the graph with a checkpointer.
- Use the same `thread_id` for resume and load requests.
- Ensure the graph is paused at a human-review interrupt before submitting feedback.
- Check the backend terminal for the underlying error.

### Tailwind styles are missing
- Confirm `index.css` is imported by `main.jsx`.
- Check that Tailwind scans files under `src/`.
- Restart Vite after configuration changes.

## Security Notes

- Keep API keys in backend environment variables.
- Never expose secret keys through `VITE_` environment variables.
- Add `.env`, `.venv/`, `node_modules/`, and local SQLite database files to `.gitignore` as appropriate.
- Configure production CORS origins and use your hosting provider's secret manager for deployment.
- Avoid returning raw exception details to production clients.

## Current Limitations

- The project requires a Groq API key and network access to the model provider.
- Research should be reviewed; facts are not independently verified unless a search or retrieval tool is implemented.
- The frontend Markdown renderer supports only a subset of Markdown. For untrusted generated content, use a maintained Markdown renderer and sanitize HTML before rendering it.
- Local SQLite checkpointing can be suitable for development; assess persistence, concurrency, and storage needs before deploying multiple instances.

## License

Add your preferred license before publishing the repository. No license is specified here.
