const axios = require('axios');
const cheerio = require('cheerio');
// URLSearchParams sudah built-in di Node.js modern, tidak perlu require khusus.

// Fungsi untuk mengambil halaman awal, token CSRF, dan cookies
async function fetchInitialPage(initialUrl) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.60 Mobile Safari/537.36',
      'Referer': initialUrl, // Bisa juga di-set ke halaman utama on4t.com jika initialUrl adalah sub-halaman
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7'
    };

    const response = await axios.get(initialUrl, { headers, timeout: 15000 });
    const $ = cheerio.load(response.data);
    const csrfToken = $('meta[name="csrf-token"]').attr('content');

    if (!csrfToken) {
      throw new Error('Gagal menemukan token CSRF.');
    }

    let cookies = '';
    if (response.headers['set-cookie']) {
      // Menggabungkan array cookies menjadi satu string header
      cookies = response.headers['set-cookie'].map(cookie => cookie.split(';')[0]).join('; ');
    }
    return { csrfToken, cookies };
  } catch (error) {
    console.error('Error fetching initial page (on4t):', error.message);
    throw new Error(`Gagal mengambil halaman awal on4t: ${error.message}`);
  }
}

// Fungsi untuk mengirim POST request download
async function postDownloadRequest(downloadPostUrl, userUrlToDownload, csrfToken, cookies) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.60 Mobile Safari/537.36',
      'Referer': 'https://on4t.com/online-video-downloader', // Halaman asal POST request
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': '*/*', // Seringkali application/json atau */*
      'X-Requested-With': 'XMLHttpRequest',
      'Origin': 'https://on4t.com',
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const postData = new URLSearchParams();
    postData.append('_token', csrfToken);
    postData.append('link[]', userUrlToDownload); // 'link[]' sesuai kode asli

    const response = await axios.post(downloadPostUrl, postData.toString(), { headers, timeout: 25000 });

    if (response.data && response.data.result && Array.isArray(response.data.result)) {
      // Ambil hanya data yang relevan
      return response.data.result.map(item => ({
        title: item.title,
        thumbnail: item.image || item.videoimg_file_url, // Pilih salah satu atau gabungkan
        download_url: item.video_file_url,
        // Anda bisa menambahkan field lain jika ada dan relevan
      }));
    } else if (response.data && response.data.status === 'error') {
        throw new Error(response.data.message || 'API on4t mengembalikan error.');
    }
    else {
      throw new Error('Respons dari server on4t tidak sesuai format yang diharapkan.');
    }
  } catch (error) {
    console.error('Error posting download request (on4t):', error.response?.data || error.message);
    throw new Error(`Gagal melakukan permintaan download ke on4t: ${error.response?.data?.message || error.message}`);
  }
}

// Fungsi utama yang mengorkestrasi
async function getVideoDownloadLinksFromOn4t(urlToDownload) {
  const initialUrl = 'https://on4t.com/online-video-downloader';
  const downloadPostUrl = 'https://on4t.com/all-video-download';

  if (!urlToDownload) {
    throw new Error('Parameter URL video wajib diisi.');
  }

  try {
    const { csrfToken, cookies } = await fetchInitialPage(initialUrl);
    const videoData = await postDownloadRequest(downloadPostUrl, urlToDownload, csrfToken, cookies);
    return videoData;
  } catch (error) {
    // Error sudah di-log di fungsi sebelumnya, di sini kita lempar lagi untuk handler API
    throw error; // Melempar error asli agar pesan lebih akurat
  }
}


// --- Rute Express ---
module.exports = (app) => {
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
      const result = await getVideoDownloadLinksFromOn4t(url);
      res.json({
        status: true,
        creator: creatorName,
        result: result
      });
    } catch (error) {
      console.error("AllInOne Downloader Error:", error.message, error.stack);
      // Jika error sudah berupa objek dengan message, gunakan itu.
      // Jika tidak, gunakan pesan default.
      const message = typeof error.message === 'string' ? error.message : 'Gagal mengambil data download.';
      res.status(500).json({
        status: false,
        creator: creatorName,
        message: message
      });
    }
  });

  // Tambahkan rute lain di sini...
};
