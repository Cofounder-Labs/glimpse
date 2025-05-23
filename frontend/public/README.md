# Pre-recorded Demo Videos

This directory contains pre-recorded demo videos that can be used instead of generating videos in real-time for mock modes.

## How it works

When running in mock modes (MOCK_MODE1-5) with video demo type, the system will first check for pre-recorded videos in the corresponding folders:

- **Mock Mode 1** (browser-use.com) → `browser-use/` folder
- **Mock Mode 2** (github.com) → `github/` folder  
- **Mock Mode 3** (storylane.io) → `storylane/` folder
- **Mock Mode 4** (localhost:3000) → `glimpse/` folder
- **Mock Mode 5** (localhost:3000) → `glimpse/` folder

## Adding pre-recorded videos

1. Create or obtain a demo video (MP4, WebM, MOV, AVI, or MKV format)
2. Place it in the appropriate folder (create the folder if it doesn't exist)
3. Name it `demo.mp4` (or `demo.webm`, etc.) for automatic discovery
4. Alternatively, any video file in the folder will be used if no `demo.*` file exists

## Examples

```
frontend/public/
├── browser-use/
│   ├── demo.mp4          # ← This will be used for Mock Mode 1
│   └── screenshots/
├── github/
│   ├── demo.mp4          # ← This will be used for Mock Mode 2
│   └── other_files/
├── storylane/
│   └── demo.webm         # ← This will be used for Mock Mode 3
└── glimpse/
    ├── demo.mp4          # ← This will be used for Mock Mode 4 & 5
    └── assets/
```

## Fallback behavior

If no pre-recorded video is found for a mock mode, the system will fall back to generating the video using the agent as usual.

This feature only applies to:
- Non-free-run modes (mock modes 1-5)
- Video demo type (not screenshot mode)
- When a video file is found in the corresponding folder

Free-run mode will always generate videos dynamically since the content is user-defined. 