const fs = require('fs');
const Mustache = require('mustache');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

async function fetchBlogPosts() {
  try {
    const response = await fetch('https://duthaho.substack.com/feed');
    const xml = await response.text();
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xml);
    
    const items = result.rss.channel[0].item || [];
    return items.slice(0, 6).map(item => ({
      title: item.title[0],
      link: item.link[0],
      pubDate: new Date(item.pubDate[0]).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }));
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
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
