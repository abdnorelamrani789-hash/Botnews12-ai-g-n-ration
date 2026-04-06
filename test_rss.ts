import axios from 'axios';

const urls = [
  'https://www.aljazeera.net/rss',
  'https://www.filgoal.com/rss'
];

async function test() {
  for (const url of urls) {
    try {
      const res = await axios.get(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000 
      });
      console.log(`URL: ${url} - Status: ${res.status}`);
    } catch (err: any) {
      console.log(`URL: ${url} - Error: ${err.response?.status || err.message}`);
    }
  }
}

test();
