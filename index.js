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
