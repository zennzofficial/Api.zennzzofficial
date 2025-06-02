const express = require("express");
const axios = require("axios");
const app = express();

app.get("/downloader/mediafire", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' tidak boleh kosong"
    });
  }

  try {
    const targetUrl = `https://fastrestapis.fasturl.cloud/downup/mediafiredown?url=${encodeURIComponent(url)}`;
    const { data } = await axios.get(targetUrl);

    if (!data || !data.result) {
      throw new Error("Gagal mengambil data dari API pihak ketiga");
    }

    // Hapus creator di dalam result kalau ada
    if (data.result.creator) delete data.result.creator;

    // Susun respons sesuai urutan yang diminta
    res.json({
      creator: "ZenzzXD",
      status: data.status,
      content: data.content,
      result: data.result
    });
  } catch (err) {
    res.status(500).json({
      creator: "ZenzzXD",
      status: false,
      message: "Terjadi kesalahan saat memproses permintaan",
      error: err.message
    });
  }
});

module.exports = app;
