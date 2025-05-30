// File: bolaApi.js

const axios = require('axios');
const cheerio = require('cheerio');

const LAPANGBOLA_BASEURL = "https://live.lapangbola.com";
const creatorName = "ZenzzXD"; // Tetap ZenzzXD

/**
 * Fungsi untuk mencari klub bola dari lapangbola.com
 * @author ZenzzXD
 * @param {string} q - Kata kunci pencarian klub.
 * @returns {Promise<Array<object>>} Array berisi objek klub yang ditemukan.
 */
async function searchClub(q) {
  const searchUrl = `${LAPANGBOLA_BASEURL}/teams?q=${encodeURIComponent(q)}`;
  console.log(`BolaAPI: Mencari klub dengan query "${q}" di ${searchUrl}`);
  try {
    const { data } = await axios.get(searchUrl, {
      headers: { // Menambahkan User-Agent standar untuk menghindari blokir sederhana
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 15000 // Timeout 15 detik
    });
    const $ = cheerio.load(data);
    const result = [];

    // Menggunakan selector yang lebih spesifik untuk panel tim, mirip versi awal yang lebih robust
    $('.panel.panel-default.panel-teams').each((i, panel) => {
        const linkElement = $(panel).find('a[href*="/teams/"]');
        const relativeUrl = linkElement.attr('href');
        const name = $(panel).find('.panel-body h5.text-center').text().trim();
        let logo = $(panel).find('.panel-body .avatar.avatar-lg img').attr('src');
        // Mencoba alternatif selector logo jika yang di atas tidak ditemukan
        if (!logo) {
            logo = $(panel).find('.panel-body .avatar img').attr('src');
        }
        const stadion = $(panel).find('.panel-body p.text-center.text-muted.small').text().trim();

        if (name && relativeUrl) {
            result.push({
              name: name,
              logo: logo ? (logo.startsWith('http') ? logo : LAPANGBOLA_BASEURL + logo) : null,
              stadion: stadion || null, // Beri null jika stadion kosong
              url: relativeUrl ? LAPANGBOLA_BASEURL + relativeUrl : null
            });
        }
    });
    
    if (result.length === 0 && !$('body').text().match(/tidak ditemukan|no teams found/i)) {
        // Jika tidak ada hasil tapi juga tidak ada pesan "tidak ditemukan" dari situs,
        // bisa jadi selectornya yang salah atau struktur halaman berubah.
        console.warn(`BolaAPI: Tidak ada klub ditemukan untuk query "${q}", namun tidak ada pesan 'tidak ditemukan' dari situs. Periksa selector.`);
    } else {
        console.log(`BolaAPI: Ditemukan ${result.length} klub untuk query "${q}"`);
    }
    return result;
  } catch (error) {
    console.error(`BolaAPI Error in searchClub (query: ${q}):`, error.message);
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new Error("Timeout saat mencari klub di lapangbola.com.");
    }
    // Cek apakah error karena situsnya tidak bisa dijangkau atau masalah parsing
    if (error.response && error.response.status) {
        throw new Error(`Gagal mencari klub di lapangbola.com. Status: ${error.response.status}`);
    }
    throw new Error("Gagal mencari klub di lapangbola.com. Situs mungkin tidak dapat dijangkau atau format HTML berubah.");
  }
}

/**
 * Fungsi untuk mengambil detail klub dari lapangbola.com
 * @author ZenzzXD
 * @param {string} clubUrl - URL lengkap klub.
 * @returns {Promise<object>} Objek berisi informasi detail klub.
 */
