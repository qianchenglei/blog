/* =====================================================
 * Cloudflare Worker 后端 —— admin.html 管理后台的 API + 静态资源
 *
 * 路由规则（Workers 静态资源默认"先找文件、找不到才进 Worker"）：
 *   /api/*   → 下面的 API 逻辑（登录 / 文章增删改，走 GitHub API 提交）
 *   其余     → env.ASSETS.fetch()，由静态资源层返回
 *              （index.html、admin.html、posts/、assets/ 等）
 *
 * 需要在 Worker → 设置 → 变量和机密 中配置：
 *   ADMIN_USER     后台登录用户名（必填）
 *   ADMIN_PASS     后台登录密码   （必填）
 *   GH_TOKEN       GitHub Token，细粒度、仅授权本仓库、Contents 读写（必填）
 * 可选：
 *   GH_REPO        默认 "qianchenglei/blog"
 *   GH_BRANCH      默认 "main"
 *   COOKIE_SECRET  Cookie 签名密钥；不填则由账号密码派生（改密码会使已登录失效）
 * ===================================================== */

const enc = new TextEncoder();
const COOKIE_NAME = "admin_session";
const SESSION_HOURS = 12;

/* ---------- 小工具 ---------- */
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");

async function hmac(keyBytes, msg) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

/* 恒定时间比较，避免时序侧信道 */
function safeEq(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

/* 同源校验（配合 SameSite=Lax 防 CSRF）；curl 等无 Origin 头的场景放行 */
function originOk(request) {
  const o = request.headers.get("Origin");
  if (!o) return true;
  try { return new URL(o).host === new URL(request.url).host; } catch { return false; }
}

/* ---------- 登录态 ---------- */
let sessionKeyCache = null;
async function sessionKey(env) {
  if (sessionKeyCache) return sessionKeyCache;
  if (env.COOKIE_SECRET) return (sessionKeyCache = enc.encode(env.COOKIE_SECRET));
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${env.ADMIN_USER}:${env.ADMIN_PASS}`));
  return (sessionKeyCache = enc.encode(hex(digest)));
}

async function checkAuth(request, env) {
  if (!env.ADMIN_USER || !env.ADMIN_PASS) return false;
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)admin_session=([^;]+)/);
  if (!m) return false;
  const [exp, nonce, sig] = decodeURIComponent(m[1]).split(".");
  if (!exp || !nonce || !sig || +exp < Date.now()) return false;
  return safeEq(sig, await hmac(await sessionKey(env), `${exp}.${nonce}`));
}

/* 登录失败限速：每 IP 十分钟内最多 8 次（内存版，实例重启即清零，够个人站用） */
const attempts = new Map();
function loginBlocked(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.until) { attempts.set(ip, { n: 1, until: now + 600000 }); return false; }
  return ++rec.n > 8;
}

/* ---------- GitHub API ---------- */
const ghRepo = env => env.GH_REPO || "qianchenglei/blog";
const ghBranch = env => env.GH_BRANCH || "main";

function needEnv(env, keys) {
  const missing = keys.filter(k => !env[k]);
  if (missing.length) {
    const e = new Error("后台未配置：缺少环境变量 " + missing.join("、") + "（Worker → 设置 → 变量和机密）");
    e.status = 500;
    throw e;
  }
}

async function gh(env, path, init = {}) {
  const res = await fetch("https://api.github.com" + path, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GH_TOKEN}`,
      accept: "application/vnd.github+json",
      "user-agent": "blog-admin",
      "x-github-api-version": "2022-11-28",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    let msg = `GitHub API ${res.status}`;
    try { msg = (await res.json()).message || msg; } catch {}
    const e = new Error(msg + "（请检查 GH_TOKEN 是否有效、是否授权了本仓库的 Contents 读写）");
    e.status = 502;
    throw e;
  }
  return res.status === 204 ? null : res.json();
}

