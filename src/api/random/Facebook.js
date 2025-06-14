const axios = require("axios");

async function fetchFacebookVideo(url) {
  try {
    const { data } = await axios.get(
      `https://tooly.chative.io/facebook/video?url=${encodeURIComponent(url)}`
    );

    if (!data || !data.success) {
      return {
        status: false,
        message: data?.error || "Gagal mengambil data dari Facebook",
      };
    }

    return {
      status: true,
      title: data.title,
      videos: data.videos,
    };
  } catch (e) {
    return {
      status: false,
      message: "Terjadi kesalahan saat mengakses API pihak ketiga",
      error: e.message,
    };
  }
}

module.exports = function (app) {
  app.get("/downloader/facebook", async (req, res) => {
    const { url } = req.query;

    if (!url || typeof url !== "string" || url.trim() === "") {
      return res.status(400).json({
        status: false,
        creator: "ZenzXD",
        message: "Parameter 'url' wajib diisi",
      });
    }

    const result = await fetchFacebookVideo(url);

    res.json({
      creator: "ZenzXD",
      ...result,
    });
  });
};
