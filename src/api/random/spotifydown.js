const axios = require("axios");

async function spotifydl(url) {
  try {
    // Request pertama untuk dapatkan gid dan id
    const kemii = await axios.get(
      `https://api.fabdl.com/spotify/get?url=${encodeURIComponent(url)}`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "sec-ch-ua": '"Not)A;Brand";v="24", "Chromium";v="116"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          Referer: "https://spotifydownload.org/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      }
    );

    if (!kemii.data || !kemii.data.result) {
      throw new Error("Data dari API tidak ditemukan.");
    }

    // Request kedua untuk dapatkan link download
    const kemi = await axios.get(
      `https://api.fabdl.com/spotify/mp3-convert-task/${kemii.data.result.gid}/${kemii.data.result.id}`,
      {
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "sec-ch-ua": '"Not)A;Brand";v="24", "Chromium";v="116"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          Referer: "https://spotifydownload.org/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      }
    );

    if (!kemi.data || !kemi.data.result) {
      throw new Error("Data konversi tidak ditemukan.");
    }

    return {
      success: true,
      title: kemii.data.result.name || "Unknown Title",
      type: kemii.data.result.type || "Unknown Type",
      artist: kemii.data.result.artists || "Unknown Artist",
      duration: kemii.data.result.duration_ms || 0,
      image: kemii.data.result.image || null,
      download: "https://api.fabdl.com" + (kemi.data.result.download_url || ""),
    };
  } catch (error) {
    throw new Error("Gagal mengambil data dari link Spotify: " + error.message);
  }
}

module.exports = function (app) {
  app.get("/downloader/spotify", async (req, res) => {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({
        status: false,
        creator: "ZenzzXD",
        error: "Parameter 'url' wajib diisi.",
      });
    }

    try {
      const data = await spotifydl(url);
      res.json({
        status: true,
        creator: "ZenzzXD",
        data,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        error: error.message || "Internal Server Error",
      });
    }
  });
};
