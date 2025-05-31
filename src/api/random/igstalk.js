const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const cheerio = require("cheerio");
const axios = require("axios"); // axios utama akan digunakan oleh wrapper

const CREATOR_NAME = "ZenzzXD";
const REQUEST_TIMEOUT = 25000; // Timeout default untuk request Axios (25 detik)

async function igStoryScraper(username) {
  const urlMain = `https://instasaved.net/id/save-stories/${username}`;
  const jar = new CookieJar(); // Cookie jar per request
  const client = wrapper(axios.create({ jar, timeout: REQUEST_TIMEOUT })); // Set timeout default untuk client ini

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36", // User agent yang lebih umum
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua": '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1"
  };

  try {
    console.log(`[IGStoryScraper] Mengunjungi halaman utama: ${urlMain} untuk username: ${username}`);
    await client.get(urlMain, { headers });

    const cookies = await jar.getCookies(urlMain);
    const xsrfRaw = cookies.find(x => x.key === "XSRF-TOKEN")?.value;
    const xsrfToken = xsrfRaw ? decodeURIComponent(xsrfRaw) : null;

    if (!xsrfToken) {
      console.error("[IGStoryScraper] Gagal mengambil XSRF-TOKEN.");
      throw new Error("Gagal mengambil token XSRF dari instasaved.net. Situs mungkin berubah atau memblokir.");
    }
    console.log(`[IGStoryScraper] XSRF-TOKEN ditemukan: ${xsrfToken ? '***' : 'null'}`);

    const headersPost = {
      ...headers, // Gunakan headers yang sudah ada
      "Content-Type": "application/json;charset=UTF-8",
      "x-xsrf-token": xsrfToken,
      "Referer": urlMain,
      "origin": "https://instasaved.net", // Tambahkan origin
      "X-Requested-With": "XMLHttpRequest", // Umumnya ada untuk request AJAX
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
    };

    const payloadSaver = { type: "story", username, origin_value: username };
    console.log(`[IGStoryScraper] Mengirim request ke /ajax/saver dengan payload:`, payloadSaver);
    const infoRes = await client.post(
      "https://instasaved.net/id/ajax/saver",
      payloadSaver,
      { headers: headersPost }
    );

    // console.log("[IGStoryScraper] Respons dari /ajax/saver:", infoRes.data); // Hati-hati log data besar

    const medias = infoRes.data?.medias;
    if (!medias || !medias.length) {
      console.warn(`[IGStoryScraper] Tidak ada media (stories) ditemukan untuk ${username}. Respons:`, infoRes.data);
      // Cek jika ada pesan error spesifik dari API
      if (infoRes.data?.message) {
        throw new Error(infoRes.data.message);
      }
      throw new Error(`Tidak ada story tersedia untuk ${username}. Mungkin akun private, tidak ada story, atau username salah.`);
    }
    console.log(`[IGStoryScraper] Ditemukan ${medias.length} media.`);

    const igUser = infoRes.data?.user || {};
    const payloadOutput = { medias, user: igUser };
    console.log(`[IGStoryScraper] Mengirim request ke /ajax/output/stories`);

    const outRes = await client.post(
      "https://instasaved.net/id/ajax/output/stories",
      payloadOutput,
      { headers: headersPost }
    );

    // console.log("[IGStoryScraper] Respons dari /ajax/output/stories (HTML):", outRes.data.substring(0, 500) + "..."); // Log sebagian HTML

    const $ = cheerio.load(outRes.data);
    const stories = [];
    $(".media-grid__item a.btn-download").each((_, el) => { // Selector lebih spesifik ke link download
      const downloadUrl = $(el).attr("href");
      // Coba deteksi tipe dari URL atau elemen sekitar jika ada (sulit tanpa melihat HTML lengkap)
      // Untuk sekarang, kita bisa asumsikan dari ekstensi jika ada, atau default
      let type = "image";
      if (downloadUrl) {
          if (downloadUrl.match(/\.(mp4|mov|avi|mkv)(\?|$)/i)) type = "video";
          else if (downloadUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) type = "image";
      }
      
      // Fallback jika elemen video ada (seperti di kode asli Anda)
      const videoParent = $(el).closest('.media-grid__item').find('video');
      if (videoParent.length) type = "video";

      if (downloadUrl) {
        stories.push({
          type: type,
          download_url: downloadUrl.startsWith('http') ? downloadUrl : `https://instasaved.net${downloadUrl}` // Pastikan URL absolut
        });
      }
    });
    console.log(`[IGStoryScraper] Ditemukan ${stories.length} link download story.`);
    if (stories.length === 0 && medias.length > 0) {
        console.warn("[IGStoryScraper] Media terdeteksi tapi tidak ada link download yang bisa diekstrak dari HTML.");
    }


    const userProfile = {
      username: igUser.username || username, // Fallback ke username input jika tidak ada
      profile_url: `https://www.instagram.com/${igUser.username || username}`,
      full_name: igUser.full_name || null,
      profile_pic_url: igUser.profile_pic_url || null, // Biasanya ada field ini
      bio: igUser.biography || null,
      is_verified: !!igUser.is_verified, // Konversi ke boolean
      is_private: !!igUser.is_private,
      is_business_account: !!igUser.is_business_account, // Nama field mungkin berbeda
      followers_count: igUser.follower_count || 0,
      following_count: igUser.following_count || 0,
      posts_count: igUser.media_count || 0,
      // Data lain dari igUser bisa ditambahkan jika ada dan relevan
    };

    return {
      status: true,
      creator: CREATOR_NAME,
      result: {
        user: userProfile,
        stories_count: stories.length,
        stories: stories
      }
    };

  } catch (err) {
    console.error("[IGStoryScraper] Terjadi kesalahan:", err.message);
    if (err.response) {
      console.error("[IGStoryScraper] Data error dari Axios:", err.response.data);
      console.error("[IGStoryScraper] Status error dari Axios:", err.response.status);
      console.error("[IGStoryScraper] Header error dari Axios:", err.response.headers);
    } else if (err.request) {
      console.error("[IGStoryScraper] Error request Axios (tidak ada respons):", err.request);
    } else {
      console.error("[IGStoryScraper] Error umum:", err);
    }
    
    let message = "Gagal melakukan scraping story dari instasaved.net.";
    if (typeof err === "string") {
      message = err;
    } else if (err.isAxiosError && err.response?.data?.message) {
      message = err.response.data.message; // Jika API upstream memberi pesan error
    } else if (err.isAxiosError && err.message.toLowerCase().includes('timeout')) {
      message = "Timeout saat menghubungi instasaved.net.";
    } else if (err.message) {
      message = err.message;
    }

    return {
      status: false,
      creator: CREATOR_NAME,
      message: message
    };
  }
}


module.exports = function (app) {
  app.get("/stalker/instagram", async (req, res) => {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'username' wajib diisi."
      });
    }

    console.log(`[API /stalker/instagram] Menerima permintaan untuk username: ${username}`);
    const result = await igStoryScraper(username.trim());
    
    // Tentukan status HTTP berdasarkan hasil scraper
    // Jika status dari scraper false, umumnya itu karena masalah dengan upstream atau data tidak ditemukan
    // 502 Bad Gateway cocok jika scraper gagal karena masalah upstream
    // 404 Not Found jika scraper mengindikasikan user/story tidak ada (perlu logika tambahan di scraper)
    // Untuk saat ini, kita gunakan 502 untuk semua kegagalan scraper
    const httpStatusCode = result.status ? 200 : 502; 

    res.status(httpStatusCode).json(result);
  });
};
