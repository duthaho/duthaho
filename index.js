const fs = require('fs');
const Mustache = require('mustache');

const BLOG_URL = 'https://duthaho.dev/';
const POST_LIMIT = 6;

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decode = s => s.replace(/&(amp|lt|gt|quot|#39|apos);/g, m => ENTITIES[m]);
const stripTags = s => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function formatDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

async function fetchBlogPosts() {
  try {
    const res = await fetch(BLOG_URL, {
      headers: { 'User-Agent': 'duthaho-profile-readme' },
    });
    if (!res.ok) throw new Error(`Blog fetch ${res.status}`);
    const html = await res.text();

    const cardRe = /<a\s+class="[^"]*\bpost-card\b[^"]*"\s+href="([^"]+)"[\s\S]*?<span class="terminal-status">([^<]+)<\/span>[\s\S]*?<div class="post-title">([\s\S]*?)<\/div>/g;

    const posts = [];
    for (const m of html.matchAll(cardRe)) {
      posts.push({
        title: stripTags(m[3]),
        link: new URL(m[1], BLOG_URL).href,
        pubDate: formatDate(m[2].trim()),
      });
      if (posts.length >= POST_LIMIT) break;
    }
    if (posts.length === 0) throw new Error('No post cards parsed — blog template may have changed');

    console.log(`Successfully fetched ${posts.length} blog posts`);
    return posts;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [
      {
        title: 'Visit my blog for latest posts',
        link: 'https://duthaho.dev',
        pubDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      },
    ];
  }
}

async function generateReadme() {
  const template = fs.readFileSync('main.mustache', 'utf-8');

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
    blogPosts: await fetchBlogPosts(),
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
