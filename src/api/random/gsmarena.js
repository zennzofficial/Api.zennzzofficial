const axios = require('axios');
const cheerio = require('cheerio');

// --- Fungsi Helper ---

/**
 * Mencari URL halaman GSMArena berdasarkan nama HP.
 * @param {string} phoneName - Nama HP yang dicari.
 * @returns {Promise<string|null>} URL GSMArena atau null jika tidak ditemukan.
 */
async function searchPhone(phoneName) {
  try {
    const searchUrl = `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(phoneName)}`;
    const { data } = await axios.get(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const phoneLink = $('.makers ul li a').first().attr('href');
    if (!phoneLink) {
        throw new Error(`HP "${phoneName}" tidak ditemukan.`);
    }
    return `https://www.gsmarena.com/${phoneLink}`;
  } catch (error) {
    console.error('Error searching phone:', error.message);
    // Melempar error agar bisa ditangkap oleh handler API
    throw new Error(error.message || 'Gagal mencari HP di GSMArena.');
  }
}

/**
 * Mengambil kurs mata uang (basis EUR).
 * @returns {Promise<object|null>} Objek kurs atau null jika gagal.
 */
async function getExchangeRates() {
  try {
    // Perhatian: API ini mungkin memerlukan kunci atau memiliki batasan.
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/EUR');
    return response.data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    return null; // Kembalikan null jika gagal, biarkan fungsi utama menangani.
  }
}

/**
 * Melakukan scraping spesifikasi lengkap dari URL GSMArena.
 * @param {string} url - URL halaman GSMArena HP.
 * @returns {Promise<object>} Objek berisi spesifikasi HP.
 */
async function scrapeAllSpecs(url) {
  try {
    const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const specs = {};

    $('div#specs-list table').each((_, table) => {
      const category = $(table).find('th').text().trim();
      const specDetails = {};
      $(table).find('tr').each((_, row) => {
        const key = $(row).find('td.ttl').text().replace(/\n/g, ' ').trim(); // Bersihkan key
        const value = $(row).find('td.nfo').text().replace(/\n/g, ' ').trim(); // Bersihkan value
        if (key && value) specDetails[key] = value;
      });
      if (category && Object.keys(specDetails).length) specs[category] = specDetails;
    });

    const phoneName = $('h1.specs-phone-name-title').text().trim();
    const imageUrl = $('.specs-photo-main img').attr('src') || 'N/A';
    const priceEurText = specs['Misc']?.['Price'] || 'N/A';
    let prices = { EUR: priceEurText };

    // Coba konversi harga jika ada harga EUR
    if (priceEurText !== 'N/A' && priceEurText.includes('EUR')) {
      const match = priceEurText.match(/[\d.,]+/); // Cari angka (termasuk . dan ,)
      if (match) {
        const eurValue = parseFloat(match[0].replace(',', '.')); // Pastikan format desimal .
        const rates = await getExchangeRates();
        if (rates && rates.USD && rates.IDR) {
          prices = {
            EUR: `${eurValue.toFixed(2)} EUR`,
            USD: `${(eurValue * rates.USD).toFixed(2)} USD`,
            IDR: `Rp ${(eurValue * rates.IDR).toLocaleString('id-ID')}` // Format IDR
          };
        }
      }
    }

    return { phoneName, imageUrl, prices, specs };
  } catch (error) {
    console.error('Error scraping data:', error.message);
    throw new Error('Gagal scrape data dari GSMArena.');
  }
}

// --- Rute Express ---

module.exports = function (app) {
  app.get('/search/gsmarena', async (req, res) => {
    const { phone } = req.query;
    const creatorName = "ZenzzXD";

    if (!phone) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'phone' wajib diisi."
      });
    }

    try {
      // 1. Cari URL HP
      const phoneUrl = await searchPhone(phone);

      // 2. Scrape data HP
      const resultData = await scrapeAllSpecs(phoneUrl);

      // 3. Kirim hasil sukses
      res.json({
        status: true,
        creator: creatorName,
        result: resultData
      });

    } catch (error) {
      // 4. Tangani semua error yang mungkin terjadi
      console.error("GSMArena API Error:", error.message);
      // Tentukan status code berdasarkan pesan error jika memungkinkan
      const statusCode = error.message.includes("tidak ditemukan") ? 404 : 500;
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan internal saat memproses permintaan.'
      });
    }
  });

  // Tambahkan rute lain di sini...

};
