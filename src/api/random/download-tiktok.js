const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");

async function tiktokV1(query) {
  const encodedParams = new URLSearchParams();
  encodedParams.set("url", query);
  encodedParams.set("hd", "1");

  const response = await axios({
    method: "POST",
    url: "https://tikwm.com/api/",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: "current_language=en",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
    },
    data: encodedParams,
  });

  return response.data;
}

async function tiktokV2(query) {
  const form = new FormData();
  form.append("q", query);

  const response = await axios({
    method: "POST",
    url: "https://savetik.co/api/ajaxSearch",
    headers: {
      ...form.getHeaders(),
      "Accept": "*/*",
      "Origin": "https://savetik.co",
      "Referer": "https://savetik.co/en2",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
    },
    data: form,
  });

  const rawHtml = response.data.data;
  const $ = cheerio.load(rawHtml);
  const title = $(".thumbnail .content h3").text().trim();
  const thumbnail = $(".thumbnail .image-tik img").attr("src");
  const video_url = $("video#vid").attr("data-src");

  const download = {};
  $(".dl-action p a").each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    const href = $(el).attr("href");
    if (text.includes("download mp4 hd")) {
      download.mp4_hd = href;
    } else if (text.includes("download mp4")) {
      if (!text.includes("hd")) download.mp4 = href;
    } else if (text.includes("download mp3")) {
      download.mp3 = href;
    } else if (text.includes("download tiktok profile")) {
      download.profile = href;
    }
  });

  const slide_images = [];
  $(".photo-list .download-box li").each((_, el) => {
    const imgSrc = $(el).find(".download-items__thumb img").attr("src");
    const downloadLink = $(el).find(".download-items__btn a").attr("href");
    if (imgSrc && downloadLink) {
      slide_images.push({ image: imgSrc, download: downloadLink });
    }
  });

  return {
    title,
    thumbnail,
    video_url,
    download,
    slide_images,
  };
}

module.exports = function (app) {
  app.get('/downloader/tiktok', async (req, res) => {
    const { url, ver } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter url tidak boleh kosong'
      });
    }

    try {
      let result;
      if (ver === "2") {
        result = await tiktokV2(url);
      } else {
        result = await tiktokV1(url); // default ke versi 1
      }

      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        version: ver === "2" ? "v2" : "v1",
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: `Gagal mengambil data dari TikTok (versi ${ver === "2" ? "2" : "1"})`,
        error: err?.message || String(err)
      });
    }
  });
};
