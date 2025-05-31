const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const cheerio = require("cheerio");
const axios = require("axios");

const CREATOR_NAME = "ZenzzXD";
const REQUEST_TIMEOUT = 25000;

async function igStoryScraper(username) {
  const urlMain = `https://instasaved.net/id/save-stories/${username}`;
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar, timeout: REQUEST_TIMEOUT }));

  const headers = {
    "User-Agent": "Mozilla/5.0",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "upgrade-insecure-requests": "1"
  };

  try {
    await client.get(urlMain, { headers });
    const cookies = await jar.getCookies(urlMain);
    const xsrfRaw = cookies.find(x => x.key === "XSRF-TOKEN")?.value;
    const xsrfToken = xsrfRaw ? decodeURIComponent(xsrfRaw) : null;
    if (!xsrfToken) throw new Error("Gagal mengambil XSRF-TOKEN.");

    const headersPost = {
      ...headers,
      "Content-Type": "application/json;charset=UTF-8",
      "x-xsrf-token": xsrfToken,
      "Referer": urlMain,
      "origin": "https://instasaved.net",
      "X-Requested-With": "XMLHttpRequest"
    };

    const infoRes = await client.post("https://instasaved.net/id/ajax/saver", {
      type: "story",
      username,
      origin_value: username
    }, { headers: headersPost });

    const medias = infoRes.data?.medias;
    if (!medias?.length) throw new Error("Tidak ada story ditemukan. Mungkin akun private atau tidak ada story.");

    const igUser = infoRes.data?.user || {};
    const outRes = await client.post("https://instasaved.net/id/ajax/output/stories", {
      medias,
      user: igUser
    }, { headers: headersPost });

    const $ = cheerio.load(outRes.data);
    const stories = [];

    $(".media-grid__item a.btn-download").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const isVideo = href.match(/\.(mp4|mov|avi)/i);
      stories.push({
        type: isVideo ? "video" : "image",
        download_url: href.startsWith("http") ? href : `https://instasaved.net${href}`
      });
    });

    const user = {
      username: igUser.username || username,
      profile_url: `https://www.instagram.com/${igUser.username || username}`,
      full_name: igUser.full_name || "",
      bio: igUser.biography || "",
      is_verified: !!igUser.is_verified,
      is_private: !!igUser.is_private,
      followers_count: igUser.follower_count || 0,
      following_count: igUser.following_count || 0,
      posts_count: igUser.media_count || 0
    };

    return {
      status: true,
      creator: CREATOR_NAME,
      result: {
        user,
        stories_count: stories.length,
        stories
      }
    };

  } catch (err) {
    let message = "Gagal melakukan scraping.";
    if (typeof err === "string") {
      message = err;
    } else if (err?.response?.data?.message) {
      message = err.response.data.message;
    } else if (err?.message) {
      message = err.message;
    }

    return {
      status: false,
      creator: CREATOR_NAME,
      message
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

    const result = await igStoryScraper(username.trim());
    return res.status(result.status ? 200 : 502).json(result);
  });
};
