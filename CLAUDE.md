# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Downloader is an Electron + React desktop application for downloading YouTube videos. It uses yt-dlp (with Deno runtime) for downloading and Whisper.cpp for AI-powered transcription.

## Commands

### Development
```bash
npm run electron:dev    # Start app in dev mode with hot reload
npm run dev             # Start Vite dev server only
```

### Building
```bash
npm run build           # Full build (TypeScript + Vite + Electron)
npm run build:test      # Build Electron part only (for E2E tests)
npm run build:mac       # Build macOS DMG (arm64)
npm run build:win       # Build Windows installer (x64)
npm run build:linux     # Build Linux AppImage
```

### Testing
```bash
npm run test            # Unit + integration tests
npm run test:unit       # Unit tests only (watch mode)
npm run test:e2e        # E2E tests (@smoke tagged only)
npm run test:e2e:full   # All E2E tests including slow ones
npm run test:all        # Complete test suite
```

Run a single test file:
```bash
npx vitest run tests/unit/stores/downloadStore.test.ts
npx playwright test e2e/url-input.spec.ts
```

### Code Quality
```bash
npm run check           # Full check: types + lint + format + tests
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Format with Prettier
npm run type-check      # TypeScript type checking
```

## Architecture

### Process Model (Electron)

```
Renderer (React)          Preload (Bridge)           Main Process (Node.js)
    │                         │                            │
 src/App.tsx ───────► electron/preload.ts ─────► electron/main.ts
    │                         │                            │
Zustand stores     window.electronAPI         IPC handlers + Services
```

- **Main Process** (`electron/main.ts`): App entry, IPC registration, services
- **Preload** (`electron/preload.ts`): Context-isolated bridge exposing `window.electronAPI`
- **Renderer** (`src/`): React app, cannot access Node.js APIs directly

### Key Services (electron/services/)

| Service | Purpose |
|---------|---------|
| `ytdlp.service.ts` | yt-dlp wrapper, video info fetching, download subprocess |
| `binary-manager.service.ts` | Download/manage yt-dlp & Deno binaries |
| `database.service.ts` | SQLite persistence via better-sqlite3 |
| `settings.service.ts` | Settings CRUD operations |
| `transcription.service.ts` | Whisper.cpp integration |

### State Management

- **Frontend**: Zustand stores (`src/stores/downloadStore.ts`, `settingsStore.ts`)
- **Backend**: SQLite database for persistence
- **Cross-process**: IPC events for real-time progress updates

### IPC Pattern

All main process operations go through IPC handlers in `electron/ipc/`. Handler registration:
```typescript
ipcMain.handle('channel:action', ipcHandler(async (event, args) => {
  // Handler logic
}, { channel: 'channel:action' }))
```

All IPC responses use ApiResult wrapper: `{ success, data?, error? }`

### Shared Types

`shared/types.ts` is the single source of truth for TypeScript interfaces (VideoInfo, DownloadProgress, etc.)

## Testing

- **Unit tests** (Vitest, jsdom): `tests/unit/` - components, utilities, stores
- **Integration tests** (Vitest, Node): `tests/integration/` - services, cross-module
- **E2E tests** (Playwright): `e2e/` - full app workflows

E2E tests require a build first: `npm run build:test && npm run test:e2e`

Mock `window.electronAPI` is set up in `tests/setup.ts` for unit tests.

## Important Patterns

- **Path Security**: All file paths validated via `isPathWithinAllowed()` in `electron/utils/ipc-handler.ts`
- **Event Cleanup**: IPC event listeners in `useDownloadEvents` hook must unsubscribe on unmount
- **Serialization**: IPC only transfers JSON-serializable data, no functions
- **Binary Management**: yt-dlp and Deno downloaded at first run, not bundled

## Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS v4, Zustand
- **Backend**: Electron 28, Node.js 20, better-sqlite3
- **External**: yt-dlp, Deno runtime, Whisper.cpp
- **Testing**: Vitest (unit/integration), Playwright (E2E)
