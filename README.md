# 拾级而上 · 自考 × 考研学习博客

一个纯静态博客：没有框架、没有构建步骤、没有任何依赖，Markdown 写文章，
推到 GitHub 后用 Cloudflare Pages 托管，push 即自动部署。

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

纯静态部署**不需要**任何配置文件，也不需要构建命令。

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

## 部署到 Cloudflare Pages（当前方案）

纯静态、零配置，连接 GitHub 仓库后 push 自动重新部署。

1. 先把本仓库推到 GitHub。
2. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create** → **Pages** → **连接到 Git**，选中本仓库。
3. **Framework preset** 选 **None**（本站无框架）。
4. **Build command 留空**，**Build output directory 填 `/`**
   （因为 index.html 在仓库根目录）。
5. 保存，稍等片刻，Pages 会生成一个 `xxx.pages.dev` 域名，部署即完成。
6. 以后每次 `git push` 到 master 都会自动触发重新部署。

### 绑定自定义域名（可选）

Pages 项目 → **Custom domains** → **Set up a custom domain**，
按提示添加 CNAME 记录即可。本站所有链接都是相对路径，子路径也直接可用。

> 本站无构建、无依赖，部署免费；Pages 静态请求在免费额度内不收费。

## 常见问题

### 改了代码但线上没更新？

确认两点：
1. 改动已经 `git push` 到 GitHub（Pages 只跟随 GitHub 上的 master）。
2. 在 Pages 项目 → **Deployments** 里能看到最新一次构建成功，
   构建日志末尾应有 `Success: Build completed`。

### 部署失败了？

看 Pages 项目 → **Deployments** → 失败的那次 → 查看日志。
纯静态站常见的错误是 Build output directory 填错了；确认填 `/`。