async function infoClub(clubUrl) {
  if (!clubUrl || !clubUrl.startsWith(LAPANGBOLA_BASEURL)) {
    throw new Error(`URL klub tidak valid. Harus dimulai dengan ${LAPANGBOLA_BASEURL}`);
  }
  console.log(`BolaAPI: Mengambil info untuk klub dari ${clubUrl}`);
  try {
    const { data } = await axios.get(clubUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 20000 // Timeout 20 detik
    });
    const $ = cheerio.load(data);

    // Cek jika halaman tidak ditemukan (404) atau error dari situs
    if ($('title').text().match(/404|Not Found/i) || $('.page-error-404').length || $('.alert-danger:contains("tidak ditemukan")').length) {
        throw new Error("Halaman klub tidak ditemukan di lapangbola.com (404).");
    }

    const matchHistory = [];
    // Pastikan selector #match-history dan tr di dalamnya valid
    $('#match-history').find('tbody > tr, tr').each((i, e) => { // Mencoba tbody > tr atau langsung tr
      const dateText = $(e).find('td').eq(0).find('.color-primary, span').first().text().trim();
      const teamNames = $(e).find('td').eq(1).find('.team-short-name');
      const scoreText = $(e).find('td').eq(2).find('a > .label, .label').first().text().trim();
      const tournamentText = $(e).find('td').eq(3).find('a').text().trim() || $(e).find('td').eq(3).text().trim();
      
      if (dateText && teamNames.length === 2 && scoreText) { // Validasi dasar
        matchHistory.push({
          date: dateText,
          versus: `${teamNames.first().text().trim()} vs ${teamNames.last().text().trim()}`,
          score: scoreText,
          tournament: tournamentText || "N/A"
        });
      }
    });

    const players = [];
    // Pastikan selector #players-list dan tr di dalamnya valid
    $('#players-list').find('tbody > tr, tr').each((i, e) => { // Mencoba tbody > tr atau langsung tr
      const nameText = $(e).find('td').eq(0).find('.color-primary, a').text().trim();
      const numberText = $(e).find('td').eq(1).text().trim();
      const positionText = $(e).find('td').eq(2).text().trim(); // Kolom ke-3 untuk posisi

      if (nameText) { // Minimal nama pemain ada
        players.push({
          name: nameText,
          number: numberText || "N/A",
          position: positionText || "N/A",
        });
      }
    });
    
    let clubLogo = $('.profile-user .avatar img').attr('src');
    if (clubLogo && !clubLogo.startsWith('http')) {
        clubLogo = LAPANGBOLA_BASEURL + clubLogo;
    }

    const clubDetails = {
      name: $('.profile-header-title h1').text().trim(),
      logo: clubLogo,
      stadion: $('.profile-header-title p').text().trim() || "N/A",
      summary: {
        play: $('.widget-four .col-xl-3, .widget-four .col-md-3').eq(0).find('p.widget-four-num, p').last().text().trim() || "0",
        win: $('.widget-four .col-xl-3, .widget-four .col-md-3').eq(1).find('p.widget-four-num, p').last().text().trim() || "0",
        draw: $('.widget-four .col-xl-3, .widget-four .col-md-3').eq(2).find('p.widget-four-num, p').last().text().trim() || "0",
        lose: $('.widget-four .col-xl-3, .widget-four .col-md-3').eq(3).find('p.widget-four-num, p').last().text().trim() || "0",
      },
      players,
      matchHistory
    };

    if (!clubDetails.name) {
        console.warn(`BolaAPI: Info klub tidak lengkap dari ${clubUrl}. Nama klub tidak ditemukan. Mungkin struktur halaman berubah atau klub tidak valid.`);
        throw new Error("Gagal parsing detail klub dari lapangbola.com. Nama klub tidak ditemukan.");
    }
    console.log(`BolaAPI: Info klub "${clubDetails.name}" berhasil diambil.`);
    return clubDetails;

  } catch (error) {
    console.error(`BolaAPI Error in infoClub (url: ${clubUrl}):`, error.message);
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new Error("Timeout saat mengambil info klub dari lapangbola.com.");
    }
    if (error.message.includes("Halaman klub tidak ditemukan") || error.message.includes("Nama klub tidak ditemukan")) {
        throw error; // Re-throw error spesifik ini
    }
    if (error.response && error.response.status) {
        throw new Error(`Gagal mengambil informasi klub dari lapangbola.com. Status: ${error.response.status}`);
    }
    throw new Error("Gagal mengambil informasi klub dari lapangbola.com. Situs mungkin tidak dapat dijangkau atau format HTML berubah.");
  }
}


// -- Endpoint Express --
module.exports = (app) => {
  app.get('/bola/search', async (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Parameter "q" (query pencarian) wajib diisi.'
      });
    }

    try {
      const resultData = await searchClub(q);
      if (resultData.length === 0) {
        return res.status(200).json({ // Sukses tapi tidak ada hasil
          status: true, 
          creator: creatorName,
          message: `Tidak ada klub yang ditemukan untuk query "${q}".`,
          result: []
        });
      }
      res.status(200).json({
        status: true,
        creator: creatorName,
        message: `Pencarian klub untuk query "${q}" berhasil.`,
        result: resultData
      });
    } catch (error) {
      console.error("BolaAPI Endpoint /bola/search Error:", error.message);
      let statusCode = 500;
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes("timeout")) {
        statusCode = 504; // Gateway Timeout
      } else if (errMsg.includes("gagal mencari klub") || errMsg.includes("tidak dapat dijangkau") || (error.response && error.response.status >= 500)) {
        statusCode = 503; // Service Unavailable
      } else if (error.response && error.response.status === 404) {
        statusCode = 404; 
      }
      
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan pada server saat mencari klub.'
      });
    }
  });

  app.get('/bola/info', async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Parameter "url" (URL klub) wajib diisi.'
      });
    }
    
    if (!url.startsWith(LAPANGBOLA_BASEURL)) {
        return res.status(400).json({
            status: false,
            creator: creatorName,
            message: `URL tidak valid. Harap masukkan URL dari ${LAPANGBOLA_BASEURL}`
        });
    }

    try {
      const resultData = await infoClub(url);
      res.status(200).json({
        status: true,
        creator: creatorName,
        message: `Informasi untuk klub "${resultData.name || 'Tanpa Nama'}" berhasil diambil.`,
        result: resultData
      });
    } catch (error) {
      console.error("BolaAPI Endpoint /bola/info Error:", error.message);
      let statusCode = 500;
      const errMsg = error.message.toLowerCase();

      if (errMsg.includes("url klub tidak valid")) {
          statusCode = 400;
      } else if (errMsg.includes("halaman klub tidak ditemukan") || errMsg.includes("nama klub tidak ditemukan")) {
          statusCode = 404; // Not Found
      } else if (errMsg.includes("timeout")) {
          statusCode = 504; // Gateway Timeout
      } else if (errMsg.includes("gagal mengambil informasi klub") || errMsg.includes("tidak dapat dijangkau") || (error.response && error.response.status >= 500)) {
          statusCode = 503; // Service Unavailable
      }
      
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan pada server saat mengambil informasi klub.'
      });
    }
  });
};
