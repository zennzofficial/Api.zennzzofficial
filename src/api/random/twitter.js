const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  app.get('/downloader/twitter', async (req, res) => {
    const { url } = req.query;
    
    if (!url || !/^https?:\/\/(twitter\.com|x\.com)\/.+/.test(url)) {
      return res.status(400).json({
        status: false,
        creator: "ZenzzXD",
        message: "Parameter ?url= wajib diisi dengan link tweet dari twitter.com atau x.com"
      });
    }

    try {
      // Berdasarkan hasil sniffing
      const response = await axios.post('https://snaptwitter.io/action.php', 
        new URLSearchParams({
          url: url,
          lang: 'id'
        }), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://snaptwitter.io/id',
          'Origin': 'https://snaptwitter.io',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract berdasarkan struktur asli snaptwitter
      const results = {
        videos: [],
        photos: [],
        gifs: []
      };

      // Cari di container download
      $('.download-items .download-item').each((_, el) => {
        const quality = $(el).find('.download-item__label').text().trim();
        const type = $(el).find('.download-item__type').text().trim();
        const size = $(el).find('.download-item__size').text().trim();
        const link = $(el).find('a').attr('href');
        
        if (link && quality) {
          const mediaItem = {
            quality: quality || 'Unknown',
            type: type || 'media',
            size: size || '',
            url: link.startsWith('http') ? link : `https://snaptwitter.io${link}`
          };

          if (type.toLowerCase().includes('video') || link.includes('.mp4')) {
            results.videos.push(mediaItem);
          } else if (type.toLowerCase().includes('photo') || type.toLowerCase().includes('image') || link.includes('.jpg') || link.includes('.png')) {
            results.photos.push(mediaItem);
          } else if (type.toLowerCase().includes('gif') || link.includes('.gif')) {
            results.gifs.push(mediaItem);
          } else {
            // Default ke video kalau tidak bisa deteksi
            results.videos.push(mediaItem);
          }
        }
      });

      // Fallback: cari link download lain
      if (results.videos.length === 0 && results.photos.length === 0) {
        $('a[href*="download"], a[download]').each((_, el) => {
          const link = $(el).attr('href');
          const text = $(el).text().trim();
          
          if (link && (link.includes('http') || link.includes('download'))) {
            const fullUrl = link.startsWith('http') ? link : `https://snaptwitter.io${link}`;
            
            if (link.includes('.mp4') || text.toLowerCase().includes('video')) {
              results.videos.push({
                quality: text || 'Video',
                type: 'video',
                size: '',
                url: fullUrl
              });
            } else if (link.includes('.jpg') || link.includes('.png') || text.toLowerCase().includes('photo')) {
              results.photos.push({
                quality: text || 'Photo',
                type: 'photo',
                size: '',
                url: fullUrl
              });
            }
          }
        });
      }

      // Extract info tweet
      const tweetInfo = {
        title: $('.download-title').text().trim() || $('h1').text().trim() || '',
        author: $('.download-author').text().trim() || '',
        thumbnail: $('.download-cover img').attr('src') || $('img').first().attr('src') || ''
      };

      const totalMedia = results.videos.length + results.photos.length + results.gifs.length;

      if (totalMedia === 0) {
        return res.status(500).json({
          status: false,
          creator: "ZenzzXD",
          message: 'Tidak ditemukan media. Tweet mungkin private, tidak ada media, atau hanya berisi teks.'
        });
      }

      res.json({
        status: true,
        creator: "ZenzzXD",
        result: {
          tweet: tweetInfo,
          media: {
            total: totalMedia,
            videos: results.videos,
            photos: results.photos,
            gifs: results.gifs
          }
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
