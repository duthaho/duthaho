const fs = require('fs');
const Mustache = require('mustache');
const Parser = require('rss-parser');

async function fetchBlogPosts() {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://duthaho.substack.com/feed');
    
    return feed.items.slice(0, 6).map(item => ({
      title: item.title,
      link: item.link,
      pubDate: new Date(item.pubDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }));
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [
      {
        title: 'Visit my Substack for latest posts',
        link: 'https://duthaho.substack.com',
        pubDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      }
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
      timeZoneName: 'short'
    }),
    blogPosts: await fetchBlogPosts(),
    refresh_date: new Date().toLocaleString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    })
  };

  const output = Mustache.render(template, data);
  fs.writeFileSync('README.md', output);
  console.log('README.md updated successfully!');
}

generateReadme();