function b64ToUtf8(b64) {
  const bin = atob(b64.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
function utf8ToB64(str) {
  let bin = "";
  for (const b of enc.encode(str)) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function readGhFile(env, path) {
  const data = await gh(env, `/repos/${ghRepo(env)}/contents/${path}?ref=${ghBranch(env)}`);
  return { sha: data.sha, content: data.encoding === "base64" ? b64ToUtf8(data.content) : data.content };
}

/* 把一批文件变更打成单个 commit 推到分支（Git Data API 五步走） */
async function commitChanges(env, message, changes) {
  const repo = ghRepo(env);
  const ref = await gh(env, `/repos/${repo}/git/ref/heads/${ghBranch(env)}`);
  const headSha = ref.object.sha;
  const headCommit = await gh(env, `/repos/${repo}/git/commits/${headSha}`);

  const tree = [];
  for (const c of changes) {
    if (c.delete) { tree.push({ path: c.path, mode: "100644", type: "blob", sha: null }); continue; }
    const blob = await gh(env, `/repos/${repo}/git/blobs`,
      { method: "POST", body: JSON.stringify({ content: utf8ToB64(c.content), encoding: "base64" }) });
    tree.push({ path: c.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await gh(env, `/repos/${repo}/git/trees`,
    { method: "POST", body: JSON.stringify({ base_tree: headCommit.tree.sha, tree }) });
  const newCommit = await gh(env, `/repos/${repo}/git/commits`,
    { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] }) });
  await gh(env, `/repos/${repo}/git/refs/heads/${ghBranch(env)}`,
    { method: "PATCH", body: JSON.stringify({ sha: newCommit.sha }) });
  return newCommit.sha;
}

/* ---------- 业务：文章 ---------- */
/* 文件名允许带分类子目录（如 ds/xxx.md）；校验每个段：字母数字汉字、空格 . ( ) - _ */
const FILE_RE = /^[\w\u4e00-\u9fa5][\w\u4e00-\u9fa5 .()\-]*(?:\/[\w\u4e00-\u9fa5][\w\u4e00-\u9fa5 .()\-]*)*\.md$/;
const fileOk = f => typeof f === "string" && f.length <= 160 && !f.includes("..") && !f.includes("\\") && FILE_RE.test(f);
/* 路径编码：按 / 分段编码，保留目录分隔符（GitHub contents 路径不能整体 %2F） */
const encPath = p => String(p).split("/").map(encodeURIComponent).join("/");

function bad(msg) { const e = new Error(msg); e.status = 400; throw e; }

async function readList(env) {
  const { sha, content } = await readGhFile(env, "posts.json");
  let list;
  try { list = JSON.parse(content); } catch { bad("posts.json 内容不是合法 JSON，请先手工修复"); }
  if (!Array.isArray(list)) bad("posts.json 顶层不是数组，请先手工修复");
  return { sha, list };
}

function buildEntry(b) {
  const file = String(b.file || "").trim();
  if (!fileOk(file)) bad("文件名不合法：只能用中英文、数字、- _ . ( ) 和空格，且以 .md 结尾");
  const title = String(b.title || "").trim().slice(0, 120);
  if (!title) bad("标题不能为空");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : new Date().toISOString().slice(0, 10);
  const tags = (Array.isArray(b.tags) ? b.tags : [])
    .map(t => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10);
  const summary = String(b.summary || "").trim().slice(0, 300);
  const content = String(b.content || "").replace(/\r\n/g, "\n");
  if (content.length > 200000) bad("正文太长（超过 20 万字符）");
  if (!content.trim()) bad("正文不能为空");
  return { file, title, date, tags, summary, content };
}

async function handleListPosts(env) {
  needEnv(env, ["GH_TOKEN"]);
  const { list } = await readList(env);
  return json({ list, repo: ghRepo(env), branch: ghBranch(env) });
}

async function handleGetPost(env, url) {
  needEnv(env, ["GH_TOKEN"]);
  const file = url.searchParams.get("file") || "";
  if (!fileOk(file)) bad("文件名不合法");
  const { sha, content } = await readGhFile(env, "posts/" + encPath(file));
  return json({ file, sha, content });
}

async function handleSave(env, request) {
  needEnv(env, ["GH_TOKEN"]);
  if (!originOk(request)) { const e = new Error("来源校验失败"); e.status = 403; throw e; }
  const b = await body(request);
  const { file, title, date, tags, summary, content } = buildEntry(b);
  const origFile = String(b.origFile || "").trim();
  if (origFile && !fileOk(origFile)) bad("原文件名不合法");

  const { list } = await readList(env);
  if (list.some(e => e && e.file === file && e.file !== origFile)) bad(`已存在同名文件 ${file}（可能与现有文章冲突），请换一个文件名，或直接编辑那篇文章`);

  const entry = { file, title, date, tags, summary };
  const idx = list.findIndex(e => e && e.file === (origFile || file));
  if (idx >= 0) list[idx] = entry; else list.unshift(entry);
  if (origFile && origFile !== file) {
    const j = list.findIndex(e => e && e.file === origFile);
    if (j >= 0) list.splice(j, 1);
  }

  const changes = [{ path: `posts/${file}`, content }];
  if (origFile && origFile !== file) changes.push({ path: `posts/${origFile}`, delete: true });
  changes.push({ path: "posts.json", content: JSON.stringify(list, null, 2) + "\n" });

  const commit = await commitChanges(env,
    idx >= 0 ? `admin: 更新文章《${title}》` : `admin: 发布新文章《${title}》`, changes);
  return json({ ok: true, commit, list });
}

async function handleDelete(env, request) {
  needEnv(env, ["GH_TOKEN"]);
  if (!originOk(request)) { const e = new Error("来源校验失败"); e.status = 403; throw e; }
  const b = await body(request);
  const file = String(b.file || "").trim();
  if (!fileOk(file)) bad("文件名不合法");

  const { list } = await readList(env);
  const entry = list.find(e => e && e.file === file);
  const kept = list.filter(e => e && e.file !== file);

  const changes = [
    { path: `posts/${file}`, delete: true },
    { path: "posts.json", content: JSON.stringify(kept, null, 2) + "\n" },
  ];
  const commit = await commitChanges(env, `admin: 删除文章《${entry ? entry.title : file}》`, changes);
  return json({ ok: true, commit, list: kept });
}

/* ---------- 登录 / 登出 ---------- */
async function handleLogin(env, request) {
  if (!originOk(request)) { const e = new Error("来源校验失败"); e.status = 403; throw e; }
  if (!env.ADMIN_USER || !env.ADMIN_PASS || !env.GH_TOKEN)
    return json({ error: "后台未配置：请在 Worker → 设置 → 变量和机密 中设置 ADMIN_USER、ADMIN_PASS、GH_TOKEN" }, 500);

  const ip = request.headers.get("CF-Connecting-IP") || "local";
  if (loginBlocked(ip)) return json({ error: "尝试次数过多，请 10 分钟后再试" }, 429);

  const b = await body(request);
  const user = String(b.user || ""), pass = String(b.pass || "");
  if (!safeEq(user, env.ADMIN_USER) || !safeEq(pass, env.ADMIN_PASS))
    return json({ error: "用户名或密码不对" }, 401);
  attempts.delete(ip);

  const exp = Date.now() + SESSION_HOURS * 3600 * 1000;
  const nonce = crypto.randomUUID();
  const sig = await hmac(await sessionKey(env), `${exp}.${nonce}`);
  const token = encodeURIComponent(`${exp}.${nonce}.${sig}`);
  return json({ ok: true, user: env.ADMIN_USER }, 200, {
    "set-cookie": `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_HOURS * 3600}`,
  });
}

/* ---------- API 路由 ---------- */
async function handleApi(request, env) {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  const method = request.method;

  try {
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (route === "login" && method === "POST") return await handleLogin(env, request);

    if (!(await checkAuth(request, env)))
      return json({ error: "未登录或登录已过期" }, 401);

    if (route === "me" && method === "GET") return json({ ok: true });
    if (route === "logout" && method === "POST")
      return json({ ok: true }, 200, {
        "set-cookie": `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
      });
    if (route === "posts" && method === "GET") return await handleListPosts(env);
    if (route === "post" && method === "GET") return await handleGetPost(env, url);
    if (route === "save" && method === "POST") return await handleSave(env, request);
    if (route === "delete" && method === "POST") return await handleDelete(env, request);
    return json({ error: "未知接口" }, 404);
  } catch (err) {
    return json({ error: err.message || "服务器内部错误" }, err.status || 500);
  }
}

/* ---------- 入口：/api/* 进 API，其余交给静态资源 ---------- */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
