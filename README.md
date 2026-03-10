# TranslAgent

A Cloud Run-ready web application that translates English text into Arabic or Mandarin Chinese and provides a Latin-character transliteration. Speech playback is available as an optional follow-up action.

## Features

- English-to-Arabic and English-to-Mandarin translation using the OpenAI API
- Transliteration of translated text into Latin characters
- Optional speech playback for translated text
- Mobile-optimized single-page interface
- Cloud Run deployment through Docker and `deploy.sh`

## Getting Started

### Prerequisites

- Node.js 16+ or Bun runtime
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone https://your-repository-url.git
cd translagent
```

2. Install dependencies
```bash
bun install
```

3. Set up environment variables
```bash
cp sample.env .env
```

Fill in all of the relevant elements.

For Cloud Run deployment, include:

- `PROJECT_ID`
- `IMAGE_NAME`
- `SERVICE_NAME`
- `REGION`
- `ARTIFACT_REGISTRY_LOCATION` (optional, defaults to `REGION`)

### Development

Start the development server with hot reloading:
```bash
bun run dev
```

Serve locally:
```bash
bun run start
```

The service listens on `process.env.PORT` and defaults to `3001` locally.

### Public API

- `GET /healthz`
  - Returns `{ "ok": true }`
- `POST /translate`
  - Request: `{ "text": string, "language": "ar" | "zh" }`
  - Response: `{ "translatedText": string, "transliteratedText": string }`
- `POST /speak`
  - Request: `{ "text": string, "language": "ar" | "zh" }`
  - Response: `audio/mpeg`

JSON errors use this shape:

```json
{
  "error": {
    "code": "missing_text",
    "message": "The 'text' field is required."
  }
}
```

Input is capped at 1000 characters per request.

## Project Structure

```bash
tree -L 3 -I "node_modules" -I "time" -I "cache" -I "*.code-workspace" -I "rel.md"

translagent/
├── Dockerfile # Docker image for Cloud Run
├── README.md # Project documentation
├── bun.lockb
├── deploy.sh # Manual Cloud Run deployment script
├── package.json # App definition
├── public # Static frontend assets
│   ├── css
│   │   └── styles.css
│   ├── index.html
│   └── js
│       └── app.js
├── sample.env # Sample env vars
├── src # Bun backend
│   ├── app.ts
│   ├── translation # Translation + transliteration
│   │   ├── index.ts
│   │   ├── translator.ts
│   │   └── transliterator.ts
│   ├── speak # Optional speech synthesis + cache
│   │   ├── cache.ts
│   │   ├── index.ts
│   │   ├── speak.ts
│   │   └── types.ts
│   ├── types
│   │   └── index.ts
│   └── utils
│       └── rate-limiter.ts
└── tsconfig.json
```

## Cloud Run Notes

- The filesystem cache under `cache/audio` is opportunistic only.
- On Cloud Run, cache entries are instance-local and ephemeral.
- The in-memory rate limiter is best-effort abuse protection, not a global quota.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
