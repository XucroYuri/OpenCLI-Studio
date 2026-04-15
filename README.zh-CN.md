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

- Studio 前端：[`studio/`](./studio)
- Studio 后端与聚合层：[`src/studio/`](./src/studio)
- 命令适配器文档索引：[`docs/adapters/index.md`](./docs/adapters/index.md)
- 上游项目主页：[jackwener/OpenCLI](https://github.com/jackwener/OpenCLI)
