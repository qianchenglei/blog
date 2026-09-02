# 拾级而上 · 自考 × 考研学习博客

一个纯静态博客：没有框架、没有构建步骤、没有任何依赖，Markdown 写文章，
推到 GitHub 后用 Cloudflare Pages 托管，push 即自动部署。

## 目录结构

```
blog/
├── index.html        # 主页（书架橱窗 + 课程知识结构，hash 路由切换）
├── post.html         # 文章页（渲染 Markdown）
├── assets/
│   ├── style.css     # 样式（自动深浅色，右上角手动切换）
│   ├── main.js       # 站点配置 + 书架/课程配置 + 路由 + 渲染逻辑
│   └── covers/       # （可选）书架封面图片，assets/covers/<课程id>.jpg
├── posts/            # ★ 所有文章（Markdown）
├── posts.json        # ★ 文章清单（首页列表的来源）
└── README.md
```

纯静态部署**不需要**任何配置文件，也不需要构建命令。

## 主页怎么运作（三条路由）

纯 hash 路由，都在 `index.html` 里切换，不需要服务器配置：

- `#/` 主页：橱窗式首页（Hero + 书架 + 最新笔记）
- `#/shelf` 同主页，但自动滚到书架
- `#/posts` 全部文章（标签筛选）
- `#/course/<id>` 一门课的知识结构页（点书架上的书进入）

## 书架与知识结构（改 `assets/main.js` 里的 `COURSES`）

书架上每一本书是一个对象：

- `id`：路由里用的标识（如 `marxism`）；封面会自动找 `assets/covers/<id>.jpg`（也支持 jpeg/png/webp），**找不到就自动画一个占位封面**，以后把图片丢进 `assets/covers/` 即生效
- `color` / `color2`：这本书的主题色（占位封面渐变、知识树节点）
- `chapters`：知识树的章节，`points` 是本章知识点（纯展示），`file` 填 `posts/` 里的文件名，`sec` 填该文章里**第几个二级标题**（`##` 从 1 开始数）——点“阅读本章笔记”会直接跳到文章那一段并高亮
- `tags`：与文章标签对应，课程页底部会自动列出“相关笔记”

文章页的“← 返回”会记住你从哪本书进来，直接回到那门课的知识结构。

## 写新文章（两步）

1. 在 `posts/` 下新建 `xxx.md`（文件名建议用英文；建议按科目放入子目录，如 `posts/ds/`、`posts/politics/`、`posts/meta/`，便于本地查找）
2. 在 `posts.json` 数组里加一条，`file` 填 **相对 posts/ 的路径**（如在子目录里写 `"ds/xxx.md"`；格式看 `posts/markdown-guide.md` 里的示例）

刷新首页即可看到。语法示例与图片用法见站内《写作指南》一文。

## 改站名 / 简介 / 页脚

打开 `assets/main.js`，只改最顶上的 `SITE` 配置。

## 本地预览

浏览器不允许 `file://` 页面发请求，所以双击打开 HTML 看不到内容。
在 blog 目录下任选一种方式起个本地服务器：

```bash
npx serve .                # 有 Node（只看静态页面）
python -m http.server      # 有 Python（只看静态页面）
```

然后访问终端里显示的地址（如 http://localhost:3000）。

**如果还要测管理后台的 API**（登录/保存文章），用 `npx wrangler dev`：

```bash
npx wrangler dev --port 8790
```

它会把静态资源和 `/api/*` 一起跑起来，访问 `http://localhost:8790/` 或
`http://localhost:8790/admin.html`。本地环境变量从 `.dev.vars` 读（见下文
"管理后台" 一节，文件已被 .gitignore 忽略）。

## 部署方案：Cloudflare Worker + 静态资源 + 管理后台

站点由一个 **Worker**（`worker.js`）+ **静态资源**（仓库根目录的文件）组成，
由 Workers Builds 自动部署：每次 `git push` 到 GitHub，Cloudflare 自动跑
`npx wrangler deploy` 上线。

