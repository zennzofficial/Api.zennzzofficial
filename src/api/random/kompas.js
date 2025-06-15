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

      // 1. Ambil dari headline/featured articles
      $('.headline .article__list .article__list__item').each((i, el) => {
        const title = $(el).find('h3 a').text().trim() || $(el).find('a').text().trim();
        const url = $(el).find('h3 a').attr('href') || $(el).find('a').attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        
        if (title && url) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // 2. Ambil dari section terbaru
      $('.latest .article__list .article__list__item').each((i, el) => {
        const title = $(el).find('h3 a').text().trim() || $(el).find('a').text().trim();
        const url = $(el).find('h3 a').attr('href') || $(el).find('a').attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        
        if (title && url) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // 3. Ambil dari most popular
      $('.most-popular .article__list .article__list__item').each((i, el) => {
        const title = $(el).find('h3 a').text().trim() || $(el).find('a').text().trim();
        const url = $(el).find('h3 a').attr('href') || $(el).find('a').attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        
        if (title && url) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // 4. Ambil dari semua link artikel (fallback)
      $('a[href*="/read/"]').each((i, el) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || 
                     $(el).siblings('img').attr('data-src') || $(el).siblings('img').attr('src') || '';
        
        if (title && url && title.length > 15) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // 5. Ambil dari div yang mengandung artikel
      $('div[class*="article"], div[class*="news"]').each((i, el) => {
        const title = $(el).find('a').first().text().trim();
        const url = $(el).find('a').first().attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        
        if (title && url && title.length > 10 && url.includes('/read/')) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // Function untuk fix URL
      function fixUrl(url) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return 'https://www.kompas.com' + url;
        return 'https://www.kompas.com/' + url;
      }

      // Hapus duplikat berdasarkan URL
      const uniqueArticles = articles.filter((article, index, self) =>
        index === self.findIndex(a => a.url === article.url)
      );

      // Filter artikel yang valid
      const validArticles = uniqueArticles.filter(article => 
        article.title.length > 10 && 
        article.url.includes('/read/') &&
        !article.title.toLowerCase().includes('kompas.com')
      );

      if (!validArticles.length) {
        return res.status(500).json({
          status: false,
          creator: "ZenzzXD",
          message: 'Gagal mengambil data: Tidak ada artikel ditemukan.'
        });
      }

      res.json({
        status: true,
        creator: "ZenzzXD",
        count: validArticles.length,
        result: validArticles.slice(0, 50) // Ambil maksimal 50 artikel
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
