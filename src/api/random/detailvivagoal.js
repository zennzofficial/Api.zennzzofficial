const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });
const cache = {}; // In-memory cache

module.exports = function (app) {
  app.get('/berita/vivagoal/detail', async (req, res) => {
    const { url } = req.query;

    if (!url || !url.startsWith('https://vivagoal.com/')) {
      return res.status(400).json({
        status: false,
        message: 'Masukkan parameter ?url= dengan link berita VivaGoal yang valid'
      });
    }

    // Cek cache
    const cacheKey = url;
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].time < 10 * 60 * 1000)) {
      // 10 menit cache
      return res.json(cache[cacheKey].data);
    }

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        httpsAgent: agent
      });
      const $ = cheerio.load(data);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('h1.entry-title').text().trim() ||
        $('title').text().trim();

      const thumbnail =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        '';

      let published =
        $('time.entry-date').text().trim() ||
        $('meta[property="article:published_time"]').attr('content') ||
        $('meta[name="pubdate"]').attr('content') ||
        '';

      let content = '';
      if ($('div.td-post-content').length) {
        content = $('div.td-post-content p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      if (!content && $('div.entry-content').length) {
        content = $('div.entry-content p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      if (!content && $('article').length) {
        content = $('article p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      if (!content) {
        content = $('p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }
      if (!content) {
        content = $('meta[name="description"]').attr('content') || '';
      }
      content = content.split('\n\n').filter(Boolean).join('\n\n');

      const responseData = {
        status: true,
        creator: 'ZenzzXD',
        result: { title, thumbnail, published, content, url }
      };

      // Simpan ke cache
      cache[cacheKey] = { data: responseData, time: Date.now() };

      res.json(responseData);
    } catch (err) {
      res.status(500).json({
        status: false,
        message: 'Gagal mengambil detail berita',
        error: err.message
      });
    }
  });
};
