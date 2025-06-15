const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  app.get('/downloader/twitter', async (req, res) => {
    const { url } = req.query;
    
    // Validasi URL Twitter/X
    if (!url || !/^https?:\/\/(twitter\.com|x\.com)\/.+/.test(url)) {
      return res.status(400).json({
        status: false,
        creator: "ZenzzXD",
        message: "Parameter ?url= wajib diisi dengan link tweet dari twitter.com atau x.com"
      });
    }

    try {
      // Method 1: Coba POST langsung ke endpoint yang umum dipakai
      const endpoints = [
        'https://snaptwitter.io/download',
        'https://snaptwitter.io/api/download',
        'https://snaptwitter.io/process',
        'https://snaptwitter.io/submit'
      ];

      let success = false;
      let finalResult = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const formData = new URLSearchParams({
            url: url,
            lang: 'id'
          });

          const response = await axios.post(endpoint, formData, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': 'https://snaptwitter.io/id',
              'Origin': 'https://snaptwitter.io',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 15000
          });

          if (response.status === 200) {
            const $$ = cheerio.load(response.data);
            
            // Extract hasil download
            const results = {
              videos: [],
              photos: [],
              gifs: []
            };
            
            // Coba berbagai selector
            const selectors = [
              'a[href*=".mp4"]',
              'a[href*=".jpg"]',
              'a[href*=".png"]',
              'a[href*=".gif"]',
              'a[download]',
              '.download-link',
              '.result a',
              '#result a'
            ];

            selectors.forEach(selector => {
              $$(selector).each((_, el) => {
                const link = $$(el).attr('href');
                const text = $$(el).text().trim();
                
                if (link && (link.includes('http') || link.includes('.'))) {
                  const fullUrl = link.startsWith('http') ? link : `https://snaptwitter.io${link}`;
                  
                  if (link.includes('.mp4') || text.toLowerCase().includes('video')) {
                    results.videos.push({ quality: text || 'Video', url: fullUrl, type: 'video' });
                  } else if (link.includes('.jpg') || link.includes('.png') || text.toLowerCase().includes('photo')) {
                    results.photos.push({ quality: text || 'Photo', url: fullUrl, type: 'photo' });
                  } else if (link.includes('.gif') || text.toLowerCase().includes('gif')) {
                    results.gifs.push({ quality: text || 'GIF', url: fullUrl, type: 'gif' });
                  }
                }
              });
            });

            const totalMedia = results.videos.length + results.photos.length + results.gifs.length;
            
            if (totalMedia > 0) {
              finalResult = {
                tweet: {
                  title: $$('h1, .title').first().text().trim() || '',
                  author: $$('.author, .username').first().text().trim() || '',
                  thumbnail: $$('img').first().attr('src') || ''
                },
                media: {
                  total: totalMedia,
                  videos: results.videos,
                  photos: results.photos,
                  gifs: results.gifs
                }
              };
              success = true;
              break;
            }
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed:`, endpointError.message);
          continue;
        }
      }

      if (success && finalResult) {
        return res.json({
          status: true,
          creator: "ZenzzXD",
          result: finalResult
        });
      }

      // Method 2: Kalau semua endpoint gagal, coba scraping dengan GET + form detection
      try {
        const { data: html } = await axios.get('https://snaptwitter.io/id', {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        const $ = cheerio.load(html);
        const form = $('form').first();
        const action = form.attr('action');
        const method = form.attr('method') || 'POST';
        
        if (action) {
          const fullAction = action.startsWith('http') ? action : `https://snaptwitter.io${action}`;
          console.log(`Found form action: ${fullAction}, method: ${method}`);
          
          // Coba dengan method yang ditemukan
          const formData = new URLSearchParams({ url: url, lang: 'id' });
          
          const response = method.toUpperCase() === 'GET' 
            ? await axios.get(`${fullAction}?${formData}`)
            : await axios.post(fullAction, formData, {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Referer': 'https://snaptwitter.io/id'
                }
              });
              
          // Parse response...
          // (sama seperti di atas)
        }
      } catch (fallbackError) {
        console.log('Fallback method failed:', fallbackError.message);
      }

      // Kalau semua gagal
      return res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Tidak ditemukan media atau snaptwitter.io sedang bermasalah. Coba lagi nanti atau gunakan tweet dengan media yang jelas.'
      });

    } catch (err) {
      console.error('Error snaptwitter:', err.message);
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Gagal scrape data dari snaptwitter.io',
        error: err.message
      });
    }
  });
};
