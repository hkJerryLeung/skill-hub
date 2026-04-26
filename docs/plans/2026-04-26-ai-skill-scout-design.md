# AI Skill Scout Design

## Goal

Add a Discover-first assistant that chats with a local model, recommends existing GitHub skills, and installs a chosen recommendation into Shared Library only after user confirmation.

## Architecture

The frontend adds a new Discover view named `AI Skill Scout` above the existing remote sources. The view keeps the interaction focused: detect local providers, let the user choose the detected model, send a user request to the local model, render recommendation cards, then use the existing GitHub installer path with `Shared Library` as the fixed target.

The backend adds a small `local_scout` module. It detects Ollama and OpenAI-compatible local endpoints, normalizes models into a shared DTO, sends OpenAI-compatible chat requests, and parses strict JSON recommendations. Ollama chat uses `/api/chat` and LM Studio style endpoints use `/v1/chat/completions`.

## UX

`AI Skill Scout` sits at the top of Discover. The screen shows a provider/model picker, a compact chat input, an AI response area, and recommendation cards with GitHub URL, skill name hint, reason, and confidence. Install buttons always say `Install to Shared Library` and call `window.confirm` before invoking the backend installer.

## Error Handling

If no local model is detected, the view shows a manual provider URL and model input. If model output is not parseable JSON, the backend returns a plain error so the UI can show it in the existing callout style. Install failures reuse the current toast flow.

## Testing

Frontend tests cover the sidebar entry and AI Skill Scout branch in `MarketView`. Backend tests cover response parsing for OpenAI-style and Ollama-style model JSON. Full verification uses Node tests, Cargo tests, and the Vite build.
