# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Amplitune is a cross-platform music player that aggregates multiple music sources (Navidrome, Apple MusicKit, Tidal) into a unified interface. It runs on web, windows/mac (Tauri), Linux (Electron) and mobile (Tauri with iOS/Android support).

## Commands

```bash
# Development
pnpm dev              # Start Next.js development server
pnpm electron-dev     # Run Electron + Next.js concurrently

# Building
pnpm build            # Build Next.js app (outputs to /out as static export)
pnpm electron-build   # Build Electron desktop app

# Mobile (Tauri)
pnpm start:ios        # Build and run on iOS
pnpm start:android    # Run on Android

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Check formatting with Prettier
pnpm format:fix       # Auto-fix formatting
```

## Architecture

### Source Abstraction Layer (`src/lib/sources/`)

The app uses a plugin-style source system where each music provider implements `SourceInterface`:

- **`source-interface.ts`** - Contract all sources must implement (play, pause, search, getLyrics, etc.)
- **`source-manager.ts`** - Singleton that manages all sources, handles source priority, deduplicates search results across sources, and falls back to LRCLIB for missing lyrics
- **`types.ts`** - Shared types (`song`, `Lyrics`, `AlbumData`, `Playlist`, etc.)

Each source has platform-specific implementations:
```
sources/
├── musicKit/
│   ├── musicKit.ts      # Platform router
│   ├── web/musicKit.ts  # Web/browser implementation
│   ├── ios/musicKit.ts  # iOS-specific
│   └── android/musicKit.ts
├── navidrome/
│   ├── navidrome.ts     # Platform router
│   └── web/             # Subsonic API implementation
└── tidal/
    └── (similar structure)
```

### State Management

- **Zustand stores** in `src/lib/state.ts` - UI state (`useUiStore`), player state (`usePlayerStore`), config (`useConfigStore`)
- **Queue store** in `src/lib/queue.ts` - Playback queue with shuffle, repeat, skip logic. Persisted to localStorage.

### Platform Targets

- **Web**: Next.js with static export (`output: "export"`)
- **Linux**: Electron using Castlabs fork (for Widevine DRM support)
- **Linux**: Tauri v2 (see `src-tauri/`)
- **Mobile**: Tauri v2 with iOS/Android targets (see `src-tauri/`)

### Storage Abstraction (`src/lib/storage/`)

Cross-platform storage with interface pattern - `BrowserStorage` for web, `ElectronStorage` for desktop.

### Key Configuration

- Path alias: `@/*` maps to `./src/*`
- Tailwind uses CSS variables for theming (shadcn/ui pattern)
- Prettier uses single quotes and tailwindcss plugin for class sorting
- ESLint extends `next/core-web-vitals` with `exhaustive-deps` and `no-img-element` disabled
