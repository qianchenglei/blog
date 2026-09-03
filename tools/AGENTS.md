# 项目交接 / 快速上手（给新会话或本人）

> 本仓库 = 个人学习博客，纯静态 + Cloudflare Worker（`worker.js` 作入口，静态走 ASSETS 绑定）。
> 读到本文档即可在几分钟内接上所有上下文，无需依赖旧聊天记录。

## 一句话架构
- 代码与文章都在本 git 仓库（`D:\zikao\blog`），`main` 分支。
- 部署：`git push origin main` → Cloudflare Workers Builds 自动构建上线（**别用 `npx wrangler deploy`**，会覆盖成不带网页变量的部署）。
- 域名：`qianchenglei.xyz`；无后缀干净地址由 worker 映射：`/status`、`/admin`、`/post`。

## 已上线且正常
- 发布状态页 `/status`（自动刷新；数据来自 `/api/status`）。
- 管理后台 `/admin`（发/改/删文章，走 GitHub API 提交）。
- 书架、文章页 `/post#p=...`、posts 按科目分子目录（`posts/ds|politics|meta/`）。
- Worker 层 4 个 secret 已配好：`ADMIN_USER / ADMIN_PASS / GH_TOKEN / CF_API_TOKEN`（在 CF 后台 Worker → Settings → Variables and Secrets / 或 wrangler 层，已收口到 Worker 层）。
- 封面改成了**清单制**：页面只读 `assets/covers/manifest.json` 一次，不再逐扩展名探测（消除大量 404 请求）。

## 常用命令（在 D:\zikao\blog）
```cmd
:: 发布/更新
git add -A
git commit -m "说明"
git push origin main            :: 触发自动部署（约 1-2 分钟）

:: 加了封面图后重建清单
node tools/update-covers.mjs

:: 本地查要不要 push
tools\check-status.cmd

:: 改 Worker 代码后测试
node --check worker.js
```
本地状态：`/status`（网页）或 `tools\check-status.cmd`（本地）。

## 关键环境变量（值不写在此；在 CF Worker 里）
- `ADMIN_USER` / `ADMIN_PASS`：后台登录
- `GH_TOKEN`：GitHub PAT，仓库 qianchenglei/blog，Contents 读写
- `CF_API_TOKEN`：CF 只读 API Token（账户自动解析，无需 CF_ACCOUNT_ID）
- GH_REPO/GH_BRANCH 走代码默认值（qianchenglei/blog、main），无需配

## 常见坑备忘
- Worker 变量分层：**Worker 本体的 Settings→Variables and Secrets（=wrangler 层）** 才一定进运行时；Builds 页那套不一定注入。已统一收口到 Worker 层。
- MinGW 编译 C++ 时不要 include `<windows.h>` 到 `<iostream>` 之前（std::byte 歧义）。
- 文章/封面改动都要 `git push` 后构建完才上线；封面清单要 `node tools/update-covers.mjs` 重建后一起 push。

## 待办 / 开放项
- 三角矩阵、稀疏矩阵压缩（StringMatch C++，见 `posts/ds/ds-stringmatch-cpp-fixes.md` 待办）。
- 若做考研资料分享：用 R2（私有桶+签名 URL），别公开挂版权 PDF。
- robots.txt 目前 CF 在托管生成覆盖；若想用自己的，需在 CF 关掉“内容信号/托管 robots”或确认部署下发后再看。
