
const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");

async function ffStalk(id) {
  const formdata = new FormData();
  formdata.append("uid", id);

  const { data } = await axios.post(
    "https://tools.freefireinfo.in/profileinfo.php?success=1",
    formdata,
    {
      headers: {
        ...formdata.getHeaders(),
        origin: "https://tools.freefireinfo.in",
        referer: "https://tools.freefireinfo.in/profileinfo.php?success=1",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
      }
    }
  );

  const $ = cheerio.load(data);
  const tr = $("div.result").html().split("<br>");
  const get = (i) => (tr[i] || "").split(": ")[1] || "";

  const equippedItems = [];
  $(".equipped-items")
    .find(".equipped-item")
    .each((_, e) => {
      const name = $(e).find("p").text().trim();
      const img = $(e).find("img").attr("src");
      equippedItems.push({ name, img });
    });

  return {
    name: get(0).replace("Name: ", ""),
    bio: get(14),
    like: get(2),
    level: get(3),
    exp: get(4),
    region: get(5),
    honorScore: get(6),
    brRank: get(7),
    brRankPoint: get(8),
    csRankPoint: get(9),
    accountCreated: get(10),
    lastLogin: get(11),
    preferMode: get(12),
    language: get(13),
    booyahPassPremium: get(16),
    booyahPassLevel: get(17),
    petInformation: {
      name: get(20) || "doesn't have pet.",
      level: get(21) || "doesn't have pet.",
      exp: get(22) || "doesn't have pet.",
      starMarked: get(23) || "doesn't have pet.",
      selected: get(24) || "doesn't have pet."
    },
    guild: {
      name: get(27) || "doesn't have guild",
      level: get(28) || "doesn't have guild",
      members: get(29) || "doesn't have guild",
      id: get(30) || "doesn't have guild"
    },
    equippedItems
  };
}

module.exports = function (app) {
  app.get("/stalker/freefire", async (req, res) => {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Parameter 'id' tidak boleh kosong"
      });
    }

    try {
      const data = await ffStalk(id);
      res.json({
        status: true,
        creator: "ZenzzXD",
        message: "Success",
        data
      });
    } catch (e) {
      res.status(500).json({
        status: false,
        creator: "ZenzzXD",
        message: "Gagal mengambil data",
        error: e.message
      });
    }
  });
};
