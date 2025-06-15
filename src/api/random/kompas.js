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

      // Function untuk membersihkan text
      function cleanText(text) {
        return text
          .replace(/\s+/g, ' ')           // Ganti multiple whitespace jadi 1 spasi
          .replace(/\n+/g, ' ')          // Ganti newline jadi spasi
          .replace(/\t+/g, ' ')          // Ganti tab jadi spasi
          .trim()                        // Hapus spasi di awal/akhir
          .replace(/\s{2,}/g, ' ');      // Ganti multiple spasi jadi 1 spasi
      }

      // Function untuk fix URL
      function fixUrl(url) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        if (url.startsWith('/')) return 'https://www.kompas.com' + url;
        return 'https://www.kompas.com/' + url;
      }

      // 1. Ambil dari headline/featured articles
      $('.headline .article__list .article__list__item').each((i, el) => {
        const title = cleanText($(el).find('h3 a').text() || $(el).find('a').text());
        const url = $(el).find('h3 a').attr('href') || $(el).find('a').attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        
        if (title && url && title.length > 10) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // 2. Ambil dari section terbaru
      $('.latest .article__list .article__list__item').each((i, el) => {
        const title = cleanText($(el).find('h3 a').text() || $(el).find('a').text());
        const url = $(el).find('h3 a').attr('href') || $(el).find('a').attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        
        if (title && url && title.length > 10) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // 3. Ambil dari most popular
      $('.most-popular .article__list .article__list__item').each((i, el) => {
        const title = cleanText($(el).find('h3 a').text() || $(el).find('a').text());
        const url = $(el).find('h3 a').attr('href') || $(el).find('a').attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        
        if (title && url && title.length > 10) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // 4. Ambil dari semua link artikel (fallback)
      $('a[href*="/read/"]').each((i, el) => {
        const title = cleanText($(el).text());
        const url = $(el).attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || 
                     $(el).siblings('img').attr('data-src') || $(el).siblings('img').attr('src') || '';
        
        if (title && url && title.length > 15 && !title.includes('menit lalu') && !title.match(/^\d+$/)) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // 5. Ambil dari div yang mengandung artikel
      $('div[class*="article"], div[class*="news"]').each((i, el) => {
        const title = cleanText($(el).find('a').first().text());
        const url = $(el).find('a').first().attr('href');
        const thumb = $(el).find('img').attr('data-src') || $(el).find('img').attr('src') || '';
        
        if (title && url && title.length > 15 && url.includes('/read/') && !title.includes('menit lalu')) {
          articles.push({ title, url: fixUrl(url), thumbnail: fixUrl(thumb) });
        }
      });

      // Hapus duplikat berdasarkan URL
      const uniqueArticles = articles.filter((article, index, self) =>
        index === self.findIndex(a => a.url === article.url)
      );

      // Filter artikel yang valid dan bersih
      const validArticles = uniqueArticles.filter(article => 
        article.title.length > 15 && 
        article.title.length < 200 &&  // Batasi panjang title
        article.url.includes('/read/') &&
        !article.title.toLowerCase().includes('kompas.com') &&
        !article.title.includes('menit lalu') &&
        !article.title.match(/^\d+$/) &&  // Hapus title yang cuma angka
        !article.title.includes('HEALTH-') &&
        !article.title.includes('TRAVEL-') &&
        !article.title.includes('HYPE-') &&
        !article.title.includes('REGIONAL-') &&
        !article.title.includes('BOLA-') &&
        !article.title.includes('TREN-') &&
        !article.title.includes('MONEY-') &&
        !article.title.includes('NEWS-') &&
        !article.title.includes('FOOD-') &&
        !article.title.includes('TEKNO-')
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
        result: validArticles.slice(0, 30) // Ambil maksimal 30 artikel terbaik
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
