# 项目交接 / 快速上手（给新会话或本人）

> 本仓库 = 个人学习博客「拾级而上 · 自考 × 考研学习笔记」，纯前端（无框架/无构建步骤）
> + Cloudflare Worker（`worker.js` 作入口，静态资源走 ASSETS 绑定）。
> 读到本文档即可在几分钟内接上所有上下文，无需依赖旧聊天记录或过时的 .zcode 计划文件。

## 一句话架构
- 代码与文章都在本 git 仓库（`D:\zikao\blog`），分支 `main`，远端 `qianchenglei/blog`。
- 部署：`git push origin main` → Cloudflare **Workers Builds** 自动构建上线
  （**别用 `npx wrangler deploy`**，会覆盖成不带网页变量/丢失线上配置的部署）。
- 域名：`qianchenglei.xyz`。文章/页面用 **hash 路由**，worker 另做"无后缀干净地址"映射：
  `/status → /status.html`、`/admin → /admin.html`、`/post → /post.html`、`/index → /index.html`。
- 文章卡片链接统一为 `post#p=<file>`（不带 `.html`）；入口全在 `assets/main.js` 的 hash 路由，
  与服务器/部署方式无关（本地 `file://` 下依然不行，仍需起本地服务器，见下）。

## 目录结构（关键文件）
```
blog/
├── worker.js            # Worker 入口：/api/* 后台 API；干净 URL 映射；其余交给 ASSETS
├── wrangler.jsonc       # Worker 名 blog、入口、静态资源目录、/api/* run_worker_first
├── .assetsignore        # 不发布到线上的"内部文件"（.git/.wrangler/worker.js/.dev.vars/tools 等）
├── index.html           # 主页（data-page="index"，hash 路由渲染 #/、#/shelf、#/posts、#/course/<id>）
├── post.html            # 文章页（data-page="post"，读 #p=<file>[&s=sec-N]）
├── admin.html           # 管理后台（登录 + 发/改/删文章，调 /api/*）
├── status.html          # 发布状态页（读 /api/status，45s 自动刷新）
├── assets/
│   ├── main.js          # 前端全部逻辑：SITE 配置 + 拉 courses.json + hash 路由 + Markdown 渲染
│   ├── style.css        # 样式（自动深浅色 + 手动切换）
│   ├── courses.json     # ★ 书架书目/章节数据（纯 JSON，加书/章节/挂笔记只改它）
│   └── covers/          # 封面图 + manifest.json（封面清单）
├── posts/               # ★ 文章（Markdown，按科目分子目录 ds/ politics/ meta/）
├── posts.json           # ★ 文章清单（首页列表/文章元数据的来源）
├── robots.txt / .dev.vars(不入库) / README.md
└── tools/               # 本目录（update-covers.mjs / check-status.cmd / AGENTS.md）
```

## 主页/书架怎么运作
- 三条主要 hash 路由都跑在 `index.html`：`#/`（橱窗首页）、`#/posts`（全部文章+标签筛选）、
  `#/course/<id>`（某本书的知识结构页）。`#/shelf` 自动滚到书架。
- 书架书目与章节配置在 **`assets/courses.json`**（纯 JSON，`main.js` 启动时 `getCourses()` 拉取渲染）。
  加书 / 加章节 / 把笔记挂进某章：只改这个 JSON。
- 每本书封面会自动在 `assets/covers/` 找 `<id>.jpg|jpeg|png|webp`，找不到就画渐变占位封面。
  **封面查找走清单制**：页面只读 `assets/covers/manifest.json` 一次，不再逐个扩展名探测（消除大量 404）。
  加/删封面图后跑 `node tools/update-covers.mjs` 重建清单再一起 push。
- 知识树锚点：文章里的 `##`（二级标题）自动带 `id="sec-N"`（N 从 1 数）；课程章节的 `files` 里
  配 `sec` 即可让"阅读本章笔记"跳到文章对应小节并高亮。单篇挂载写 `file`，多篇写 `files` 数组。

## 文章数据与写新文章
- 文章本体：`posts/<科目>/<file>.md`。头部支持可选 frontmatter `--- ... ---`（title/date/tags）。
- 清单：`posts.json`（每条含 `file`/`title`/`date`/`tags`/`summary`，`file` 是相对 `posts/` 的路径）。
  前端读它渲染首页、文章页元数据与文章链接。
- 写新文章三步：1) 在 `posts/` 建 md（建议英文名+科目子目录）；2) 在 `posts.json` 加一条；
  3)（可选）在 `assets/courses.json` 对应书里把笔记挂进某章。
  用 `/admin` 后台发文章会自动完成第 2 步（并 push 提交、触发部署）。
- **线上文章也是仓库内容**：worker 的保存/删除都通过 GitHub API 提交到 `main`，Workers Builds 再部署。
  所以"文章与代码"是同一个源，改线上文章本质是改仓库并重新部署。

## 已上线且正常
- 主页书架 / 全部文章标签筛选 / 课程知识结构页 / 深色模式切换。
- 文章页 `/post#p=...`（含 `&s=sec-N` 小节锚点、从书架进来时"← 返回那本书"用 sessionStorage.lastCourse）。
- 发布状态页 `/status`（数据来自 `/api/status`）。
- 管理后台 `/admin`（登录、列/建/改/删文章，Ctrl+S 保存、草稿自动暂存、Markdown 预览）。
- Worker 层 4 个 secret 已配好（见下"环境变量"）。

