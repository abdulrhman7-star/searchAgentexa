# Exa AI Search & Media Extractor

An AI-powered search application leveraging the Exa API and multi-llm AI synthesis (Gemini 3.6 Flash / OpenAI gpt-4o-mini) with caching and performance optimizations.

## Features

- **Exa Search Integration**: Real-time neural search with custom options (domains, date filters, crawling).
- **Smart AI Summaries**: Auto-synthesizes key insights and citations using Gemini / OpenAI with graceful structured fallbacks.
- **Media Extraction**: Deep crawling and extraction for images and videos from web pages.
- **In-Memory Caching**: Fast 5-minute TTL caching using `node-cache` for instant repeat query responses.
- **Resilient Requests**: Automatic retry logic with exponential backoff and request timeouts.

## Local Environment Setup

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and set your API keys:
   ```bash
   cp .env.example .env
   ```
   Add your keys in `.env`:
   ```env
   EXA_API_KEY=your_exa_api_key
   OPENAI_API_KEY=your_openai_api_key_optional
   GEMINI_API_KEY=your_gemini_api_key_optional
   ```

## Running Locally

Start both the backend Express server and Vite frontend client concurrently:

```bash
npm run dev
```

This runs:
- `npm run start:server`: Express server (`server.ts`) running on `http://localhost:3000`
- `npm run start:client`: Vite dev server

## Building for Production

Build the client assets and bundle the server:

```bash
npm run build
npm start
```
