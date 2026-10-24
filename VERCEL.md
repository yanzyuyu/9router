# Vercel Deployment Guide

Serverless deployment guide for 9Router on Vercel.

## Architecture

Vercel functions operate on ephemeral, read-only filesystems. 9Router adapts to this environment via:

1. Dynamic Data Directory: Automatically mounts SQLite database to `/tmp/.9router/db/data.sqlite`.
2. Zero-Setup Environment Seeding: On cold starts, API keys provided via environment variables are seeded directly into the database.
3. Extended Streaming: Configured with 60-second timeouts for SSE streaming completion.
4. Optional Cloud Snapshot Sync: Supports state persistence across deployments via `DATABASE_SYNC_URL`.

## Environment Variables

### Core Configuration

| Variable | Description | Example |
| :--- | :--- | :--- |
| `API_KEY` | Master key to authenticate client requests to `/v1/*` | `sk-9r-master-token` |
| `JWT_SECRET` | Session secret for dashboard authentication | `openssl rand -hex 32` |
| `INITIAL_PASSWORD` | Initial password for web dashboard login | `strong_password_here` |

### Provider API Keys (Auto-Seeded on Boot)

| Variable | Provider Target | Default Model |
| :--- | :--- | :--- |
| `OPENAI_API_KEY` | OpenAI | `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | Anthropic | `claude-3-5-haiku-latest` |
| `GEMINI_API_KEY` | Google Gemini | `gemini-2.5-flash` |
| `GROQ_API_KEY` | Groq | `llama-3.3-70b-versatile` |
| `DEEPSEEK_API_KEY` | DeepSeek | `deepseek-chat` |
| `OPENROUTER_API_KEY` | OpenRouter | `auto` |
| `MISTRAL_API_KEY` | Mistral AI | `mistral-small-latest` |
| `XAI_API_KEY` | xAI / Grok | `grok-beta` |

### Persistence Options (Optional)

| Variable | Description |
| :--- | :--- |
| `DATABASE_SYNC_URL` | Remote endpoint for downloading and syncing `data.sqlite` |
| `DATABASE_SYNC_KEY` | Bearer token for `DATABASE_SYNC_URL` |
| `SQLITE_BASE64` | Base64-encoded SQLite database snapshot |
| `SEED_CONFIG_JSON` | Raw JSON string containing preconfigured connections and combos |

## Client Configuration

### Cursor / Windsurf

- Model Base URL: `https://your-project.vercel.app/v1`
- API Key: Value of `API_KEY`

### Claude Code

```bash
export ANTHROPIC_BASE_URL="https://your-project.vercel.app/v1"
export ANTHROPIC_API_KEY="your-api-key"
```

### Cline / Roo Code

- Provider: OpenAI Compatible
- Base URL: `https://your-project.vercel.app/v1`
- API Key: Value of `API_KEY`
