/* =====================================================
 * 站点配置：想改站名、副标题、简介、页脚，只改这里
 * ===================================================== */
const SITE = {
  title: "我命由我不由天",
  subtitle: "自考 × 考研 · 学习笔记",
  description: "记录自考课程笔记、考研备考进度与心得。文章都在 posts/ 目录里，用 Markdown 写成。",
  footer: "© 2026 · 用 Markdown 记录成长",
};

/* ---------- 工具 ---------- */
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* 行内元素：`code` **粗体** *斜体* ~~删除线~~ [链接](url) ![图片](url) */
function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => {
    codes.push(`<code>${escapeHtml(c)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = escapeHtml(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (m, alt, src) => `<img src="${src}" alt="${alt}" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    (m, text, href) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[+i]);
  return s;
}

/* 拆出文件头的 frontmatter（--- title: xx --- 块），返回 [元数据, 正文] */
function splitFrontmatter(text) {
  const m = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return [{}, text];
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w\u4e00-\u9fa5]+)\s*:\s*(.*)$/);
    if (kv) fm[kv[1].trim()] = kv[2].trim();
  }
  return [fm, text.slice(m[0].length)];
}

/* 块级 Markdown -> HTML（支持标题/列表/任务列表/引用/表格/代码块/分割线） */
function renderMarkdown(md) {
  // 先把围栏代码块摘出来，防止里面的内容被当作 Markdown 处理
  const codeBlocks = [];
  md = md.replace(/```([^\n`]*)\n?([\s\S]*?)```/g, (m, lang, code) => {
    codeBlocks.push(
      `<div class="codeblock"><div class="code-lang">${escapeHtml(lang.trim() || "text")}</div>` +
      `<pre><code>${escapeHtml(code.replace(/\n$/, ""))}</code></pre></div>`);
    return `\u0000CB${codeBlocks.length - 1}\u0000`;
  });

  const lines = md.split("\n");
  const out = [];
  const listStack = [];
  const closeLists = () => { while (listStack.length) out.push(`</${listStack.pop()}>`); };

  const isListItem = l => /^(\s*)([-*+]|\d+[.)])\s+/.test(l);
  const isTable = l => /^\s*\|.*\|\s*$/.test(l);
  const isHr = l => /^\s*(---+|\*\*\*+)\s*$/.test(l);
  const isCodePlaceholder = l => /^\u0000CB\d+\u0000\s*$/.test(l);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isCodePlaceholder(line.trim())) { closeLists(); out.push(line.trim()); i++; continue; }
    if (/^\s*$/.test(line)) { closeLists(); i++; continue; }
    if (isHr(line)) { closeLists(); out.push("<hr>"); i++; continue; }

    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) { closeLists(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }

    if (/^\s*>\s?/.test(line)) {
      closeLists();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(`<blockquote>${renderMarkdown(buf.join("\n"))}</blockquote>`);
      continue;
    }

    // 表格：| a | b | 下一行是 |---|---|
    if (isTable(line) && i + 1 < lines.length &&
        isTable(lines[i + 1]) && lines[i + 1].includes("-")) {
      closeLists();
      const cells = r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTable(lines[i])) { rows.push(cells(lines[i])); i++; }
      let t = "<div class='table-wrap'><table><thead><tr>" +
        head.map(c => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>";
      for (const r of rows) t += "<tr>" + r.map(c => `<td>${inline(c)}</td>`).join("") + "</tr>";
      out.push(t + "</tbody></table></div>");
      continue;
    }

    // 列表（支持两格缩进的多层嵌套与 - [ ] 任务列表）
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)/);
    if (li) {
      const depth = Math.floor(li[1].length / 2);
      const want = /\d/.test(li[2]) ? "ol" : "ul";
      while (listStack.length < depth + 1) { out.push(`<${want}>`); listStack.push(want); }
      while (listStack.length > depth + 1) { out.push(`</${listStack.pop()}>`); }
      if (listStack[listStack.length - 1] !== want) {
        out.push(`</${listStack.pop()}>`, `<${want}>`); listStack.push(want);
      }
      let item = li[3];
      const task = item.match(/^\[([ xX])\]\s+(.*)/);
      item = task
        ? `<input type="checkbox" disabled ${task[1] !== " " ? "checked" : ""}> ${inline(task[2])}`
        : inline(item);
      out.push(`<li>${item}</li>`);
      i++;
      continue;
    }

    // 普通段落：收集到空行或下一个块级元素为止
    closeLists();
    const buf = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) &&
           !/^\s*>/.test(lines[i]) && !isTable(lines[i]) && !isListItem(lines[i]) &&
           !isHr(lines[i]) && !isCodePlaceholder(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${buf.map(inline).join("<br>")}</p>`);
  }
  closeLists();

  return out.join("\n").replace(/\u0000CB(\d+)\u0000/g, (m, n) => codeBlocks[+n]);
}

/* ---------- 公共 ---------- */
function applySiteConfig() {
  document.title = SITE.title;
  const t = document.getElementById("site-title");
  const s = document.getElementById("site-subtitle");
  const f = document.getElementById("footer-text");
  if (t) t.textContent = SITE.title;
  if (s) s.textContent = SITE.subtitle;
  if (f) f.textContent = SITE.footer;
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.dataset.theme = saved;
  const btn = document.getElementById("theme-toggle");
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  });
}