## 常用命令（在 D:\zikao\blog 目录）
```cmd
:: 发布 / 更新（触发自动部署，约 1-2 分钟）
git add -A
git commit -m "说明"
git push origin main

:: 本地查要不要 push / 差多少
tools\check-status.cmd

:: 加了封面图后重建清单（改完一起 push）
node tools/update-covers.mjs

:: 改 worker.js 后语法检查
node --check worker.js
```
本地看发布状态：打开 `/status`（线上）或跑 `tools\check-status.cmd`（本地）。

### 本地预览（重要）
浏览器不允许 `file://` 页面发请求，双击 HTML 看不到内容。任选其一：
```bash
npx serve .                 # 只有 Node：仅静态页面（index/post/admin 界面）
python -m http.server       # 只有 Python：同上
npx wrangler dev --port 8790 # 要测 /api/*（登录/保存文章）：静态+后台一起跑
```
`wrangler dev` 的本地后台环境变量从 **`.dev.vars`** 读（已被 .gitignore 忽略，不入库），示例：
```
ADMIN_USER=admin
ADMIN_PASS=你的测试密码
GH_TOKEN=xxx（随便填，保存文章才会真连 GitHub）
```

## 关键环境变量（值不写在此，收口在 CF Worker 的 Settings→Variables and Secrets）
- `ADMIN_USER` / `ADMIN_PASS`：管理后台登录
- `GH_TOKEN`：GitHub Personal Access Token，仅授权 `qianchenglei/blog`，Contents **Read and write**
- `CF_API_TOKEN`：Cloudflare 只读 API Token（用于 `/api/status` 查最近部署；账户自动解析，无需 CF_ACCOUNT_ID）
- 可选：`GH_REPO`（默认 qianchenglei/blog）、`GH_BRANCH`（默认 main）、`COOKIE_SECRET`
  （Cookie 签名密钥，不填由账号密码派生）、`CF_ACCOUNT_ID`、`CF_PROJECT`（默认 blog）、
  `CF_DEPLOY_KIND`（worker/pages，默认 worker）

## 常见坑备忘
- **Worker 变量分层**：Workers Builds 页那套变量不一定注入运行时；要用的 secret 一律放
  **Worker 本体的 Settings → Variables and Secrets**（已统一收口到这一层）。
- 别用 `npx wrangler deploy` 覆盖部署 / 别用 `npx wrangler versions upload`（只上传不切流量，
  线上一直旧版本）。部署跟随 `git push origin main`。
- 文章/封面改动都要 push 后构建完才上线；封面清单要先 `node tools/update-covers.mjs` 重建再一起 push。
- 文件名规则（后台/worker 校验）：只允许中英文、数字、`- _ . ( )` 与空格，以 `.md` 结尾，可含分类子目录
  （如 `ds/xxx.md`），长度 ≤160；禁止 `..` 与 `\`。
- 文章链接务必统一 hash 写法 `post#p=<file>`，**不要**用 `?p=` 查询串或带 `.html`（本地某些预览器
  会丢弃查询串 / 重定向丢参数；hash 任何服务器都保留）。已在 `posts/meta/hello.md` 等处统一。
- MinGW 编译 C++ 时别把 `<windows.h>` include 在 `<iostream>` 之前（std::byte 歧义）——这条是仓库内
  C 工程（D:\zikao\13003 等）的坑，与博客本身无关但一并记着。

## 当前发布内容（截至本文）
- 书架书：考研政治、数据结构（13003）、高等数学 / 线性代数 / 概率论、英语（专升本 / 英语一 四件套）、
  408 计组 / 操作系统 / 网络。其中 **politics** 与 **ds** 两本已有章节+挂载笔记，其余多为"整理中"空章节。
- 已发布文章（posts.json 驱动，约 13 篇，分散在 ds/ politics/ meta/）：如多篇数据结构手写实现总结、
  《马克思主义基本原理复习长文》、《博客开张》、写作指南、在读课程清单等。
- 待办/可能补：`posts/politics` 目前主要是马原；近现代史/习思想等章节尚未挂笔记（可复用
  D:\zikao 下 15043/15040 的复习资料逐步写成文章挂进 politics 书的章节）。

## 待办 / 开放项
- 稀疏矩阵（系数矩阵）压缩：三元组顺序表 + 转置（数据结构的 C++ 工程 StringMatch；
  对称/三角已完成，见 `posts/ds/ds-stringmatch-cpp-fixes.md` 与 `posts/ds/ds-stringmatch-tri-matrix.md`）。
- 若做考研/版权资料分享：用 Cloudflare R2（私有桶 + 签名 URL），别公开挂版权 PDF。
- robots.txt：目前 Cloudflare 托管生成会覆盖；若要用自己的，需在 CF 关掉"内容信号/托管 robots"
  或确认部署下发后再看。
- courses.json 里多数书章节为空（"整理中"）；逐步把 D:\zikao 各科复习资料整理成文章挂进对应书。

## 过期信息提醒
`.zcode\plans\` 下的旧计划文件（如本会话开头那份 "修复文章页链接"）只反映更早期纯静态 + `?p=`
的状态，**已过时**；博客现状一律以本文档 + `git status/log` + `tools\check-status.cmd` 为准。
