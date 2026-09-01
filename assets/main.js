/* =====================================================
 * 站点配置：想改站名、副标题、简介、页脚，只改这里
 * ===================================================== */
const SITE = {
  title: "我命由我不由天",
  subtitle: "自考 × 考研 · 学习笔记",
  description: "记录自考课程笔记、考研备考进度与心得。文章都在 posts/ 目录里，用 Markdown 写成。",
  footer: "© 2026 · 用 Markdown 记录成长",
  heroBadge: "📖 自考 × 考研 · 备考进行时",
  heroTitle: "把每一门课，读成一张地图",
  heroText: "不走“文章列表 → 翻分类”的老路：在书架上点开一本教材，直接进入它的知识结构，顺着骨架读笔记。",
};

/* =====================================================
 * 书架配置：书架上的每本“教材” + 它的知识结构
 *
 * - cover 留空 ""：自动尝试 assets/covers/<id>.jpg / .jpeg / .png / .webp，
 *   都找不到就自动画一个占位封面（以后把图片丢进 assets/covers/ 即可）
 * - chapters：知识树的章节；file 填 posts/ 里的文件名；
 *   sec 填该文章里第几个二级标题（## 从 1 开始数），点“阅读本章笔记”会跳到那一段
 * - tags：和文章的标签对应，用于在课程页底部自动列出“相关笔记”
 * ===================================================== */
const COURSES = [
  {
    id: "marxism",
    code: "15044",
    title: "马克思主义基本原理",
    emoji: "🚩",
    color: "#c2453a",
    color2: "#7a1e15",
    tags: ["马原"],
    cover: "",
    description: "重点标注版思维导图已经整理成文章：导论、哲学、政治经济学一条线读完。",
    chapters: [
      { title: "导论 · 马克思主义是什么", points: ["六个“是”与三大组成部分", "立场 · 观点 · 方法", "1848《共产党宣言》与思想渊源", "科学性 · 人民性 · 实践性 · 发展性"], file: "marxism-principles.md", sec: 1 },
      { title: "辩证唯物论 · 世界统一于物质", points: ["哲学基本问题的两个侧面", "物质 · 运动 · 静止 · 时空", "意识的起源与能动作用", "人工智能与人类意识"], file: "marxism-principles.md", sec: 2 },
      { title: "唯物辩证法 · 联系和发展", points: ["普遍联系与变化发展", "对立统一规律（矛盾）", "量变质变规律", "否定之否定规律", "五对基本范畴"], file: "marxism-principles.md", sec: 3 },
      { title: "认识论 · 实践、真理与价值", points: ["实践的三特征与基本结构", "实践对认识的决定作用", "两次飞跃与认识规律", "真理与价值的统一"], file: "marxism-principles.md", sec: 4 },
      { title: "唯物史观 · 社会历史的规律", points: ["社会存在与社会意识", "两对社会基本矛盾", "五大动力", "人民群众与个人"], file: "marxism-principles.md", sec: 5 },
      { title: "政治经济学 · 商品与剩余价值", points: ["商品二因素与劳动二重性", "价值规律与货币五职能", "劳动力成为商品", "剩余价值的生产与资本积累", "资本循环、周转与社会再生产"], file: "marxism-principles.md", sec: 6 },
      { title: "资本主义的发展及其趋势", points: ["上层建筑：国家、民主与意识形态", "从自由竞争到垄断", "金融资本与垄断价格", "经济全球化", "二战后新变化与当代特征"], file: "marxism-principles.md", sec: 7 },
      { title: "结语 · 关于科学社会主义", points: ["为什么导图只立了一个标题", "资本积累的历史趋势"], file: "marxism-principles.md", sec: 8 },
    ],
  },
  {
    id: "history",
    code: "15043",
    title: "中国近现代史纲要",
    emoji: "📜",
    color: "#b7791f",
    color2: "#7c5310",
    tags: ["中国近现代史纲要"],
    cover: "",
    description: "历史脉络、大事年表与重点整理，正在搭建中。",
    chapters: [],
  },
  {
    id: "english",
    code: "13000",
    title: "英语（专升本）",
    emoji: "🔤",
    color: "#0f766e",
    color2: "#0a4f4a",
    tags: ["英语"],
    cover: "",
    description: "词汇、语法与真题训练记录，正在搭建中。",
    chapters: [],
  },
  {
    id: "ds",
    code: "",
    title: "数据结构",
    emoji: "🧩",
    color: "#4f46e5",
    color2: "#312e9e",
    tags: ["数据结构（ds）"],
    cover: "",
    description: "以手写实现为主的代码笔记，边学边写。",
    chapters: [
      { title: "线性表", points: ["顺序存储 · 泛型数组", "链式存储 · 单链表"], file: "ds--Array.md" },
    ],
  },
];

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

