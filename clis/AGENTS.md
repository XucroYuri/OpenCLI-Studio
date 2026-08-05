<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-05T13:49:11Z | Updated: 2026-08-05T13:49:11Z -->

# clis

## Purpose
96 CLI site adapters that turn websites and web apps into command-line interfaces. Each adapter defines commands, authentication strategies, and output formats for a specific platform. Adapters can be written in YAML (declarative) or TypeScript (programmatic). The `web` adapter serves as a generic fallback for arbitrary sites.

## Key Files
| File | Description |
|------|-------------|
| `_shared/` | Shared adapter utilities and common helpers used across adapters |

## Subdirectories (96 Site Adapters)
| Directory | Site | Directory | Site |
|-----------|------|-----------|------|
| `1688/` | 1688 (Alibaba B2B) | `36kr/` | 36Kr (tech news) |
| `amazon/` | Amazon | `antigravity/` | Antigravity |
| `apple-podcasts/` | Apple Podcasts | `arxiv/` | arXiv (academic papers) |
| `band/` | Band | `barchart/` | Barchart (financial data) |
| `bbc/` | BBC News | `bilibili/` | Bilibili (video platform) |
| `binance/` | Binance (crypto exchange) | `bloomberg/` | Bloomberg |
| `bluesky/` | Bluesky Social | `boss/` | BOSS Zhipin (recruitment) |
| `chaoxing/` | Chaoxing (education) | `chatgpt/` | ChatGPT |
| `chatgpt-app/` | ChatGPT Desktop App | `chatwise/` | Chatwise |
| `cnki/` | CNKI (academic database) | `codex/` | Codex |
| `coupang/` | Coupang (e-commerce) | `ctrip/` | Ctrip (travel) |
| `cursor/` | Cursor IDE | `devto/` | DEV.to |
| `dictionary/` | Dictionary | `discord-app/` | Discord App |
| `douban/` | Douban (books/movies) | `doubao/` | Doubao (AI assistant) |
| `doubao-app/` | Doubao App | `douyin/` | Douyin (TikTok China) |
| `eastmoney/` | East Money (finance) | `facebook/` | Facebook |
| `gemini/` | Google Gemini | `gitee/` | Gitee (code hosting) |
| `google/` | Google Search | `grok/` | Grok (xAI) |
| `hackernews/` | Hacker News | `hf/` | Hugging Face |
| `hupu/` | Hupu (sports/forum) | `imdb/` | IMDb |
| `instagram/` | Instagram | `jd/` | JD.com (e-commerce) |
| `jianyu/` | Jianyu | `jike/` | Jike (social) |
| `jimeng/` | Jimeng (AI image gen) | `ke/` | Ke |
| `lesswrong/` | LessWrong | `linkedin/` | LinkedIn |
| `linux-do/` | Linux Do (forum) | `lobsters/` | Lobsters (tech) |
| `maimai/` | Maimai (professional network) | `medium/` | Medium |
| `mubu/` | Mubu (notes/outliner) | `notebooklm/` | NotebookLM |
| `notion/` | Notion | `nowcoder/` | NowCoder |
| `ones/` | ONES (project management) | `paperreview/` | PaperReview |
| `pixiv/` | Pixiv (art) | `producthunt/` | Product Hunt |
| `quark/` | Quark (browser/cloud) | `reddit/` | Reddit |
| `reuters/` | Reuters | `sinablog/` | Sina Blog |
| `sinafinance/` | Sina Finance | `slock/` | Slock |
| `smzdm/` | SMZDM (deals) | `spotify/` | Spotify |
| `stackoverflow/` | Stack Overflow | `steam/` | Steam |
| `substack/` | Substack | `taobao/` | Taobao (e-commerce) |
| `tdx/` | TDX | `ths/` | THS (finance) |
| `tieba/` | Baidu Tieba (forum) | `tiktok/` | TikTok |
| `twitter/` | Twitter/X | `uiverse/` | Uiverse (UI) |
| `v2ex/` | V2EX (tech community) | `web/` | **Generic fallback adapter** |
| `weibo/` | Weibo (social) | `weixin/` | WeChat articles |
| `weread/` | WeRead (books) | `wikipedia/` | Wikipedia |
| `xianyu/` | Xianyu (second-hand) | `xiaoe/` | Xiaoe (education) |
| `xiaohongshu/` | Xiaohongshu/RED | `xiaoyuzhou/` | Xiaoyuzhou (podcasts) |
| `xueqiu/` | Xueqiu (investing) | `yahoo-finance/` | Yahoo Finance |
| `yollomi/` | Yollomi | `youtube/` | YouTube |
| `yuanbao/` | Yuanbao (AI) | `zhihu/` | Zhihu (Q&A) |
| `zsxq/` | ZSXQ (knowledge community) | | |

## For AI Agents

### Working In This Directory
- **Adapter Structure**: Each adapter directory typically contains a YAML config file defining commands, arguments, auth strategy, and output format. Some also include TypeScript files for programmatic adapter logic.
- **Shared Utils**: `_shared/` contains utilities that multiple adapters use -- check here before duplicating logic.
- **YAML Adapters**: Declarative config with command definitions, selectors, and output templates. Preferred for simple CRUD-like site interactions.
- **TypeScript Adapters**: Programmatic adapters for complex sites that need custom logic beyond YAML capabilities.
- **Generic Adapter**: `web/` adapter is a fallback -- it provides generic page fetch/read commands for any URL.
- **Auth Strategy**: Defined per adapter -- cookies, OAuth, API key, or anonymous.

### Testing Requirements
- Adapter tests may exist in project's test suites.
- Manual testing: run `opencli` with the adapter name to verify commands.
- Each adapter should define at minimum: a search/list command, a detail/view command, and auth strategy.

### Common Patterns
- Adapter naming: use the site's commonly known name, lowercase with hyphens.
- Auth configuration references environment variables or credential files, never hardcoded secrets.
- New adapters must be registered in `cli-manifest.json` (auto-generated).
- Follow the auth strategy decision tree documented in `skills/opencli-explorer/references/`.

## Dependencies

### Internal
- OpenCLI core engine (in `src/`)
- Shared utilities in `_shared/`
- `cli-manifest.json` -- auto-generated from adapter configs

### External
- Node >= 21 or Bun >= 1.0 (runtime)

<!-- MANUAL: -->
