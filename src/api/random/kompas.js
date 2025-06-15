const axios = require('axios');
const cheerio = require('cheerio');

module.exports = function(app) {
  app.get('/berita/kompas', async (req, res) => {
    try {
      const { data } = await axios.get('https://www.kompas.com/', {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(data);
      const articles = [];

      // Coba beberapa selector yang berbeda untuk artikel Kompas
      const selectors = [
        'article.article--list',
        'article.article--photo',
        'div.article__list',
        'div.latest__item',
        'article',
        '.article'
      ];

      let foundArticles = false;

      for (const selector of selectors) {
        if (foundArticles) break;
        
        $(selector).each((i, el) => {
          // Coba berbagai selector untuk title
          let title = $(el).find('h3 a').text().trim() ||
                     $(el).find('h2 a').text().trim() ||
                     $(el).find('.article__title a').text().trim() ||
                     $(el).find('.article__link').text().trim() ||
                     $(el).find('a').first().text().trim();

          // Coba berbagai selector untuk URL
          let url = $(el).find('h3 a').attr('href') ||
                   $(el).find('h2 a').attr('href') ||
                   $(el).find('.article__title a').attr('href') ||
                   $(el).find('.article__link').attr('href') ||
                   $(el).find('a').first().attr('href');

          // Coba berbagai selector untuk thumbnail
          let thumb = $(el).find('img').attr('data-src') ||
                     $(el).find('img').attr('src') ||
                     $(el).find('img').attr('data-original') ||
                     '';

          // Pastikan URL lengkap
          if (url && !url.startsWith('http')) {
            if (url.startsWith('/')) {
              url = 'https://www.kompas.com' + url;
            } else {
              url = 'https://www.kompas.com/' + url;
            }
          }

          // Pastikan thumbnail URL lengkap
          if (thumb && !thumb.startsWith('http') && thumb.startsWith('/')) {
            thumb = 'https://www.kompas.com' + thumb;
          }

          if (title && url && title.length > 10) {
            articles.push({
              title,
              url,
              thumbnail: thumb
            });
            foundArticles = true;
          }
        });
      }

      // Hapus duplikat berdasarkan URL
      const uniqueArticles = articles.filter((article, index, self) =>
        index === self.findIndex(a => a.url === article.url)
      );

      if (!uniqueArticles.length) {
        return res.status(500).json({
          status: false,
          creator: "ZenzzXD",
          message: 'Gagal mengambil data: Struktur HTML mungkin berubah atau tidak ada artikel ditemukan.'
        });
      }

      res.json({
        status: true,
        creator: "ZenzzXD",
        count: uniqueArticles.length,
        result: uniqueArticles.slice(0, 20) // Batasi maksimal 20 artikel
      });

    } catch (error) {
      console.error('Scrape error:', error.message);
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: 'Terjadi kesalahan saat mengambil data dari kompas.com',
        error: error.message
      });
    }
  });
};
