# 拾级而上 · 自考 × 考研学习博客

一个纯静态博客：没有框架、没有构建步骤、没有任何依赖，Markdown 写文章，
推到 GitHub 后用 GitHub Pages 或 Cloudflare Pages 托管即可。

## 目录结构

```
blog/
├── index.html        # 首页（文章列表 + 标签筛选）
├── post.html         # 文章页（渲染 Markdown）
├── assets/
│   ├── style.css     # 样式（自动深浅色，可在右上角手动切换）
│   └── main.js       # 站点配置 + Markdown 渲染 + 页面逻辑
├── posts/            # ★ 所有文章（Markdown）
├── posts.json        # ★ 文章清单（首页列表的来源）
└── README.md
```

## 写新文章（两步）

1. 在 `posts/` 下新建 `xxx.md`（文件名建议用英文）
2. 在 `posts.json` 数组里加一条（格式看 `posts/markdown-guide.md` 里的示例）

刷新首页即可看到。语法示例与图片用法见站内《写作指南》一文。

## 改站名 / 简介 / 页脚

打开 `assets/main.js`，只改最顶上的 `SITE` 配置。

## 本地预览

浏览器不允许 `file://` 页面发请求，所以双击打开 HTML 看不到内容。
在 blog 目录下任选一种方式起个本地服务器：

```bash
npx serve .                # 有 Node
python -m http.server      # 有 Python
```

然后访问终端里显示的地址（如 http://localhost:3000）。

## 部署到 Cloudflare Workers（当前方案）

仓库根目录的 `wrangler.jsonc` 已把整站声明为静态资源。Cloudflare 侧需要确认两件事：

1. **Deploy command 改为** `npx wrangler deploy`
   （Dashboard → Workers & Pages → 你的 Worker → Settings → Builds → Deploy command）
2. `wrangler.jsonc` 里 `assets.directory` 指向正确位置：
   index.html 在仓库根目录用 `"./"`；在仓库 `blog/` 子目录下用 `"./blog"`

部署成功后得到 `xxx.<worker-name>.workers.dev` 域名；绑定自定义域名在
Worker → Settings → Domains & Routes 里加。

> 纯静态站用 Workers 托管不收费（静态资源请求免费额度很大）。

## 部署到 Cloudflare Pages（备选）

不想用 Workers 也可以改用 Pages，无需任何配置文件：

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create → Pages → 连接 GitHub 仓库
2. **Build command 留空**，**Build output directory 填 `/`**（若 blog 在子目录则填 `/blog`）

两种方式任选其一，都支持 push 后自动重新部署。

## 部署到 GitHub Pages（备选）

仓库 → Settings → Pages → Source 选 `Deploy from a branch` → 选 `main` 分支 `/ (root)`，保存即可。

> 注意：如果博客要用 GitHub Pages 的 `用户名.github.io/仓库名/` 子路径，本站所有链接都是相对路径，直接可用，无需额外配置。
