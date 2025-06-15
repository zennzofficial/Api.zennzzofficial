const axios = require('axios');

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
      // Pakai endpoint API yang ditemukan JH
      const response = await axios.post(
        "https://twitter.snapfirecdn.com/twitter",
        {
          target: url
        },
        {
          headers: {
            "accept": "application/json",
            "content-type": "application/json",
            "referer": "https://snaptwitter.io/",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        }
      );

      const data = response.data;
      
      if (!data.medias || data.medias.length === 0) {
        return res.status(500).json({
          status: false,
          creator: "ZenzzXD",
          message: 'Tidak ditemukan media. Tweet mungkin private, tidak ada media, atau hanya berisi teks.'
        });
      }

      // Kategorikan media berdasarkan type
      const results = {
        videos: [],
        photos: [],
        gifs: []
      };

      data.medias.forEach(media => {
        const mediaItem = {
          quality: media.type || 'Unknown',
          url: media.media,
          type: media.content_type || media.type,
          content_type: media.content_type
        };

        if (media.content_type === 'video' || media.type === 'video' || media.media.includes('.mp4')) {
          results.videos.push(mediaItem);
        } else if (media.content_type === 'photo' || media.type === 'photo' || media.media.includes('.jpg') || media.media.includes('.png')) {
          results.photos.push(mediaItem);
        } else if (media.content_type === 'gif' || media.type === 'gif' || media.media.includes('.gif')) {
          results.gifs.push(mediaItem);
        } else {
          // Default ke videos kalau tidak bisa deteksi
          results.videos.push(mediaItem);
        }
      });

      const totalMedia = results.videos.length + results.photos.length + results.gifs.length;

      res.json({
        status: true,
        creator: "ZenzzXD",
        result: {
          tweet: {
            title: '',
            author: data.username || '',
            thumbnail: results.photos[0]?.url || results.videos[0]?.url || ''
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
      console.error('Error snaptwitter API:', err.message);
      
      const detail = err.response?.data || err.message;
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Gagal mengambil data dari Twitter',
        error: detail
      });
    }
  });
};
