const axios = require("axios");

const CREATOR_NAME = "ZenzzXD";
const BASE_URL = "https://api.siputzx.my.id/api/s/pinterest?query=";

async function forwardPinterestSearch(query) {
  try {
    const { data } = await axios.get(BASE_URL + encodeURIComponent(query));
    let resultData = data.result || data;

    // Jika resultData punya properti data yang merupakan array, maka langsung assign array itu ke result
    if (typeof resultData === "object" && resultData !== null && Array.isArray(resultData.data)) {
      resultData = resultData.data;
    }

    // Jika ada properti status dalam resultData (yang sekarang sudah array, kemungkinan tidak), hapus
    if (typeof resultData === "object" && resultData !== null && "status" in resultData) {
      delete resultData.status;
    }

    return {
      status: true,
      creator: CREATOR_NAME,
      result: resultData,
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
