const fs = require('fs');
const Mustache = require('mustache');

const BLOG_URL = 'https://duthaho.dev/';
const FEED_URL = new URL('feed.xml', BLOG_URL).href;
const POST_LIMIT = 6;

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|apos);/g, m => ENTITIES[m]);
const stripTags = s => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

const DATE_FMT = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' };

async function fetchBlogPosts() {
  const res = await fetch(FEED_URL, {
    headers: { 'User-Agent': 'duthaho-profile-readme' },
  });
  if (!res.ok) throw new Error(`Feed fetch ${res.status}`);
  const xml = await res.text();

  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  const field = (block, tag) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1];

  const posts = [];
  for (const m of xml.matchAll(itemRe)) {
    const block = m[1];
    const title = field(block, 'title');
    const link = field(block, 'link');
    const pubDate = field(block, 'pubDate');
    if (!title || !link || !pubDate) {
      throw new Error('Feed item missing required field (title/link/pubDate)');
    }
    posts.push({
      title: stripTags(title),
      link: stripTags(link),
      pubDate: new Date(pubDate).toLocaleDateString('en-US', DATE_FMT),
    });
    if (posts.length >= POST_LIMIT) break;
  }
  if (posts.length === 0) throw new Error('No items found in feed');

  console.log(`Successfully fetched ${posts.length} blog posts`);
  return posts;
}

// ------------------------------------------------------------------
// GitHub stats → static blueprint-styled SVG card (stats.svg).
// Generated at build time so the README never depends on a
// rate-limited third-party image service.
// ------------------------------------------------------------------

const USER = 'duthaho';

