const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  app.get('/berita/vivagoal/detail', async (req, res) => {
    const { url } = req.query;

    if (!url || !url.startsWith('https://vivagoal.com/')) {
      return res.status(400).json({
        status: false,
        message: 'Masukkan parameter ?url= dengan link berita VivaGoal yang valid'
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
      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('h1.entry-title').text().trim() ||
        $('title').text().trim();

      // Thumbnail
      const thumbnail =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        '';

      // Tanggal publish
      let published =
        $('time.entry-date').text().trim() ||
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="pubdate"]').attr('content') ||
        '';

      // Konten utama
      let content = '';
      // 1. Coba ambil dari td-post-content
      if ($('div.td-post-content').length) {
        content = $('div.td-post-content p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      // 2. Fallback ke entry-content
      if (!content && $('div.entry-content').length) {
        content = $('div.entry-content p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      // 3. Fallback ke article
      if (!content && $('article').length) {
        content = $('article p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      // 4. Fallback ke semua <p>
      if (!content) {
        content = $('p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      // 5. Fallback ke meta description
      if (!content) {
        content = $('meta[name="description"]').attr('content') || '';
      }

      // Bersihkan konten dari spasi kosong
      content = content.split('\n\n').filter(Boolean).join('\n\n');

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
