const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const gpt = {
  getNonce: async () => {
    try {
      const { data } = await axios.get("https://chatgpt4o.one/", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1"
        }
      });

      const $ = cheerio.load(data);
      return $("div.wpaicg-chat-shortcode").attr("data-nonce") || null;
    } catch (error) {
      console.error("Error fetching nonce:", error.message);
      return null;
    }
  },

  chat: async (msg) => {
    try {
      const nonce = await gpt.getNonce();
      if (!nonce) throw new Error("Failed to get nonce.");

      const clientId = generateRandomString(10);
      const formData = new FormData();
      formData.append("_wpnonce", nonce);
      formData.append("post_id", 11);
      formData.append("url", "https://chatgpt4o.one/");
      formData.append("action", "wpaicg_chat_shortcode_message");
      formData.append("message", msg);
      formData.append("bot_id", 0);
      formData.append("chatbot_identity", "shortcode");
      formData.append("wpaicg_chat_history", JSON.stringify([]));
      formData.append("wpaicg_chat_client_id", clientId);

      const { data } = await axios.post(
        "https://chatgpt4o.one/wp-admin/admin-ajax.php",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Origin": "https://chatgpt4o.one",
            "Referer": "https://chatgpt4o.one/",
            "X-Requested-With": "XMLHttpRequest",
            "Connection": "keep-alive"
          }
        }
      );

      return data;
    } catch (error) {
      console.error("Error sending message:", error.message);
      return null;
    }
  }
};

async function forwardGPTChat(prompt) {
  try {
    const result = await gpt.chat(prompt);
    if (!result || !result.status) {
      return {
        status: false,
        message: "Gagal mendapatkan response dari GPT",
      };
    }
    return {
      status: true,
      result,
    };
  } catch (e) {
    return {
      status: false,
      message: "Terjadi kesalahan saat mengambil data",
      error: e.message,
    };
  }
}

module.exports = function (app) {
  app.get("/ai/gpt4o", async (req, res) => {
    const { prompt } = req.query;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({
        status: false,
        creator: "ZenzXD",
        message: "Parameter 'prompt' wajib diisi",
      });
    }

    const result = await forwardGPTChat(prompt);

    res.json({
      creator: "ZenzXD",
      ...result,
    });
  });
};
