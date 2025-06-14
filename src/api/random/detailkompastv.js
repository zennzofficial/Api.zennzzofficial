const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });

module.exports = function (app) {
  // Route: GET daftar berita utama KompasTV
  app.get('/berita/kompas-tv', async (req, res) => {
    try {
      const { data } = await axios.get('https://www.kompas.tv/', { httpsAgent: agent });
      const $ = cheerio.load(data);
      const articles = [];

      $('a.card__link').each((_, el) => {
        const url = 'https://www.kompas.tv' + $(el).attr('href');
        const title = $(el).find('.card__title').text().trim();
        if (title && url.includes('/article/')) {
          articles.push({ title, url });
        }
      });

      res.json({
        status: true,
        creator: 'ZenzzXD',
        count: articles.length,
        result: articles
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: 'Gagal mengambil daftar berita KompasTV',
        error: err.message
      });
    }
  });

  // Route: GET detail berita dari URL
  app.get('/berita/kompas-tv/detail', async (req, res) => {
    const { url } = req.query;
    if (!url || !url.startsWith('https://www.kompas.tv/article/')) {
      return res.status(400).json({
        status: false,
        message: 'Masukkan parameter ?url= dengan link berita KompasTV yang valid'
      });
    }

    try {
      const { data } = await axios.get(url, { httpsAgent: agent });
      const $ = cheerio.load(data);

      const title = $('h1.article__title').text().trim();
      const thumbnail = $('meta[property="og:image"]').attr('content') || null;
      const published = $('time').text().trim();
      const content = $('.article__body p').map((_, el) => $(el).text().trim()).get().join('\n\n');

      res.json({
        status: true,
        creator: 'ZenzzXD',
        result: { title, published, thumbnail, content, url }
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
