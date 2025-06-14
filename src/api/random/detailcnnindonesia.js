const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  // Detail berita CNNIndonesia
  app.get('/berita/cnnindonesia/detail', async (req, res) => {
    const { url } = req.query;

    if (!url || !url.startsWith('https://www.cnnindonesia.com/')) {
      return res.status(400).json({
        status: false,
        message: 'Masukkan parameter ?url= dengan link berita CNNIndonesia yang valid'
      });
    }

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const $ = cheerio.load(data);

      // Judul
      const title = $('h1').first().text().trim();

      // Thumbnail
      const thumbnail = $('meta[property="og:image"]').attr('content') || '';

      // Published date, coba beberapa kemungkinan
      let published = $('div.detail__date').text().trim();
      if (!published) published = $('div.video-detail__date').text().trim();
      if (!published) published = $('meta[property="article:published_time"]').attr('content') || '';
      if (!published) published = $('meta[name="pubdate"]').attr('content') || '';

      // Content, coba beberapa kemungkinan
      let content = '';
      // Coba ambil dari detail__body
      if ($('div.detail__body').length) {
        content = $('div.detail__body p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      // Kalau kosong, coba ambil dari video-detail__caption
      if (!content && $('div.video-detail__caption').length) {
        content = $('div.video-detail__caption').text().trim();
      }
      // Kalau masih kosong, coba ambil dari meta description
      if (!content) {
        content = $('meta[name="description"]').attr('content') || '';
      }
      // Kalau masih kosong juga, coba ambil semua paragraf di main
      if (!content && $('main').length) {
        content = $('main p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }

      res.json({
        status: true,
        creator: 'ZenzzXD',
        result: { title, thumbnail, published, content, url }
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: 'Gagal mengambil detail berita',
        error: err.message
      });
    }
  });
};