- `worker.js`：管理后台的 API（`/api/login`、`/api/posts`、`/api/save` 等），
  其余请求交给静态资源层返回。
- `wrangler.jsonc`：Worker 名、入口、静态资源目录。
- `.assetsignore`：不把 `.git/`、`worker.js`、`.dev.vars` 等内部文件当静态资源发布。
- 自定义域名 `qianchenglei.xyz`（见 Cloudflare Dashboard → Workers → blog → Domains）。

### 新机器 / 首次部署

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create** → **Workers** → **Connect to Git**，选 `qianchenglei/blog`。
2. **Build settings**：
   - Build command: `npx wrangler deploy`
   - 部署触发分支：`main`
3. 环境变量（Worker → Settings → Variables and Secrets），添加
   `ADMIN_USER` / `ADMIN_PASS` / `GH_TOKEN` 三项（见"管理后台"一节）。
4. 保存。之后每次 `git push` 到 main 都会自动重新部署。

> 本地手动部署也行：`npx wrangler deploy`（已登录 `npx wrangler login`）。
> ⚠️ 不要用 `npx wrangler versions upload`：它只上传新版本，不会把流量切到
> 生产，线上会一直是旧版本。

## 管理后台（在线写文章）

打开 `/admin.html`（如 `https://qianchenglei.xyz/admin.html`），账号密码登录后
即可新建、修改、删除文章，支持 Markdown 预览、Ctrl+S 快速保存、草稿自动暂存。
每次保存会向 GitHub 推送一个提交（同时更新 `posts/xxx.md` 和 `posts.json`），
Workers Builds 自动重新部署，约 1 分钟后线上生效。

首次启用只需三步：

1. **生成 GitHub Token**：GitHub → Settings → Developer settings →
   [Fine-grained tokens](https://github.com/settings/personal-access-tokens) →
   Generate new token。**Repository access 选本仓库**，权限里
   **Contents 设为 Read and write**，其余保持默认。
2. **配置环境变量**：Cloudflare Dashboard → Workers → blog →
   **Settings → Variables and Secrets**，添加：
   - `ADMIN_USER` 后台登录用户名
   - `ADMIN_PASS` 后台登录密码
   - `GH_TOKEN` 上面生成的 Token

   可选项：`GH_REPO`（默认 `qianchenglei/blog`）、`GH_BRANCH`（默认 `main`）、
   `COOKIE_SECRET`（Cookie 签名密钥，不填则由账号密码派生）。
3. **重新部署一次**：推送任意提交（或 Workers → blog → Deployments → Retry），
   让新代码上线。

安全说明：密码只存在 Cloudflare 环境变量里；登录后签发 HMAC 签名的
HttpOnly Cookie（12 小时有效）；GitHub Token 只存在服务端，不会下发到浏览器。

### 本地调试后台

在 blog 目录建一个 `.dev.vars` 文件（已被 .gitignore 忽略，不会提交）：

```
ADMIN_USER=admin
ADMIN_PASS=你的测试密码
GH_TOKEN=你的token（或随便填，读文章会报错）
```

然后 `npx wrangler dev --port 8790`，访问 `http://localhost:8790/admin.html`。

## 常见问题

### 改了代码但线上没更新？

确认两点：
1. 改动已经 `git push` 到 GitHub（Workers Builds 只跟随 GitHub 上的 main）。
2. 在 Workers → blog → **Deployments** 里能看到最新一次构建成功。

### 部署失败了？

看 Workers → blog → **Deployments** → 失败的那次 → 查看日志。常见错误：
- 环境变量没配（`ADMIN_USER` / `ADMIN_PASS` / `GH_TOKEN`）。
- `.assetsignore` 里的文件路径写错了。

### `/admin.html` 能打开但 `/api/*` 返回 404？

检查 `wrangler.jsonc` 里 `main` 指向 `worker.js`，且 `assets.binding` 是
`ASSETS`；确认 Cloudflare Dashboard 上的 Deploy command 是 `npx wrangler deploy`
（不是 `npx wrangler versions upload`）。