/* 块级 Markdown -> HTML（标题/列表/任务列表/引用/表格/代码块/分割线；
   每个二级标题会自动带上 id="sec-N"，供知识树的章节锚点跳转） */
function renderMarkdown(md) {
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
  let h2Count = 0;
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
    if (h) {
      closeLists();
      const id = h[1].length === 2 ? ` id="sec-${++h2Count}"` : "";
      out.push(`<h${h[1].length}${id}>${inline(h[2])}</h${h[1].length}>`); i++; continue;
    }

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

function initNavScroll() {
  const nav = document.getElementById("topnav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

let postsCache = null;
async function getPosts() {
  if (postsCache) return postsCache;
  const res = await fetch("posts.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("posts.json " + res.status);
  postsCache = (await res.json()).sort((a, b) => b.date.localeCompare(a.date));
  return postsCache;
}

function localPreviewHint() {
  return `<div class="notice"><strong>内容加载失败。</strong>
    如果你是直接双击打开 HTML 文件，浏览器会拦截本地请求 —— 请在 blog 目录下运行
    <code>npx serve .</code> 或 <code>python -m http.server</code> 后访问
    （部署到 GitHub Pages / Cloudflare 后不会有这个问题）。</div>`;
}

/* 封面：真实图片找不到就自动画占位封面，以后丢图进 assets/covers/ 即生效 */
const coverCache = {};
function applyCover(el, course) {
  const key = course.cover || course.id;
  const use = url => {
    el.style.backgroundImage = `linear-gradient(rgba(20,10,5,.18), rgba(20,10,5,.38)), url("${url}")`;
    el.classList.add("has-img");
  };
  if (coverCache[key]) { if (coverCache[key] !== "none") use(coverCache[key]); return; }
  const exts = ["jpg", "jpeg", "png", "webp"];
  (function probe(i) {
    if (i >= exts.length) { coverCache[key] = "none"; return; }
    const img = new Image();
    img.onload = () => { coverCache[key] = el.dataset.coverSrc = `assets/covers/${course.id}.${exts[i]}`; use(coverCache[key]); };
    img.onerror = () => probe(i + 1);
    img.src = `assets/covers/${course.id}.${exts[i]}`;
  })(0);
}

function coverHtml(course, mini) {
  return `<div class="book-cover${mini ? " mini" : ""}" data-course-cover="${course.id}"
    style="--c1:${course.color};--c2:${course.color2}">
    <span class="cover-ph"><i class="ph-emoji">${course.emoji}</i><i class="ph-title${course.title.length > 7 ? " long" : ""}">${escapeHtml(course.title)}</i></span>
    <span class="cover-shade"></span>
    <span class="cover-title">${escapeHtml(course.title)}</span>
    <span class="cover-spine"></span>
    <span class="cover-shine"></span>
  </div>`;
}

function bindCovers(root) {
  root.querySelectorAll("[data-course-cover]").forEach(el => {
    const c = COURSES.find(x => x.id === el.dataset.courseCover);
    if (c) applyCover(el, c);
  });
}

/* ---------- 进场动画：滚动显现 + 书本 3D 倾角 ---------- */
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add("in"); revealIO.unobserve(x.target); }
  });
}, { threshold: .12 });

