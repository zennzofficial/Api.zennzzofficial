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
      // Step 1: Kunjungi halaman utama dulu (buat dapet cookie/session)
      const session = axios.create();
      
      await session.get('https://snaptwitter.io/id', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0'
        }
      });

      // Step 2: Submit form dengan session yang sama
      const response = await session.post('https://snaptwitter.io/action.php', 
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
          'Accept': '*/*',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        }
      });

      const $ = cheerio.load(response.data);
      
      const results = {
        videos: [],
        photos: [],
        gifs: []
      };

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
          } else if (type.toLowerCase().includes('photo') || link.includes('.jpg') || link.includes('.png')) {
            results.photos.push(mediaItem);
          } else if (type.toLowerCase().includes('gif') || link.includes('.gif')) {
            results.gifs.push(mediaItem);
          } else {
            results.videos.push(mediaItem);
          }
        }
      });

      const totalMedia = results.videos.length + results.photos.length + results.gifs.length;

      if (totalMedia === 0) {
        return res.status(500).json({
          status: false,
          creator: "ZenzzXD",
          message: 'Tidak ditemukan media. Tweet mungkin private atau tidak ada media.'
        });
      }

      res.json({
        status: true,
        creator: "ZenzzXD",
        result: {
          tweet: {
            title: $('.download-title').text().trim() || '',
            author: $('.download-author').text().trim() || '',
            thumbnail: $('.download-cover img').attr('src') || ''
          },
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
      
      // Fallback ke API lain kalau snaptwitter gagal
      try {
        const fallbackResponse = await axios.get(`https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(url)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (fallbackResponse.data && fallbackResponse.data.result) {
          const data = fallbackResponse.data.result;
          return res.json({
            status: true,
            creator: "ZenzzXD",
            result: {
              tweet: {
                title: data.desc || '',
                author: data.author || '',
                thumbnail: data.thumb || ''
              },
              media: {
                total: (data.video ? 1 : 0) + (data.images ? data.images.length : 0),
                videos: data.video ? [{ quality: 'Video', url: data.video, type: 'video' }] : [],
                photos: data.images || [],
                gifs: []
              }
            }
          });
        }
      } catch (fallbackErr) {
        console.log('Fallback API also failed:', fallbackErr.message);
      }

      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Snaptwitter.io diblokir atau bermasalah. Coba lagi nanti.',
        error: err.message
      });
    }
  });
};
