const { CookieJar } = require("tough-cookie");
const { wrapper } = require("axios-cookiejar-support");
const cheerio = require("cheerio");
const axios = require("axios");

const CREATOR_NAME = "ZenzzXD";

async function igStoryScraper(username) {
  const urlMain = `https://instasaved.net/id/save-stories/${username}`;
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
  };

  try {
    await client.get(urlMain, { headers });

    const cookies = await jar.getCookies(urlMain);
    const xsrfRaw = cookies.find(x => x.key === "XSRF-TOKEN")?.value;
    const xsrfToken = xsrfRaw ? decodeURIComponent(xsrfRaw) : null;
    if (!xsrfToken) throw "Gagal mengambil token. Coba cek manual.";

    const headersPost = {
      ...headers,
      "Content-Type": "application/json;charset=UTF-8",
      "x-xsrf-token": xsrfToken,
      "Referer": urlMain
    };

    const infoRes = await client.post(
      "https://instasaved.net/id/ajax/saver",
      { type: "story", username, origin_value: username },
      { headers: headersPost }
    );

    const medias = infoRes.data?.medias;
    if (!medias?.length) throw "Tidak ada story tersedia. Mungkin akun private atau tidak ada story.";

    const igUser = infoRes.data?.user || {};

    const outRes = await client.post(
      "https://instasaved.net/id/ajax/output/stories",
      { medias, user: igUser },
      { headers: headersPost }
    );

    const $ = cheerio.load(outRes.data);
    const stories = [];
    $(".media-grid__item").each((_, el) => {
      const video = $(el).find("video");
      const a = $(el).find(".btn-download a");
      stories.push({
        type: video.length ? "video" : "image",
        download: a.attr("href") || null
      });
    });

    const user = {
      username: igUser.username || "",
      profile: `https://www.instagram.com/${igUser.username}`,
      full_name: igUser.full_name || "",
      bio: igUser.biography || "",
      is_verified: igUser.is_verified === 1 || igUser.is_verified === true,
      is_private: igUser.is_private === 1 || igUser.is_private === true,
      is_business: igUser.is_business === 1 || igUser.is_business === true,
      followers: igUser.follower_count || 0,
      following: igUser.following_count || 0,
      posts: igUser.media_count || 0,
      created_at: igUser.created_at || null,
      updated_at: igUser.updated_at || null
    };

    return {
      status: true,
      creator: CREATOR_NAME,
      result: { user, stories }
    };

  } catch (err) {
    return {
      status: false,
      creator: CREATOR_NAME,
      message: typeof err === "string" ? err : (err.response?.data || err.message || "Gagal scrape.")
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
    res.status(result.status ? 200 : 502).json(result);
  });
};
