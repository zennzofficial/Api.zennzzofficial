const axios = require("axios");

module.exports = function (app) {
  app.get("/downloader/mediafire", async (req, res) => {
    const { url, forward } = req.query;

    if (!url || !forward) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' dan 'forward' wajib diisi!"
      });
    }

    try {
      const apiURL = `https://fastrestapis.fasturl.cloud/downup/mediafiredown?url=${encodeURIComponent(url)}`;
      const { data } = await axios.get(apiURL, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; Bot/1.0)",
          accept: "application/json"
        }
      });

      // Hapus creator dalam result jika ada
      if (data.result && data.result.creator) {
        delete data.result.creator;
      }

      // Ganti creator utama
      data.creator = "ZenzzXD";

      // Forward ke URL tujuan
      const forwarded = await axios.post(forward, data, {
        headers: { "Content-Type": "application/json" }
      });

      res.json({
        status: true,
        message: "Berhasil diteruskan ke API tujuan",
        response: forwarded.data
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Gagal melakukan forward",
        error: error.message
      });
    }
  });
};
