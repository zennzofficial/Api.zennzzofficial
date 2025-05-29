const axios = require('axios');
const cheerio = require('cheerio');
const CryptoJS = require('crypto-js'); // Dependency baru
const { URLSearchParams } = require('url'); // Built-in di Node.js

const allInOneDownloader = {
  // Header User-Agent yang akan digunakan untuk semua request axios
  axiosHeaders: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7',
  },

  async getToken() {
    try {
      const response = await axios.get("https://allinonedownloader.com/", {
        headers: this.axiosHeaders,
        timeout: 15000
      });

      const html = response.data;
      const $ = cheerio.load(html);
      const token = $("#token").val();
      const sccPath = $("#scc").val(); // Path untuk POST request

      if (!token || !sccPath) {
        throw new Error("Gagal mendapatkan token atau path dari allinonedownloader.com.");
      }

      let cookieString = '';
      if (response.headers['set-cookie']) {
        cookieString = response.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
      }
      
      return { token, sccPath, cookie: cookieString };

    } catch (error) {
      console.error("Error getToken (allinonedownloader):", error.message);
      throw new Error(`Gagal mengambil token dari allinonedownloader: ${error.message}`);
    }
  },
  
  generateHash(url, token) {
    const key = CryptoJS.enc.Hex.parse(token);
    const iv = CryptoJS.enc.Hex.parse('afc4e290725a3bf0ac4d3ff826c43c10'); // IV statis dari kode Anda
    const encrypted = CryptoJS.AES.encrypt(url, key, {
      iv,
      mode: CryptoJS.mode.CBC, // Mode CBC sering digunakan dengan IV
      padding: CryptoJS.pad.Pkcs7 // Pkcs7 lebih umum daripada ZeroPadding untuk AES
    });
    return encrypted.toString(); // Base64 encoded ciphertext
  },
  
  async download(urlToDownload) {
    const conf = await this.getToken();
    const { token, sccPath, cookie } = conf;
    const hash = this.generateHash(urlToDownload, token);
    
    const postData = new URLSearchParams();
    postData.append('url', urlToDownload);
    postData.append('token', token);
    postData.append('urlhash', hash);
    
    try {
      const response = await axios.post(`https://allinonedownloader.com${sccPath}`, postData.toString(), {
        headers: {
          ...this.axiosHeaders, // Gunakan User-Agent yang sama
          "Accept": "application/json, text/javascript, */*; q=0.01", // Lebih spesifik untuk XHR
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Cookie": cookie, // Cookie yang didapat dari getToken
          "Origin": "https://allinonedownloader.com",
          "Referer": "https://allinonedownloader.com/",
          "X-Requested-With": "XMLHttpRequest"
          // Header Sec-Ch-* bisa dihilangkan karena seringkali tidak krusial dan bisa membuat request terlalu spesifik
        },
        timeout: 45000 // Timeout lebih lama untuk proses download
      });

      const jsonResponse = response.data; // axios otomatis parse jika content-type JSON

      if (jsonResponse.status === 'error' || jsonResponse.error || !jsonResponse.links) {
        throw new Error(jsonResponse.message || jsonResponse.error || "API allinonedownloader.com mengembalikan error atau format tidak dikenal.");
      }
      
      // Struktur data yang dikembalikan oleh API Anda
      return {
        input_url: urlToDownload,
        source: jsonResponse.source,
        title: jsonResponse.title,
        duration: jsonResponse.duration,
        thumbnail: jsonResponse.thumbnail,
        links: jsonResponse.links // Ini adalah array berisi berbagai format dan kualitas
      };
    } catch (error) {
      console.error("Error downloading (allinonedownloader):", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || error.message || "Gagal melakukan request download.";
      throw new Error(errorMessage);
    }
  }
};

// --- Rute Express ---
module.exports = function (app) {
  const creatorName = "ZenzzXD";

  app.get('/downloader/all', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Parameter url wajib diisi.'
      });
    }

    try {
      const result = await allInOneDownloader.download(url);
      res.json({
        status: true,
        creator: creatorName,
        result: result
      });
    } catch (error) {
      console.error("AllInOne Downloader API Endpoint Error:", error.message, error.stack);
      const statusCode = error.message.toLowerCase().includes("token") ? 409 : 500; // Conflict jika masalah token
      res.status(statusCode).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Gagal mengambil data download.'
      });
    }
  });

  // Tambahkan rute lain di sini...
};