function bindViewExtras(root) {
  root.querySelectorAll(".reveal").forEach(el => revealIO.observe(el));
  bindCovers(root);

  root.querySelectorAll(".ch-head").forEach(btn =>
    btn.addEventListener("click", () => btn.closest(".chapter").classList.toggle("open")));

  if (matchMedia("(pointer:fine)").matches) {
    root.querySelectorAll(".book").forEach(card => {
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty("--rx", (-y * 6) + "deg");
        card.style.setProperty("--ry", (x * 9) + "deg");
      });
      card.addEventListener("mouseleave", () => {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      });
    });
  }

  root.querySelectorAll("b[data-count]").forEach(el => {
    const target = +el.dataset.count;
    const t0 = performance.now(), dur = 900;
    (function tick(t) {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  });
}

/* 点书时从点击处荡开一圈颜色，随后切换到知识结构页 */
function wave(x, y, course) {
  const d = document.createElement("div");
  d.className = "route-wave";
  d.style.left = x + "px";
  d.style.top = y + "px";
  d.style.background = `radial-gradient(circle, ${course ? course.color : "#0f766e"} 0%, ${course ? course.color2 : "#0b1315"} 75%)`;
  document.body.appendChild(d);
  requestAnimationFrame(() => d.classList.add("go"));
  setTimeout(() => { d.classList.add("fade"); setTimeout(() => d.remove(), 420); }, 520);
}

/* ---------- 文章卡片（首页最新 / 课程页相关 / 全部文章 共用） ---------- */
function postCardHtml(p, withTags) {
  const tagHtml = withTags ? (p.tags || [])
    .map(t => `<button class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join("") : "";
  return `<article class="post-card">
    <div class="post-meta"><time>${p.date}</time>${tagHtml ? `<span class="dot">·</span>${tagHtml}` : ""}</div>
    <h2 class="post-title"><a href="post.html#p=${encodeURIComponent(p.file)}">${escapeHtml(p.title)}</a></h2>
    ${p.summary ? `<p class="post-summary">${escapeHtml(p.summary)}</p>` : ""}
  </article>`;
}

/* ---------- 视图一：主页（橱窗） ---------- */
function renderHome(view, posts) {
  const tags = [...new Set(posts.flatMap(p => p.tags || []))];
  const [line1, line2 = ""] = SITE.heroTitle.split("，");
  const books = COURSES.map((c, i) => {
    const postSet = new Set(posts.map(p => p.file));
    const linked = new Set(c.chapters.flatMap(ch => ch.file && postSet.has(ch.file) ? [ch.file] : []));
    const tagPosts = posts.filter(p => (p.tags || []).some(t => c.tags.includes(t)));
    const notes = new Set([...tagPosts.map(p => p.file), ...linked]).size;
    const meta = (c.code ? c.code + " · " : "") +
      (c.chapters.length ? c.chapters.length + " 章" : "整理中") + " · " + notes + " 篇笔记";
    return `<a class="book reveal" href="#/course/${c.id}" data-course="${c.id}"
        style="--c1:${c.color};--c2:${c.color2};animation-delay:${i * 90}ms">
      <div class="book-3d">
        ${coverHtml(c)}
        <span class="book-pages"></span>
        <span class="book-back"></span>
      </div>
      <div class="book-info"><h3>${escapeHtml(c.title)}</h3><p>${meta}</p></div>
    </a>`;
  }).join("");

  const latest = posts.slice(0, 6).map((p, i) =>
    postCardHtml(p, false).replace('class="post-card"', `class="post-card reveal" style="animation-delay:${i * 70}ms"`)).join("");

  view.innerHTML = `
  <section class="hero">
    <div class="hero-bg" aria-hidden="true"><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i></div>
    <div class="wrap hero-inner">
      <p class="hero-badge reveal in">${escapeHtml(SITE.heroBadge)}</p>
      <h1 class="hero-title reveal in" style="animation-delay:.08s"><span>${escapeHtml(line1)}</span><span class="grad">${escapeHtml(line2)}</span></h1>
      <p class="hero-desc reveal in" style="animation-delay:.16s">${escapeHtml(SITE.heroText)}</p>
      <div class="hero-actions reveal in" style="animation-delay:.24s">
        <a class="btn btn-primary" href="#/shelf">📚 走进书架</a>
        <a class="btn btn-ghost" href="#/posts">✍️ 全部文章</a>
      </div>
      <div class="hero-stats reveal in" style="animation-delay:.32s">
        <div><b data-count="${COURSES.length}">0</b><span>门课程</span></div>
        <div><b data-count="${posts.length}">0</b><span>篇笔记</span></div>
        <div><b data-count="${tags.length}">0</b><span>个标签</span></div>
      </div>
      <a class="scroll-cue" href="#/shelf" aria-label="去书架"><i></i></a>
    </div>
  </section>

  <section class="section wrap-wide" id="shelf">
    <header class="sec-head reveal">
      <h2>书架</h2><p>点击书本封面，进入这门课的知识结构</p>
    </header>
    <div class="shelf-grid">${books}</div>
  </section>

  <section class="section wrap-wide" id="latest">
    <header class="sec-head with-more reveal">
      <h2>最新笔记</h2><a class="more-link" href="#/posts">查看全部 →</a>
    </header>
    <div class="latest-grid">${latest}</div>
  </section>`;
}

/* ---------- 视图二：课程知识结构 ---------- */
function renderCourse(view, c, posts) {
  const postSet = new Set(posts.map(p => p.file));
  const tagPosts = posts.filter(p => (p.tags || []).some(t => c.tags.includes(t)));
  const linked = new Set(c.chapters.flatMap(ch => ch.file && postSet.has(ch.file) ? [ch.file] : []));
  const notes = new Set([...tagPosts.map(p => p.file), ...linked]).size;

  const chapters = c.chapters.length ? `<ol class="tree">` + c.chapters.map((ch, i) => {
    let link = "";
    if (ch.file && postSet.has(ch.file)) {
      const href = "post.html#p=" + encodeURIComponent(ch.file) + (ch.sec ? "&s=sec-" + ch.sec : "");
      link = `<a class="ch-link" href="${href}">📖 阅读本章笔记</a>`;
    } else if (ch.file) {
      link = `<span class="ch-link todo">🚧 笔记待发布</span>`;
    }
    return `<li class="chapter reveal" style="animation-delay:${i * 80}ms">
      <button class="ch-head" type="button">
        <span class="ch-dot"></span>
        <span class="ch-num">${String(i + 1).padStart(2, "0")}</span>
        <span class="ch-title">${escapeHtml(ch.title)}</span>
        <span class="ch-meta">${ch.points.length} 个知识点</span>
        <span class="ch-chev">▾</span>
      </button>
      <div class="ch-body"><div class="ch-inner">
        <ul class="points">${ch.points.map(p => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
        ${link}
      </div></div>
    </li>`;
  }).join("") + `</ol>`
    : `<div class="tree-empty reveal">📘 笔记整理中 —— 这一科的知识结构还在搭建，先看看下面的相关笔记吧。</div>`;

  view.innerHTML = `
  <div class="wrap-wide course-view">
    <a class="back-link" href="#/">← 返回主页</a>
    <header class="course-head reveal in">
      <div class="course-cover" style="--c1:${c.color};--c2:${c.color2}">${coverHtml(c, true)}</div>
      <div class="course-head-text">
        <p class="course-code">${c.code ? escapeHtml(c.code) + " · " : ""}课程知识结构</p>
        <h1>${escapeHtml(c.title)}</h1>
        <p class="course-desc">${escapeHtml(c.description)}</p>
        <p class="course-stats">${c.chapters.length ? c.chapters.length + " 个章节" : "章节整理中"} · ${notes} 篇笔记</p>
      </div>
    </header>
    ${chapters}
    ${tagPosts.length ? `<section class="course-posts reveal">
      <h2>相关笔记</h2>
      <div class="latest-grid">${tagPosts.map(p => postCardHtml(p, false)).join("")}</div>
    </section>` : ""}
  </div>`;
  document.title = c.title + " · " + SITE.title;
  sessionStorage.setItem("lastCourse", c.id);
}

/* ---------- 视图三：全部文章（标签筛选） ---------- */
function renderPostsView(view, posts) {
  view.innerHTML = `
  <div class="wrap section">
    <header class="sec-head reveal in">
      <h2>全部文章</h2><p>共 ${posts.length} 篇 · 点标签筛选</p>
    </header>
    <nav class="tagbar" id="tagbar" aria-label="标签筛选"></nav>
    <section id="post-list" class="post-list"></section>
  </div>`;
  document.title = "全部文章 · " + SITE.title;

  const list = document.getElementById("post-list");
  const tagbar = document.getElementById("tagbar");
  const tags = [...new Set(posts.flatMap(p => p.tags || []))];
  let activeTag = null;

  function renderList() {
    list.innerHTML = "";
    const shown = activeTag ? posts.filter(p => (p.tags || []).includes(activeTag)) : posts;
    if (!shown.length) { list.innerHTML = `<p class="empty-tip">这个标签下还没有文章。</p>`; return; }
    shown.forEach((p, i) => {
      const tmp = document.createElement("template");
      tmp.innerHTML = postCardHtml(p, true);
      const card = tmp.content.firstElementChild;
      card.classList.add("reveal");
      card.style.animationDelay = (i * 60) + "ms";
      card.querySelectorAll("button.tag").forEach(b =>
        b.addEventListener("click", () => filter(b.dataset.tag)));
      list.append(card);
      revealIO.observe(card);
    });
  }

  function renderTagbar() {
    tagbar.innerHTML = "";
    const mk = (label, active) => {
      const b = document.createElement("button");
      b.className = "tag" + (active ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", () => filter(label === "全部" ? null : label));
      return b;
    };
    tagbar.append(mk("全部", !activeTag));
    tags.forEach(t => tagbar.append(mk(t, activeTag === t)));
  }

  function filter(tag) { activeTag = tag; renderTagbar(); renderList(); }
  renderTagbar(); renderList();
}

/* ---------- 路由 ---------- */
function parseRoute() {
  const h = location.hash || "#/";
  if (h.startsWith("#/course/")) return { name: "course", id: decodeURIComponent(h.slice(9)) };
  if (h === "#/posts") return { name: "posts" };
  return { name: "home" };
}

let currentKey = "";
async function renderRoute() {
  const hash = location.hash || "#/";
  const route = parseRoute();
  const view = document.getElementById("view");

  // 同一视图内的锚点跳转不重渲染
  if (route.name === "home" && currentKey === "home") {
    if (hash === "#/shelf") { const s = document.getElementById("shelf"); s && s.scrollIntoView({ behavior: "smooth" }); }
    else window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveNav(hash);
    return;
  }

  let posts;
  try { posts = await getPosts(); }
  catch (e) { view.innerHTML = localPreviewHint(); return; }

  setActiveNav(hash);

  if (route.name === "course") {
    const c = COURSES.find(x => x.id === route.id);
    if (!c) {
      view.innerHTML = `<div class="wrap section"><div class="notice">书架上还没有这本教材。<a href="#/">← 返回主页</a></div></div>`;
      document.title = SITE.title; currentKey = ""; return;
    }
    view.innerHTML = "";
    renderCourse(view, c, posts);
  } else if (route.name === "posts") {
    view.innerHTML = "";
    renderPostsView(view, posts);
  } else {
    view.innerHTML = "";
    renderHome(view, posts);
    document.title = SITE.title;
  }

  view.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }],
    { duration: 260, easing: "ease-out" });

  if (hash === "#/shelf" && route.name === "home") {
    const s = document.getElementById("shelf");
    if (s) setTimeout(() => s.scrollIntoView(), 60);
  } else {
    window.scrollTo(0, 0);
  }

  currentKey = route.name;
  bindViewExtras(view);
}

function setActiveNav(hash) {
  document.querySelectorAll(".nav-link[data-nav]").forEach(a => {
    const n = a.dataset.nav;
    const active =
      (n === "posts" && hash === "#/posts") ||
      (n === "shelf" && (hash.startsWith("#/course/") || hash === "#/shelf")) ||
      (n === "home" && (hash === "#/" || hash === ""));
    a.classList.toggle("active", active);
  });
}

/* ---------- 文章页 ---------- */
async function initPost() {
  applySiteConfig();
  initTheme();

  const content = document.getElementById("post-content");
  // 文件名取 #p=（可带 &s=sec-N 章节锚点），?p= 作为兼容
  const m = (location.hash || "").match(/^#p=([^&]+)(?:&s=([^&]+))?/);
  const file = m ? decodeURIComponent(m[1]) : new URLSearchParams(location.search).get("p");
  const sec = m && m[2] ? decodeURIComponent(m[2]) : null;

  let posts;
  try { posts = await getPosts(); }
  catch (e) { content.innerHTML = localPreviewHint(); return; }

  const meta = posts.find(x => x.file === file) || {};
  document.title = (meta.title ? meta.title + " · " : "") + SITE.title;
  document.getElementById("post-title").textContent = meta.title || (file || "未找到文章");

  const metaEl = document.getElementById("post-meta");
  metaEl.innerHTML = (meta.date ? `<time>${meta.date}</time>` : "") +
    (meta.tags || []).map(t => `<button class="tag">${escapeHtml(t)}</button>`).join("");

  // 返回链接：从书架进来时，直接回到那本书的知识结构
  const back = document.getElementById("back-link");
  const last = sessionStorage.getItem("lastCourse");
  const c = last && COURSES.find(x => x.id === last);
  if (back && c) {
    back.href = "index.html#/course/" + c.id;
    back.textContent = "← 返回《" + c.title + "》";
  }

  if (!file) { content.innerHTML = localPreviewHint(); return; }
  try {
    const res = await fetch("posts/" + encodeURIComponent(file), { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const [fm, md] = splitFrontmatter(await res.text());
    const title = meta.title || fm.title;
    const date = meta.date || fm.date;
    if (title) {
      document.getElementById("post-title").textContent = title;
      document.title = title + " · " + SITE.title;
    }
    if ((meta.tags || []).length || fm.tags) {
      const raw = meta.tags || String(fm.tags).replace(/[\[\]]/g, "");
      const tags = (Array.isArray(raw) ? raw : raw.split(/[,，]/))
        .map(s => String(s).trim()).filter(Boolean);
      metaEl.innerHTML = (date ? `<time>${escapeHtml(date)}</time>` : "") +
        tags.map(t => `<button class="tag">${escapeHtml(t)}</button>`).join("");
    }
    content.innerHTML = renderMarkdown(md);

    if (sec) {
      setTimeout(() => {
        const el = document.getElementById(sec);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          el.classList.add("flash-anchor");
          setTimeout(() => el.classList.remove("flash-anchor"), 1800);
        }
      }, 120);
    }
  } catch (e) {
    content.innerHTML = `<div class="notice">文章「${escapeHtml(file)}」不存在或加载失败。</div>`;
  }
}

/* ---------- 启动 ---------- */
const page = document.body.dataset.page;
if (page === "index") {
  applySiteConfig();
  initTheme();
  initNavScroll();
  window.addEventListener("hashchange", renderRoute);
  renderRoute();
} else if (page === "post") {
  initPost();
}
