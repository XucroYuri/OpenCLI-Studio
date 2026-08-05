<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# src/download

## Purpose
Media and article download pipeline. Handles downloading images, videos, audio, and articles from supported platforms (xiaohongshu, bilibili, twitter, douban, pixiv, 1688, xiaoyuzhou, zhihu, weixin). Provides progress tracking, format conversion, and output directory management.

## Key Files
| File | Description |
|------|-------------|
| `index.ts` | Barrel export for download module |
| `media-download.ts` | Media downloader -- images, videos, audio with progress tracking |
| `article-download.ts` | Article downloader -- converts web articles to Markdown with optional image download |
| `progress.ts` | Download progress tracking and reporting |
| `index.test.ts` | Tests for download module |

## For AI Agents

### Working In This Directory
- Video downloads require `yt-dlp` installed (`brew install yt-dlp`).
- Audio downloads (xiaoyuzhou) require local credentials in `~/.opencli/xiaoyuzhou.json`.
- The download module is consumed by adapter commands that support `download` subcommands.
- Article downloads use `turndown` for HTML-to-Markdown conversion.

### Testing Requirements
- Tests in `index.test.ts` -- covers download pipeline with mocked HTTP responses.
- Video download tests may be skipped if `yt-dlp` is not installed.

### Common Patterns
- Downloads stream content to disk with progress callbacks
- Output directory specified via `--output` flag, defaults to `./downloads`
- Media format detection from Content-Type headers

## Dependencies

### Internal
- `clis/` adapters with download support (bilibili, xiaohongshu, twitter, etc.)

### External
- `yt-dlp` (optional, for video downloads)
- `turndown` -- HTML to Markdown
- `undici` -- HTTP client for streaming downloads

<!-- MANUAL: -->
