const axios = require("axios");
const FormData = require("form-data");

const CREATOR = "ZenzzXD";

module.exports = function (app) {
  app.get("/ai/deepseekr1", async (req, res) => {
    const prompt = req.query.prompt;

    if (!prompt || prompt.trim() === "") {
      return res.status(400).json({
        status: false,
        creator: CREATOR,
        error: "Parameter 'prompt' wajib diisi",
      });
    }

    try {
      const data = await deepSeekThink.chat(prompt);
      res.status(200).json({
        status: true,
        creator: CREATOR,
        data: data,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: false,
        creator: CREATOR,
        error: "Internal Server Error",
      });
    }
  });
};

const deepSeekThink = {
  chat: async (question) => {
    const form = new FormData();
    form.append("content", `User: ${question}`);
    form.append("model", "@groq/deepseek-r1-distill-llama-70b");

    const headers = {
      ...form.getHeaders(),
    };

    const response = await axios.post("https://mind.hydrooo.web.id/v1/chat", form, { headers });
    const result = response.data.result.replace(/<think>\n\n<\/think>\n\n/g, "");
    return result;
  },
};
