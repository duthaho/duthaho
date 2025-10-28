const fs = require('fs');
const Mustache = require('mustache');
const fetch = require('node-fetch');

async function fetchBlogPosts() {
  try {
    const response = await fetch('https://duthaho.substack.com/feed');
    const text = await response.text();
    
    // Use regex to parse RSS instead of XML parser to avoid encoding issues
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
    const linkRegex = /<link>(.*?)<\/link>/;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
    
    let match;
    while ((match = itemRegex.exec(text)) !== null && items.length < 6) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(titleRegex);
      const linkMatch = itemContent.match(linkRegex);
      const pubDateMatch = itemContent.match(pubDateRegex);
      
      if (titleMatch && linkMatch && pubDateMatch) {
        items.push({
          title: titleMatch[1].trim(),
          link: linkMatch[1].trim(),
          pubDate: new Date(pubDateMatch[1]).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        });
      }
    }
    
    return items.length > 0 ? items : [
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
