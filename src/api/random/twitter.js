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
      // Step 1: Ambil halaman utama untuk mendapatkan form dan token
      const { data: html } = await axios.get('https://snaptwitter.io/id', {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const $ = cheerio.load(html);

      // Cari form download dan ambil action + hidden inputs
      const form = $('form').first();
      let action = form.attr('action') || '/download';
      if (!action.startsWith('http')) {
        action = action.startsWith('/') ? `https://snaptwitter.io${action}` : `https://snaptwitter.io/${action}`;
      }

      const hiddenInputs = {};
      form.find('input[type=hidden]').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value');
        if (name && value) {
          hiddenInputs[name] = value;
        }
      });

      // Step 2: Submit form dengan URL tweet
      const formData = new URLSearchParams({
        ...hiddenInputs,
        url: url,
        lang: 'id'
      });

      const resp2 = await axios.post(action, formData, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://snaptwitter.io/id',
          'Origin': 'https://snaptwitter.io'
        }
      });

      const $$ = cheerio.load(resp2.data);

      // Step 3: Extract hasil download
      const results = [];
      
      // Coba berbagai selector untuk link download
      const selectors = [
        '#downloadContainer a',
        '.download-links a',
        '.result a',
        'a[href*="download"]',
        'a[download]'
      ];

      for (const selector of selectors) {
        $$(selector).each((_, el) => {
          const quality = $$(el).text().trim();
          const link = $$(el).attr('href');
          
          if (link && quality && !results.find(r => r.url === link)) {
            // Filter hanya link download yang valid
            if (link.includes('http') || link.includes('download')) {
              results.push({ 
                quality: quality || 'Unknown', 
                url: link.startsWith('http') ? link : `https://snaptwitter.io${link}`
              });
            }
          }
        });
        
        if (results.length > 0) break; // Stop jika sudah dapat hasil
      }

      // Coba ambil info tweet juga
      const tweetInfo = {
        title: $$('h1, .tweet-title, .title').first().text().trim() || '',
        author: $$('.author, .username, .tweet-author').first().text().trim() || '',
        thumbnail: $$('img').first().attr('src') || ''
      };

      if (!results.length) {
        return res.status(500).json({
          status: false,
          creator: "ZenzzXD",
          message: 'Tidak ditemukan link download. Tweet mungkin bersifat privat, tidak mengandung media, atau URL tidak valid.'
        });
      }

      res.json({ 
        status: true, 
        creator: "ZenzzXD",
        result: {
          tweet: tweetInfo,
          downloads: results
        }
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