async function loadPosts() {
  const res = await fetch("posts.json");
  if (!res.ok) throw new Error("posts.json " + res.status);
  return res.json();
}

function tagButton(tag, active) {
  const b = document.createElement("button");
  b.className = "tag" + (active ? " active" : "");
  b.textContent = tag;
  return b;
}

function localPreviewHint() {
  return `<div class="notice"><strong>内容加载失败。</strong>
    如果你是直接双击打开 HTML 文件，浏览器会拦截本地请求 —— 请在 blog 目录下运行
    <code>npx serve .</code> 或 <code>python -m http.server</code> 后访问
    （部署到 GitHub Pages / Cloudflare 后不会有这个问题）。</div>`;
}

/* ---------- 首页：文章列表 + 标签筛选 ---------- */
async function initIndex() {
  applySiteConfig();
  initTheme();
  const hero = document.getElementById("hero-text");
  if (hero) hero.textContent = SITE.description;

  const list = document.getElementById("post-list");
  const tagbar = document.getElementById("tagbar");
  let posts;
  try {
    posts = (await loadPosts()).sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    list.innerHTML = localPreviewHint();
    return;
  }

  const tags = [...new Set(posts.flatMap(p => p.tags || []))];
  let activeTag = null;

  function postCard(p) {
    const el = document.createElement("article");
    el.className = "post-card";
    const tagHtml = (p.tags || [])
      .map(t => `<button class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("");
    el.innerHTML = `
      <div class="post-meta"><time>${p.date}</time>${tagHtml ? `<span class="dot">·</span>${tagHtml}` : ""}</div>
      <h2 class="post-title"><a href="post.html#p=${encodeURIComponent(p.file)}">${escapeHtml(p.title)}</a></h2>
      ${p.summary ? `<p class="post-summary">${escapeHtml(p.summary)}</p>` : ""}`;
    el.querySelectorAll("button.tag").forEach(b =>
      b.addEventListener("click", () => { filter(b.dataset.tag); window.scrollTo({ top: 0, behavior: "smooth" }); }));
    return el;
  }

  function renderTagbar() {
    tagbar.innerHTML = "";
    tagbar.append(tagButton("全部", !activeTag));
    for (const t of tags) tagbar.append(tagButton(t, activeTag === t));
    tagbar.querySelectorAll("button").forEach(b =>
      b.addEventListener("click", () =>
        filter(b.textContent === "全部" ? null : b.textContent)));
  }

  function filter(tag) {
    activeTag = tag;
    renderTagbar();
    list.innerHTML = "";
    const shown = tag ? posts.filter(p => (p.tags || []).includes(tag)) : posts;
    if (!shown.length) {
      list.innerHTML = `<p class="empty-tip">这个标签下还没有文章。</p>`;
      return;
    }
    shown.forEach(p => list.append(postCard(p)));
  }

  renderTagbar();
  filter(null);
}

/* ---------- 文章页 ---------- */
async function initPost() {
  applySiteConfig();
  initTheme();

  const content = document.getElementById("post-content");
  // 文件名优先取 #p=（hash 在任何服务器的重定向下都不会丢），?p= 作为兼容
  const hashFile = (location.hash.match(/^#p=(.+)$/) || [])[1];
  const file = hashFile
    ? decodeURIComponent(hashFile)
    : new URLSearchParams(location.search).get("p");

  let posts;
  try { posts = await loadPosts(); }
  catch (e) { content.innerHTML = localPreviewHint(); return; }

  const meta = posts.find(x => x.file === file) || {};
  document.title = (meta.title ? meta.title + " · " : "") + SITE.title;
  document.getElementById("post-title").textContent = meta.title || (file || "未找到文章");

  const metaEl = document.getElementById("post-meta");
  metaEl.innerHTML = (meta.date ? `<time>${meta.date}</time>` : "") +
    (meta.tags || []).map(t => `<button class="tag">${escapeHtml(t)}</button>`).join("");

  if (!file) { content.innerHTML = localPreviewHint(); return; }
  try {
    const res = await fetch("posts/" + encodeURIComponent(file));
    if (!res.ok) throw new Error(res.status);
    const [fm, md] = splitFrontmatter(await res.text());
    // 文章页缺的信息可以用 frontmatter 里的补上（posts.json 的记录优先）
    const title = meta.title || fm.title;
    const date = meta.date || fm.date;
    if (title) {
      document.getElementById("post-title").textContent = title;
      document.title = title + " · " + SITE.title;
    }
    if ((meta.tags || []).length || fm.tags) {
      // posts.json 里 tags 是数组；frontmatter 里是 "[a, b]" 这样的字符串
      const raw = meta.tags || String(fm.tags).replace(/[\[\]]/g, "");
      const tags = (Array.isArray(raw) ? raw : raw.split(/[,，]/))
        .map(s => String(s).trim()).filter(Boolean);
      metaEl.innerHTML = (date ? `<time>${escapeHtml(date)}</time>` : "") +
        tags.map(t => `<button class="tag">${escapeHtml(t)}</button>`).join("");
    }
    content.innerHTML = renderMarkdown(md);
  } catch (e) {
    content.innerHTML = `<div class="notice">文章「${escapeHtml(file)}」不存在或加载失败。</div>`;
  }
}

/* ---------- 启动 ---------- */
const page = document.body.dataset.page;
if (page === "index") initIndex();
else if (page === "post") initPost();