async function fetchGithubStats() {
  const headers = { 'User-Agent': 'duthaho-profile-readme', Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const [userRes, repoRes] = await Promise.all([
    fetch(`https://api.github.com/users/${USER}`, { headers }),
    fetch(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`, { headers }),
  ]);
  if (!userRes.ok) throw new Error(`GitHub user API ${userRes.status}`);
  if (!repoRes.ok) throw new Error(`GitHub repos API ${repoRes.status}`);

  const user = await userRes.json();
  const repos = (await repoRes.json()).filter(r => !r.fork);

  const stars = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const forks = repos.reduce((s, r) => s + r.forks_count, 0);

  const langCount = {};
  for (const r of repos) {
    if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  }
  const total = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
  const langs = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, pct: Math.round(100 * count / total) }));

  console.log(`Fetched GitHub stats: ${stars} stars, ${repos.length} repos`);
  return { stars, forks, followers: user.followers, repos: repos.length, langs };
}

function renderStatsSvg(s) {
  const W = 860, H = 216;
  const BRIGHT = '#e7ede9', DIM = '#8a968f', LINE = 'rgba(155,178,165,0.28)', AMBER = '#f2b544', GREEN = '#7ee787';
  const MONO = "'SFMono-Regular','Consolas','Liberation Mono',monospace";

  const dims = [
    { value: s.stars, label: 'STARS EARNED' },
    { value: s.repos, label: 'PUBLIC REPOS' },
    { value: s.followers, label: 'FOLLOWERS' },
    { value: s.forks, label: 'FORKS OF MY WORK' },
  ].map((d, i) => {
    const x = 36 + i * 160;
    return `
    <g>
      <line x1="${x}" y1="76" x2="${x}" y2="112" stroke="${DIM}" stroke-width="1"/>
      <line x1="${x + 128}" y1="76" x2="${x + 128}" y2="112" stroke="${DIM}" stroke-width="1"/>
      <text x="${x + 64}" y="102" text-anchor="middle" font-family="${MONO}" font-size="27" font-weight="600" fill="${GREEN}">${d.value}</text>
      <text x="${x + 64}" y="128" text-anchor="middle" font-family="${MONO}" font-size="9" letter-spacing="1.5" fill="${DIM}">${d.label}</text>
    </g>`;
  }).join('');

  const BAR_X = 36, BAR_W = 500, BAR_Y = 158;
  const COLORS = ['#7ee787', '#8ab4f8', '#f2b544', '#56b877', '#b8c9c0'];
  let cursor = BAR_X;
  const segs = s.langs.map((l, i) => {
    const w = BAR_W * l.pct / 100;
    const seg = `<rect x="${cursor.toFixed(1)}" y="${BAR_Y}" width="${Math.max(w - 2, 2).toFixed(1)}" height="8" fill="${COLORS[i % COLORS.length]}"/>`;
    cursor += w;
    return seg;
  }).join('');
  const legend = s.langs.map((l, i) =>
    `<tspan fill="${COLORS[i % COLORS.length]}">■</tspan> <tspan fill="${DIM}">${l.name} ${l.pct}%</tspan>${i < s.langs.length - 1 ? '  ' : ''}`
  ).join('');

  const rev = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="GitHub stats for ${USER}">
  <defs>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(155,178,165,0.07)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#0a0e0c"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="${LINE}" stroke-width="1"/>
  <text x="36" y="46" font-family="${MONO}" font-size="11" letter-spacing="2.5" fill="${DIM}">GITHUB — LIVE · @${USER.toUpperCase()}</text>
  <text x="${W - 36}" y="46" text-anchor="end" font-family="${MONO}" font-size="11" letter-spacing="1" fill="${DIM}"><tspan fill="${AMBER}">▎</tspan>REV ${rev}</text>
  ${dims}
  <text x="${BAR_X}" y="${BAR_Y - 10}" font-family="${MONO}" font-size="9" letter-spacing="1.5" fill="${DIM}">TOP LANGUAGES</text>
  ${segs}
  <text x="${BAR_X}" y="${BAR_Y + 28}" font-family="${MONO}" font-size="10">${legend}</text>
  <text x="${W - 36}" y="${BAR_Y + 28}" text-anchor="end" font-family="${MONO}" font-size="9" letter-spacing="1.5" fill="${DIM}">AUTO-REFRESHED WEEKLY</text>
</svg>
`;
}

// ------------------------------------------------------------------
// Neofetch-style hero card (neofetch.svg) — terminal ASCII art on the
// left, system-info fields on the right, in the same blueprint theme
// as stats.svg. GitHub numbers are baked in at build time.
// ------------------------------------------------------------------

function renderNeofetchSvg(s) {
  const BRIGHT = '#e7ede9', DIM = '#8a968f', KEY = '#7ee787', LINE = 'rgba(155,178,165,0.28)';
  const AMBER = '#f2b544', DOT = 'rgba(170,190,180,0.26)', ART = '#7ee787', ARTHI = '#e7ede9';
  const MONO = "'SFMono-Regular','Consolas','Liberation Mono',monospace";
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // --- Left: terminal window rendered in pure ASCII (guaranteed to align) ---
  const IW = 18; // inner width
  const frame = t => '|' + t.padEnd(IW).slice(0, IW) + '|';
  const artLines = [
    '.' + '-'.repeat(IW) + '.',
    frame('  o  o  o'),
    '|' + '-'.repeat(IW) + '|',
    frame(' ~ $ whoami'),
    frame(' > duthaho'),
    frame(''),
    frame(' ~ $ ./ship --all'),
    frame(' [########--] 92%'),
    frame(''),
    frame(' ~ $ _'),
    "'" + '-'.repeat(IW) + "'",
  ];

  // --- Right: neofetch-style key/value fields (grounded in real bio) ---
  const HEAD = t => ({ head: t });
  const KV = (k, v, c) => ({ k, v, c });
  const GAP = { gap: true };
  const rows = [
    HEAD('duthaho@architect'),
    KV('OS', 'Distributed Systems · Linux · K8s'),
    KV('Host', 'Paradox  (ex-Gameloft)'),
    KV('Uptime', '12 years shipping to production'),
    KV('Kernel', 'Event-driven + DDD @ 1M+ req/day'),
    KV('IDE', 'VS Code · Claude Code'),
    KV('Location', 'Da Nang, Vietnam'),
    GAP,
    KV('Languages.Programming', 'Python · TypeScript · Rust'),
    KV('Languages.Framework', 'Django · FastAPI · Node.js · Vue'),
    KV('Languages.Data', 'MySQL · MongoDB · Redis'),
    KV('Languages.Infra', 'Kubernetes · Docker · AWS'),
    KV('Languages.Human', 'Vietnamese · English'),
    GAP,
    KV('Hobbies.Software', 'AI tooling · system design'),
    KV('Hobbies.Writing', 'field notes @ duthaho.dev'),
    GAP,
    HEAD('Contact'),
    KV('Portfolio', 'duthaho.github.io', BRIGHT),
    KV('Blog', 'duthaho.dev', BRIGHT),
    KV('LinkedIn', 'in/duthaho', BRIGHT),
    KV('Substack', 'duthaho.substack.com', BRIGHT),
    GAP,
    HEAD('GitHub Stats'),
    KV('Repos', `${s.repos}      Stars: ${s.stars}`, BRIGHT),
    KV('Followers', `${s.followers}      Forks: ${s.forks}`, BRIGHT),
  ];

  const INFO_X = 300, LH = 20.5, DOTCOL = 24;
  let y = 108;
  const info = rows.map(r => {
    if (r.gap) { y += LH * 0.55; return ''; }
    const yy = y; y += LH;
    if (r.head) {
      const rule = '─'.repeat(Math.max(4, 34 - r.head.length));
      return `<text x="${INFO_X}" y="${yy}" xml:space="preserve" font-family="${MONO}" font-size="13" font-weight="600">`
        + `<tspan fill="${AMBER}">${esc(r.head)}</tspan> <tspan fill="${LINE}">${rule}</tspan></text>`;
    }
    const label = r.k + ':';
    const dots = '.'.repeat(Math.max(2, DOTCOL - label.length));
    return `<text x="${INFO_X}" y="${yy}" xml:space="preserve" font-family="${MONO}" font-size="13">`
      + `<tspan fill="${KEY}">${esc(label)}</tspan> <tspan fill="${DOT}">${dots}</tspan> `
      + `<tspan fill="${r.c || DIM}">${esc(r.v)}</tspan></text>`;
  }).join('\n  ');

  const W = 900, H = Math.ceil(y + 40);
  const rev = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  const artStartY = 118, artLH = 18.5;
  const art = artLines.map((ln, i) => {
    const hi = i === 4 || i === 9; // highlight the prompt/output lines
    return `<text x="44" y="${(artStartY + i * artLH).toFixed(1)}" xml:space="preserve" `
      + `font-family="${MONO}" font-size="14" fill="${hi ? ARTHI : ART}">${esc(ln)}</text>`;
  }).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Profile card for ${USER}">
  <defs>
    <pattern id="ngrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(155,178,165,0.07)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#0a0e0c"/>
  <rect width="${W}" height="${H}" fill="url(#ngrid)"/>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="${LINE}" stroke-width="1"/>
  <line x1="278" y1="30" x2="278" y2="${H - 56}" stroke="${LINE}" stroke-width="1"/>
  <text x="36" y="46" font-family="${MONO}" font-size="11" letter-spacing="2.5" fill="${DIM}">PROFILE — LIVE · @${USER.toUpperCase()}</text>
  <text x="${W - 36}" y="46" text-anchor="end" font-family="${MONO}" font-size="11" letter-spacing="1" fill="${DIM}"><tspan fill="${AMBER}">▎</tspan>REV ${rev}</text>
  ${art}
  <text x="44" y="${(artStartY + artLines.length * artLH + 14).toFixed(1)}" font-family="${MONO}" font-size="11" letter-spacing="1.5" fill="${DIM}">SOLUTION ARCHITECT</text>
  ${info}
  <text x="${W - 36}" y="${H - 22}" text-anchor="end" font-family="${MONO}" font-size="9" letter-spacing="1.5" fill="${DIM}">AUTO-REFRESHED WEEKLY</text>
</svg>
`;
}

async function generateReadme() {
  const template = fs.readFileSync('main.mustache', 'utf-8');

  const [blogPosts, githubStats] = await Promise.all([
    fetchBlogPosts(),
    fetchGithubStats(),
  ]);

  fs.writeFileSync('stats.svg', renderStatsSvg(githubStats));
  console.log('stats.svg updated successfully!');

  fs.writeFileSync('neofetch.svg', renderNeofetchSvg(githubStats));
  console.log('neofetch.svg updated successfully!');

  const data = {
    date: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
    blogPosts,
    refresh_date: new Date().toLocaleString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }),
  };

  const output = Mustache.render(template, data);
  fs.writeFileSync('README.md', output);
  console.log('README.md updated successfully!');
}

generateReadme();
