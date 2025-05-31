const axios = require("axios");

const CREATOR_NAME = "ZenzzXD";
const BASE_URL = "https://api.siputzx.my.id/api/s/pinterest?query=";

async function forwardPinterestSearch(query) {
  try {
    const { data } = await axios.get(BASE_URL + encodeURIComponent(query));
    return {
      status: true,
      creator: CREATOR_NAME,
      result: data.result || data,
    };
  } catch (err) {
    return {
      status: false,
      creator: CREATOR_NAME,
      message: "Gagal mengambil data dari API Pinterest",
      error: err.message,
    };
  }
}

module.exports = function (app) {
  app.get("/search/pinterest", async (req, res) => {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        status: false,
        creator: CREATOR_NAME,
        message: "Parameter 'q' wajib diisi",
      });
    }

    const result = await forwardPinterestSearch(q.trim());
    res.json(result);
  });
};
