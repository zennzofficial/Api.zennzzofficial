const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function (app) {
  app.get('/berita/cnnindonesia', async (req, res) => {
    try {
      const { data } = await axios.get('https://www.cnnindonesia.com/');
      const $ = cheerio.load(data);
      const articles = [];

      $('article').each((_, el) => {
        const title = $(el).find('h2, h3').text().trim();
        const link = $(el).find('a').attr('href');
        const thumbnail = $(el).find('img').attr('src') || null;

        if (title && link && link.startsWith('https://')) {
          articles.push({ title, link, thumbnail });
        }
      });

      res.json({
        status: true,
        creator: 'ZenzzXD',
        count: articles.length,
        result: articles.slice(0, 20)
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: 'Gagal mengambil data dari cnnindonesia.com',
        error: err.message
      });
    }
  });
};
