# TranslAgent

A web application that translates English text to a different language (Arabic and Chinese supported) and provides transliteration back to Latin characters.

## Features

- English to other language translation using OpenAI API
- Transliteration of translated language to Latin characters
- Mobile-optimized responsive design
- Simple and intuitive user interface

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

Note: to deploy to GCP, you need to include GCP_ID, REGION and APP_NAME for the deployment using cloud run

### Development

Start the development server with hot reloading:
```bash
bun run dev
```

### Building for Production

Build the project:
```bash
bun run build
```

Serve the production build:
```bash
bun run serve
```

## Project Structure

```bash
tree -L 3 -I "node_modules" -I "time" -I "cache" -I "*.code-workspace" -I "rel.md"

translagent/
├── Dockerfile #Docker for dpeloyment
├── README.md #Readme
├── bun.lockb
├── deploy.sh #Deploy build command in GCP
├── package.json # App definition
├── public #Public folder for front end of app
│   ├── css
│   │   └── styles.css
│   ├── index.html
│   └── js
│       └── app.js
├── sample.env #Sample env
├── src #Backend
│   ├── app.ts
│   ├── translation #OpenAI
│   │   ├── index.ts
│   │   ├── translator.ts
│   │   └── transliterator.ts
│   ├── types
│   │   └── index.ts
│   └── utils
│       └── rate-limiter.ts
└── tsconfig.json
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.