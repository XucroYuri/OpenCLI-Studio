# OpenCLI Studio

> 基于 [jackwener/OpenCLI](https://github.com/jackwener/OpenCLI) 持续演进的 Studio 化 Fork：保留上游自动化命令引擎，再在此基础上补强更易用的可视化工作台与产品体验。

[![English](https://img.shields.io/badge/docs-English-1D4ED8?style=flat-square)](./README.md)
[![上游仓库](https://img.shields.io/badge/upstream-jackwener%2FOpenCLI-111827?style=flat-square)](https://github.com/jackwener/OpenCLI)
[![当前仓库](https://img.shields.io/badge/repo-XucroYuri%2FOpenCLI--Studio-2563EB?style=flat-square)](https://github.com/XucroYuri/OpenCLI-Studio)
[![License](https://img.shields.io/npm/l/@jackwener/opencli?style=flat-square)](./LICENSE)

## 这个仓库是什么

OpenCLI Studio 是 OpenCLI 的一个长期维护 Fork。

- **上游仓库**：[jackwener/OpenCLI](https://github.com/jackwener/OpenCLI)
- **当前仓库**：[XucroYuri/OpenCLI-Studio](https://github.com/XucroYuri/OpenCLI-Studio)
- **Fork 目标**：持续继承上游 CLI、适配器与浏览器桥接能力，同时把 Studio 做成更适合高频使用的图形化自动化命令工作区

它不是一套和 OpenCLI 完全割裂的新运行时，而是“保留 OpenCLI 自动化内核 + 强化 Studio 产品层”的延伸版本。

## 从上游继承了什么

这个 Fork 继续继承 OpenCLI 最核心的能力：

- `opencli` CLI 入口和命令执行模型
- 网站适配器、桌面应用适配器和本地 CLI Hub 机制
- Browser Bridge、daemon、浏览器登录态复用模型
- `explore`、`synthesize`、`generate`、`cascade` 等适配器生成工作流
- 大部分上游命令元数据、文档结构和 release 资产

## 这个 Fork 重点增加了什么

OpenCLI Studio 更偏产品化和高频操作体验，尤其适合内容创作者与需要反复执行自动化命令的用户：

- Studio Web 界面：`总览 / 命令库 / 工作台 / 模板 / 检查 / 关于`
- 中英双语 i18n，并支持按浏览器语言自动适配
- 面向影视动画公司内容创作者的站点与自动化命令排序
- 基于分类目录的命令库浏览，而不是只按字母或数量查找
- 更清晰的登录态、依赖、前置条件引导
- 工作台结果区的信息优先展示，适合表格的结果默认优先表格
- 更紧凑、专业、适合高频使用的页面布局

## 兼容性说明

为了尽可能保持与上游兼容：

- npm 包名仍然是 `@jackwener/opencli`
- CLI 命令仍然是 `opencli`
- 大多数上游命令和使用方式仍然适用

所以更准确的理解方式是：

**它不是新的自动化引擎，而是 OpenCLI 的 Studio 化增强版。**

## 快速开始

### 启动 Studio 开发环境

```bash
npm install
npm run studio:dev:all
```

默认入口：

- [http://127.0.0.1:4173/overview](http://127.0.0.1:4173/overview)
- [http://127.0.0.1:4173/registry](http://127.0.0.1:4173/registry)

### 直接运行 CLI

```bash
npm run build
node dist/src/main.js list
node dist/src/main.js bilibili hot --limit 5
```

如果你希望全局安装：

```bash
npm install -g @jackwener/opencli
opencli list
```

## Releases 与扩展下载

当前 Fork 已维护自己的 release 页面，Studio 用户可以直接从这里获取扩展包与构建产物：

- [OpenCLI-Studio Releases](https://github.com/XucroYuri/OpenCLI-Studio/releases)

本仓库里的 Browser Bridge 下载提示，也已经改为默认指向当前 Fork 的 release 页面，而不是上游 release 页面。

## 与上游的同步策略

这个仓库的迭代方式是：

1. 定期从 `jackwener/OpenCLI` 同步 `main`
2. 当上游命令面、桥接能力或元数据发生变化时，在 Studio 一侧完成适配
3. 尽量把 Studio 特有的交互、排序、本地化和中间层兼容逻辑隔离在 Fork 内
4. 对于低侵入、可复用的部分，再考虑回流到上游仓库

## 代码入口

如果你只想补齐上游 skill 工作流，也可以按需安装：

```bash
npx skills add jackwener/opencli --skill opencli-usage
npx skills add jackwener/opencli --skill opencli-browser
npx skills add jackwener/opencli --skill opencli-explorer
npx skills add jackwener/opencli --skill opencli-oneshot
```

实际使用上：

- 需要把某个站点收成可复用命令时，优先走 `opencli-explorer`（涵盖自动和手动两种路径）
- 需要直接检查页面、操作页面时，再走 `opencli-browser`

- Studio 前端：[`studio/`](./studio)
- Studio 后端与聚合层：[`src/studio/`](./src/studio)
- 命令适配器文档索引：[`docs/adapters/index.md`](./docs/adapters/index.md)
- 上游项目主页：[jackwener/OpenCLI](https://github.com/jackwener/OpenCLI)

### `browser`：实时操作

当任务本身就是交互式页面操作时，使用 `opencli browser` 直接驱动浏览器。

### 内置适配器：稳定命令

当某个站点能力已经存在时，优先使用 `opencli hackernews top`、`opencli reddit hot` 这类稳定命令，而不是重新走一遍浏览器操作。

### `explore` / `synthesize` / `generate`：生成新的 CLI

当你需要的网站还没覆盖时：

- `explore` 负责观察页面、网络请求和能力边界
- `synthesize` 负责把探索结果转成 evaluate-based YAML 适配器
- `generate` 负责跑通 verified generation 主链路，最后要么给出可直接使用的命令，要么返回结构化的阻塞原因 / 人工介入结果

### `cascade`：认证策略探测

用 `cascade` 去判断某个能力应该优先走公开接口、Cookie 还是自定义 Header，而不是一开始就把适配器写死。

### CLI 枢纽与桌面端适配器

OpenCLI 不只是网站 CLI，还可以：

- 统一代理本地二进制工具，例如 `gh`、`docker`、`obsidian`
- 通过专门适配器和 CDP 集成控制 Electron 桌面应用

## 前置要求

- **Node.js**: >= 21.0.0
- 浏览器型命令需要 Chrome 或 Chromium 处于运行中，并已登录目标网站

> **重要**：浏览器型命令直接复用你的 Chrome/Chromium 登录态。如果拿到空数据或出现权限类失败，先确认目标站点已经在浏览器里打开并完成登录。

## 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENCLI_DAEMON_PORT` | `19825` | daemon-extension 通信端口 |
| `OPENCLI_WINDOW_FOCUSED` | `false` | 设为 `1` 时 automation 窗口在前台打开（适合调试） |
| `OPENCLI_BROWSER_CONNECT_TIMEOUT` | `30` | 浏览器连接超时（秒） |
| `OPENCLI_BROWSER_COMMAND_TIMEOUT` | `60` | 单个浏览器命令超时（秒） |
| `OPENCLI_BROWSER_EXPLORE_TIMEOUT` | `120` | explore/record 操作超时（秒） |
| `OPENCLI_CDP_ENDPOINT` | — | Chrome DevTools Protocol 端点，用于远程浏览器或 Electron 应用 |
| `OPENCLI_CDP_TARGET` | — | 按 URL 子串过滤 CDP target（如 `detail.1688.com`） |
| `OPENCLI_VERBOSE` | `false` | 启用详细日志（`-v` 也可以） |
| `OPENCLI_DIAGNOSTIC` | `false` | 设为 `1` 时在失败时输出结构化诊断上下文 |
| `DEBUG_SNAPSHOT` | — | 设为 `1` 输出 DOM 快照调试信息 |

## 更新

```bash
npm install -g @jackwener/opencli@latest

# 如果你在用打包发布的 OpenCLI skills，也一起刷新
npx skills add jackwener/opencli
```

如果你只装了部分 skill，也可以只刷新自己在用的：

```bash
npx skills add jackwener/opencli --skill opencli-usage
npx skills add jackwener/opencli --skill opencli-browser
npx skills add jackwener/opencli --skill opencli-explorer
npx skills add jackwener/opencli --skill opencli-oneshot
```

## 面向开发者

从源码安装：

```bash
git clone git@github.com:jackwener/opencli.git
cd opencli
npm install
npm run build
npm link
```

加载源码版 Browser Bridge 扩展：

1. 打开 `chrome://extensions` 并启用 **开发者模式**
2. 点击 **加载已解压的扩展程序**，选择本仓库里的 `extension/` 目录

## 内置命令

运行 `opencli list` 查看完整注册表。

| 站点 | 命令 | 模式 |
|------|------|------|
| **twitter** | `trending` `search` `timeline` `lists` `bookmarks` `profile` `thread` `following` `followers` `notifications` `post` `reply` `delete` `like` `likes` `article` `follow` `unfollow` `bookmark` `unbookmark` `download` `accept` `reply-dm` `block` `unblock` `hide-reply` | 浏览器 |
| **reddit** | `hot` `frontpage` `popular` `search` `subreddit` `read` `user` `user-posts` `user-comments` `upvote` `save` `comment` `subscribe` `saved` `upvoted` | 浏览器 |
| **tieba** | `hot` `posts` `search` `read` | 浏览器 |
| **hupu** | `hot` `search` `detail` `mentions` `reply` `like` `unlike` | 浏览器 |
| **cursor** | `status` `send` `read` `new` `dump` `composer` `model` `extract-code` `ask` `screenshot` `history` `export` | 桌面端 |
| **bilibili** | `hot` `search` `me` `favorite` `history` `feed` `subtitle` `dynamic` `ranking` `following` `user-videos` `download` | 浏览器 |
| **codex** | `status` `send` `read` `new` `dump` `extract-diff` `model` `ask` `screenshot` `history` `export` | 桌面端 |
| **chatwise** | `status` `new` `send` `read` `ask` `model` `history` `export` `screenshot` | 桌面端 |
| **doubao** | `status` `new` `send` `read` `ask` `history` `detail` `meeting-summary` `meeting-transcript` | 浏览器 |
| **doubao-app** | `status` `new` `send` `read` `ask` `screenshot` `dump` | 桌面端 |
| **notion** | `status` `search` `read` `new` `write` `sidebar` `favorites` `export` | 桌面端 |
| **discord-app** | `status` `send` `read` `channels` `servers` `search` `members` | 桌面端 |
| **v2ex** | `hot` `latest` `topic` `node` `user` `member` `replies` `nodes` `daily` `me` `notifications` | 公开 / 浏览器 |
| **xueqiu** | `feed` `hot-stock` `hot` `search` `stock` `comments` `watchlist` `earnings-date` `fund-holdings` `fund-snapshot` | 浏览器 |
| **antigravity** | `status` `send` `read` `new` `dump` `extract-code` `model` `watch` | 桌面端 |
| **chatgpt-app** | `status` `new` `send` `read` `ask` `model` | 桌面端 |
| **xiaohongshu** | `search` `notifications` `feed` `user` `download` `publish` `creator-notes` `creator-note-detail` `creator-notes-summary` `creator-profile` `creator-stats` | 浏览器 |
| **xiaoe** | `courses` `detail` `catalog` `play-url` `content` | 浏览器 |
| **quark** | `ls` `mkdir` `mv` `rename` `rm` `save` `share-tree` | 浏览器 |
| **uiverse** | `code` `preview` | 浏览器 |
| **apple-podcasts** | `search` `episodes` `top` | 公开 |
| **nowcoder** | `hot` `trending` `topics` `recommend` `creators` `companies` `jobs` `search` `suggest` `experience` `referral` `salary` `papers` `practice` `notifications` `detail` | 公开 / 浏览器 |
| **xiaoyuzhou** | `podcast` `podcast-episodes` `episode` | 公开 |
| **xiaoyuzhou** | `podcast` `podcast-episodes` `episode` `download` `transcript*` | 公开 |
| **zhihu** | `hot` `search` `question` `download` `follow` `like` `favorite` `comment` `answer` | 浏览器 |
| **weixin** | `download` | 浏览器 |
| **youtube** | `search` `video` `transcript` `comments` `channel` `playlist` `feed` `history` `watch-later` `subscriptions` `like` `unlike` `subscribe` `unsubscribe` | 浏览器 |
| **boss** | `search` `detail` `recommend` `joblist` `greet` `batchgreet` `send` `chatlist` `chatmsg` `invite` `mark` `exchange` `resume` `stats` | 浏览器 |
| **coupang** | `search` `add-to-cart` | 浏览器 |
| **bbc** | `news` | 公共 API |
| **bloomberg** | `main` `markets` `economics` `industries` `tech` `politics` `businessweek` `opinions` `feeds` `news` | 公共 API / 浏览器 |
| **ctrip** | `search` | 浏览器 |
| **devto** | `top` `tag` `user` | 公开 |
| **dictionary** | `search` `synonyms` `examples` | 公开 |
| **arxiv** | `search` `paper` | 公开 |
| **paperreview** | `submit` `review` `feedback` | 公开 |
| **wikipedia** | `search` `summary` `random` `trending` | 公开 |
| **hackernews** | `top` `new` `best` `ask` `show` `jobs` `search` `user` | 公共 API |
| **jd** | `item` | 浏览器 |
| **linkedin** | `search` `timeline` | 浏览器 |
| **reuters** | `search` | 浏览器 |
| **smzdm** | `search` | 浏览器 |
| **web** | `read` | 浏览器 |
| **weibo** | `hot` `search` `feed` `user` `me` `post` `comments` | 浏览器 |
| **yahoo-finance** | `quote` | 浏览器 |
| **sinafinance** | `news` | 🌐 公开 |
| **barchart** | `quote` `options` `greeks` `flow` | 浏览器 |
| **chaoxing** | `assignments` `exams` | 浏览器 |
| **grok** | `ask` `image` | 浏览器 |
| **hf** | `top` | 公开 |
| **jike** | `feed` `search` `create` `like` `comment` `repost` `notifications` `post` `topic` `user` | 浏览器 |
| **jimeng** | `generate` `history` | 浏览器 |
| **yollomi** | `generate` `video` `edit` `upload` `models` `remove-bg` `upscale` `face-swap` `restore` `try-on` `background` `object-remover` | 浏览器 |
| **linux-do** | `hot` `latest` `feed` `search` `categories` `category` `tags` `topic` `topic-content` `user-posts` `user-topics` | 浏览器 |
| **stackoverflow** | `hot` `search` `bounties` `unanswered` | 公开 |
| **steam** | `top-sellers` | 公开 |
| **weread** | `shelf` `search` `book` `highlights` `notes` `notebooks` `ranking` | 浏览器 |
| **douban** | `search` `top250` `subject` `photos` `download` `marks` `reviews` `movie-hot` `book-hot` | 浏览器 |
| **facebook** | `feed` `profile` `search` `friends` `groups` `events` `notifications` `memories` `add-friend` `join-group` | 浏览器 |
| **google** | `news` `search` `suggest` `trends` | 公开 |
| **amazon** | `bestsellers` `search` `product` `offer` `discussion` `movers-shakers` `new-releases` | 浏览器 |
| **1688** | `search` `item` `assets` `download` `store` | 浏览器 |
| **gitee** | `trending` `search` `user` | 公开 / 浏览器 |
| **gemini** | `new` `ask` `image` `deep-research` `deep-research-result` | 浏览器 |
| **spotify** | `auth` `status` `play` `pause` `next` `prev` `volume` `search` `queue` `shuffle` `repeat` | OAuth API |
| **notebooklm** | `status` `list` `open` `current` `get` `history` `summary` `note-list` `notes-get` `source-list` `source-get` `source-fulltext` `source-guide` | 浏览器 |
| **36kr** | `news` `hot` `search` `article` | 公开 / 浏览器 |
| **imdb** | `search` `title` `top` `trending` `person` `reviews` | 公开 |
| **producthunt** | `posts` `today` `hot` `browse` | 公开 / 浏览器 |
| **instagram** | `explore` `profile` `search` `user` `followers` `following` `follow` `unfollow` `like` `unlike` `comment` `save` `unsave` `saved` | 浏览器 |
| **lobsters** | `hot` `newest` `active` `tag` | 公开 |
| **medium** | `feed` `search` `user` | 浏览器 |
| **sinablog** | `hot` `search` `article` `user` | 浏览器 |
| **substack** | `feed` `search` `publication` | 浏览器 |
| **pixiv** | `ranking` `search` `user` `illusts` `detail` `download` | 浏览器 |
| **tiktok** | `explore` `search` `profile` `user` `following` `follow` `unfollow` `like` `unlike` `comment` `save` `unsave` `live` `notifications` `friends` | 浏览器 |
| **bluesky** | `search` `trending` `user` `profile` `thread` `feeds` `followers` `following` `starter-packs` | 公开 |
| **xianyu** | `search` `item` `chat` | 浏览器 |
| **douyin** | `videos` `publish` `drafts` `draft` `delete` `stats` `profile` `update` `hashtag` `location` `activities` `collections` | 浏览器 |
| **yuanbao** | `new` `ask` | 浏览器 |

87+ 适配器 — **[→ 查看完整命令列表](./docs/adapters/index.md)**

`*` `opencli xiaoyuzhou transcript` 需要本地小宇宙凭证：`~/.opencli/xiaoyuzhou.json`。

### 外部 CLI 枢纽

OpenCLI 也可以作为你现有命令行工具的统一入口，负责发现、自动安装和纯透传执行。

| 外部 CLI | 描述 | 示例 |
|----------|------|------|
| **gh** | GitHub CLI | `opencli gh pr list --limit 5` |
| **obsidian** | Obsidian 仓库管理 | `opencli obsidian search query="AI"` |
| **docker** | Docker 命令行工具 | `opencli docker ps` |
| **lark-cli** | 飞书 CLI — 消息、文档、日历、任务，200+ 命令 | `opencli lark-cli calendar +agenda` |
| **dingtalk** | 钉钉 CLI — 钉钉全套产品能力的跨平台命令行工具，支持人类和 AI Agent 使用 | `opencli dingtalk msg send --to user "hello"` |
| **wecom** | 企业微信 CLI — 企业微信开放平台命令行工具，支持人类和 AI Agent 使用 | `opencli wecom msg send --to user "hello"` |
| **vercel** | Vercel — 部署项目、管理域名、环境变量、日志 | `opencli vercel deploy --prod` |

**零配置透传**：OpenCLI 会把你的输入原样转发给底层二进制，保留原生 stdout / stderr 行为。

**自动安装**：如果你运行 `opencli gh ...` 时系统中还没有 `gh`，OpenCLI 会优先尝试通过系统包管理器安装，然后自动重试命令。

**注册自定义本地 CLI**：

```bash
opencli register mycli
```

### 桌面应用适配器

每个桌面适配器都有自己详细的文档说明，包括命令参考、启动配置与使用示例：

| 应用 | 描述 | 文档 |
|-----|-------------|-----|
| **Cursor** | 控制 Cursor IDE — Composer、对话、代码提取等 | [Doc](./docs/adapters/desktop/cursor.md) |
| **Codex** | 在后台（无头）驱动 OpenAI Codex CLI Agent | [Doc](./docs/adapters/desktop/codex.md) |
| **Antigravity** | 在终端直接控制 Antigravity Ultra | [Doc](./docs/adapters/desktop/antigravity.md) |
| **ChatGPT App** | 自动化操作 ChatGPT macOS 桌面客户端 | [Doc](./docs/adapters/desktop/chatgpt-app.md) |
| **ChatWise** | 多 LLM 客户端（GPT-4、Claude、Gemini） | [Doc](./docs/adapters/desktop/chatwise.md) |
| **Notion** | 搜索、读取、写入 Notion 页面 | [Doc](./docs/adapters/desktop/notion.md) |
| **Discord** | Discord 桌面版 — 消息、频道、服务器 | [Doc](./docs/adapters/desktop/discord.md) |
| **Doubao** | 通过 CDP 控制豆包桌面应用 | [Doc](./docs/adapters/desktop/doubao-app.md) |

## 下载支持

OpenCLI 支持从各平台下载图片、视频和文章。

### 支持的平台

| 平台 | 内容类型 | 说明 |
|------|----------|------|
| **小红书** | 图片、视频 | 下载笔记中的所有媒体文件 |
| **B站** | 视频 | 需要安装 `yt-dlp` |
| **Twitter/X** | 图片、视频 | 从用户媒体页或单条推文下载 |
| **Pixiv** | 图片 | 下载原始画质插画，支持多页作品 |
| **1688** | 图片、视频 | 下载商品页中可见的商品素材 |
| **小宇宙** | 音频、转录 | 从公开单集数据下载音频，并使用本地凭证下载转录 JSON / 文本 |
| **知乎** | 文章（Markdown） | 导出文章，可选下载图片到本地 |
| **微信公众号** | 文章（Markdown） | 导出微信公众号文章为 Markdown |
| **豆瓣** | 图片 | 下载电影条目的海报 / 剧照图片 |

### 前置依赖

下载流媒体平台的视频需要安装 `yt-dlp`：

```bash
# 安装 yt-dlp
pip install yt-dlp
# 或者
brew install yt-dlp
```

### 使用示例

```bash
# 下载小红书笔记中的图片/视频
opencli xiaohongshu download "https://www.xiaohongshu.com/search_result/<id>?xsec_token=..." --output ./xhs
opencli xiaohongshu download "https://xhslink.com/..." --output ./xhs

# 下载B站视频（需要 yt-dlp）
opencli bilibili download BV1xxx --output ./bilibili
opencli bilibili download BV1xxx --quality 1080p  # 指定画质

# 下载 Twitter 用户的媒体
opencli twitter download elonmusk --limit 20 --output ./twitter

# 下载单条推文的媒体
opencli twitter download --tweet-url "https://x.com/user/status/123" --output ./twitter

# 下载豆瓣电影海报 / 剧照
opencli douban download 30382501 --output ./douban

# 下载 1688 商品页中的图片 / 视频素材
opencli 1688 download 841141931191 --output ./1688-downloads

# 下载小宇宙单集音频
opencli xiaoyuzhou download 69b3b675772ac2295bfc01d0 --output ./xiaoyuzhou

# 下载小宇宙单集转录
opencli xiaoyuzhou transcript 69dd0c98e2c8be31551f6a33 --output ./xiaoyuzhou-transcripts

# 导出知乎文章为 Markdown
opencli zhihu download "https://zhuanlan.zhihu.com/p/xxx" --output ./zhihu

# 导出并下载图片
opencli zhihu download "https://zhuanlan.zhihu.com/p/xxx" --download-images

# 导出微信公众号文章为 Markdown
opencli weixin download --url "https://mp.weixin.qq.com/s/xxx" --output ./weixin
```

`opencli xiaoyuzhou transcript` 需要本地小宇宙凭证：`~/.opencli/xiaoyuzhou.json`。



## 输出格式

所有内置命令都支持 `--format` / `-f`，可选值为 `table`、`json`、`yaml`、`md`、`csv`。
`list` 命令也支持同样的格式参数，同时继续兼容 `--json`。

```bash
opencli list -f yaml            # 用 YAML 列出命令注册表
opencli bilibili hot -f table   # 默认：富文本表格
opencli bilibili hot -f json    # JSON（适合传给 jq 或者各类 AI Agent）
opencli bilibili hot -f yaml    # YAML（更适合人类直接阅读）
opencli bilibili hot -f md      # Markdown
opencli bilibili hot -f csv     # CSV
opencli bilibili hot -v         # 详细模式：展示管线执行步骤调试信息
```

## 退出码

opencli 遵循 Unix `sysexits.h` 惯例，可无缝接入 shell 管道和 CI 脚本：

| 退出码 | 含义 | 触发场景 |
|--------|------|----------|
| `0` | 成功 | 命令正常完成 |
| `1` | 通用错误 | 未分类的意外错误 |
| `2` | 用法错误 | 参数错误或未知命令 |
| `66` | 无数据 | 命令返回空结果（`EX_NOINPUT`） |
| `69` | 服务不可用 | Browser Bridge 未连接（`EX_UNAVAILABLE`） |
| `75` | 临时失败 | 命令超时，可重试（`EX_TEMPFAIL`） |
| `77` | 需要认证 | 未登录目标网站（`EX_NOPERM`） |
| `78` | 配置错误 | 凭证缺失或配置有误（`EX_CONFIG`） |
| `130` | 中断 | Ctrl-C / SIGINT |

```bash
opencli bilibili hot 2>/dev/null
case $? in
  0)   echo "ok" ;;
  69)  echo "请先启动 Browser Bridge" ;;
  77)  echo "请先登录 bilibili.com" ;;
esac
```

## 插件

通过社区贡献的插件扩展 OpenCLI。插件使用与内置命令相同的 JS 格式，启动时自动发现。

```bash
opencli plugin install github:user/opencli-plugin-my-tool  # 安装
opencli plugin list                                         # 查看已安装
opencli plugin update my-tool                               # 更新到最新
opencli plugin update --all                                 # 更新全部已安装插件
opencli plugin uninstall my-tool                            # 卸载
```

当 plugin 的版本被记录到 `~/.opencli/plugins.lock.json` 后，`opencli plugin list` 也会显示对应的短 commit hash。

| 插件 | 类型 | 描述 |
|------|------|------|
| [opencli-plugin-github-trending](https://github.com/ByteYue/opencli-plugin-github-trending) | JS | GitHub Trending 仓库 |
| [opencli-plugin-hot-digest](https://github.com/ByteYue/opencli-plugin-hot-digest) | JS | 多平台热榜聚合 |
| [opencli-plugin-juejin](https://github.com/Astro-Han/opencli-plugin-juejin) | JS | 稀土掘金热门文章 |
| [opencli-plugin-vk](https://github.com/flobo3/opencli-plugin-vk) | JS | VK (VKontakte) 动态、信息流和搜索 |

详见 [插件指南](./docs/zh/guide/plugins.md) 了解如何创建自己的插件。

## 致 AI Agent（开发者指南）

如果你是一个被要求查阅代码并编写新 `opencli` 适配器的 AI，请遵守以下工作流。

> **快速模式**：只想为某个页面快速生成一个命令？看 [opencli-oneshot skill](./skills/opencli-oneshot/SKILL.md) — 给一个 URL + 一句话描述，4 步搞定。

> **完整模式**：在编写任何新代码前，先阅读 [opencli-explorer skill](./skills/opencli-explorer/SKILL.md)。它包含完整的适配器探索开发指南、API 探测流程、5级认证策略以及常见陷阱。

```bash
# 1. Deep Explore — 网络拦截 → 响应分析 → 能力推理 → 框架检测
opencli explore https://example.com --site mysite

# 2. Synthesize — 从探索成果物生成 evaluate-based TS 适配器
opencli synthesize mysite

# 3. Generate — 一键完成：探索 → 合成 → 注册
opencli generate https://example.com --goal "hot"

# 4. Strategy Cascade — 自动降级探测：PUBLIC → COOKIE → HEADER
opencli cascade https://api.example.com/data
```

探索结果输出到 `.opencli/explore/<site>/`。

## 常见问题排查

- **"Extension not connected" 报错**
  - 确保你当前的 Chrome 或 Chromium 已安装且**开启了** opencli Browser Bridge 扩展（在 `chrome://extensions` 中检查）。
- **"attach failed: Cannot access a chrome-extension:// URL" 报错**
  - 其他 Chrome/Chromium 扩展（如 youmind、New Tab Override 或 AI 助手类扩展）可能产生冲突。请尝试**暂时禁用其他扩展**后重试。
- **返回空数据，或者报错 "Unauthorized"**
  - Chrome/Chromium 里的登录态可能已经过期。请打开当前页面，在新标签页重新手工登录或刷新该页面。
- **Node API 错误 (如 parseArgs, fs 等)**
  - 确保 Node.js 版本 `>= 21`（`node:util` 的 `styleText` 需要 Node 21+）。
- **Daemon 问题**
  - 检查 daemon 状态：`curl localhost:19825/status`
  - 查看扩展日志：`curl localhost:19825/logs`


## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=jackwener/opencli&type=Date)](https://star-history.com/#jackwener/opencli&Date)



## License

[Apache-2.0](./LICENSE)
