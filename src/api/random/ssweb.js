const axios = require("axios");

async function getScreenshot(url) {
  const apiUrl = `https://api.screenshotmachine.com?key=44733b&url=${encodeURIComponent(url)}&dimension=1024x768`;
  try {
    const { data } = await axios.get(apiUrl, {
      responseType: "arraybuffer",
      headers: {
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
      },
      timeout: 10000,
    });
    return data;
  } catch (error) {
    throw new Error("Gagal mengambil screenshot");
  }
}

module.exports = function (app) {
  app.get("/tools/ssweb", async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'url' diperlukan",
      });
    }

    try {
      const buffer = await getScreenshot(url);
      res.setHeader("Content-Type", "image/png");
      res.send(buffer);
    } catch (error) {
      console.error("Screenshot error:", error.message);
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat mengambil screenshot",
        error: error.message,
      });
    }
  });
};
