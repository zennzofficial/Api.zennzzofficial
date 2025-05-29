// File: blackboxApi.js
const axios = require('axios');

/**
 * Fungsi inti untuk berinteraksi dengan Blackbox AI.
 * @param {string} userQuery - Pertanyaan dari pengguna.
 * @returns {Promise<object>} Objek berisi respons dan sumber.
 */
async function fetchBlackboxResponse(userQuery) {
  try {
    // Payload yang dikirim ke Blackbox AI
    // PERHATIAN: ID dan 'validated' token mungkin perlu dinamis!
    const payload = {
      messages: [{ role: 'user', content: userQuery, id: '0quFtyH' }], // userQuery digunakan di sini
      id: 'KB5EUHk', // Ini bisa jadi dinamis
      previewToken: null,
      userId: null,
      codeModelMode: true,
      trendingAgentMode: {},
      isMicMode: false,
      userSystemPrompt: null,
      maxTokens: 1024,
      playgroundTopP: null,
      playgroundTemperature: null,
      isChromeExt: false,
      githubToken: '',
      clickedAnswer2: false,
      clickedAnswer3: false,
      clickedForceWebSearch: false,
      visitFromDelta: false,
      isMemoryEnabled: false,
      mobileClient: false,
      userSelectedModel: null,
      validated: '00f37b34-a166-4efb-bce5-1312d87f2f94', // Ini SANGAT MUNGKIN dinamis
      imageGenerationMode: false,
      webSearchModePrompt: false,
      deepSearchMode: false,
      domains: null,
      vscodeClient: false,
      codeInterpreterMode: false,
      customProfile: { name: '', occupation: '', traits: [], additionalInfo: '', enableNewChats: false },
      webSearchModeOption: { autoMode: true, webMode: false, offlineMode: false },
      session: null,
      isPremium: false,
      subscriptionCache: null,
      beastMode: false,
      reasoningMode: false,
      designerMode: false,
      workspaceId: '',
      asyncMode: false,
      isTaskPersistent: false
    };

    const headers = {
      'Accept': '*/*',
      'Accept-Language': 'id-ID,id;q=0.9', // Bahasa bisa disesuaikan
      'Content-Type': 'application/json',
      'Origin': 'https://www.blackbox.ai',
      'Referer': 'https://www.blackbox.ai/',
      'Sec-Ch-Ua': '"Chromium";v="137", "Not/A)Brand";v="24"', // Bisa perlu update jika Chrome versi berubah
      'Sec-Ch-Ua-Mobile': '?1',
      'Sec-Ch-Ua-Platform': '"Android"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
      // Perhatikan: Blackbox AI mungkin juga menggunakan cookies atau header otentikasi lain yang tidak ada di sini.
    };

    const postRes = await axios.post('https://www.blackbox.ai/api/chat', payload, {
      headers,
      timeout: 45000 // Timeout 45 detik
    });

    const rawResponseData = postRes.data;

    if (typeof rawResponseData !== 'string') {
      console.warn("Blackbox AI respons bukan string:", rawResponseData);
      // Cek jika ada pesan error dari Blackbox dalam format JSON
      if (rawResponseData && (rawResponseData.message || rawResponseData.error)) {
        throw new Error(rawResponseData.message || rawResponseData.error || "Respons API Blackbox tidak terduga (bukan string).");
      }
      throw new Error("Respons API Blackbox tidak berupa string seperti yang diharapkan.");
    }

    const parsed = rawResponseData.split('$~~~$');

    if (parsed.length === 1) { // Hanya respons teks
      return {
        response: parsed[0].trim(),
        sources: [] // Selalu sertakan 'sources' agar konsisten
      };
    } else if (parsed.length >= 2) { // Respons teks dan sumber (asumsi sumber di parsed[1])
      const resultText = parsed.length >= 3 ? parsed[2].trim() : parsed[0].trim(); // Ambil teks dari posisi yang benar
      let resultSources = [];
      try {
        // Sumber biasanya ada di bagian kedua jika ada lebih dari satu bagian
        if(parsed[1] && parsed[1].trim() !== "") {
          resultSources = JSON.parse(parsed[1]);
        }
      } catch (jsonParseError) {
        console.warn("Gagal parse sources dari Blackbox AI:", parsed[1], jsonParseError.message);
        // Lanjutkan tanpa sources jika parsing gagal
      }
      
      return {
        response: resultText,
        sources: Array.isArray(resultSources) ? resultSources.map(s => ({
          link: s.link,
          title: s.title,
          snippet: s.snippet,
          position: s.position
        })) : []
      };
    } else {
      console.warn("Format respons Blackbox AI tidak dikenali setelah split:", rawResponseData);
      throw new Error("Format respons Blackbox AI tidak dikenali setelah di-split.");
    }
  } catch (err) {
    console.error("Blackbox AI Scraper Error:", err.response?.data || err.message);
    let errorMessage = "Terjadi kesalahan saat menghubungi Blackbox AI.";
    if (err.response?.data) {
      const errData = err.response.data;
      // Jika errData adalah string (misalnya HTML error), gunakan itu. Jika objek, coba ambil message.
      errorMessage = typeof errData === 'string' ? errData : (errData.message || errorMessage);
    } else if (err.message) {
      errorMessage = err.message;
    }
    throw new Error(errorMessage);
  }
}

// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/ai/blackbox', async (req, res) => {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'query' wajib diisi."
      });
    }

    try {
      const result = await fetchBlackboxResponse(query);
      res.json({
        status: true,
        creator: creatorName,
        result: result
      });
    } catch (error) {
      console.error("Blackbox AI Endpoint Error:", error.message, error.stack);
      // Anda bisa menambahkan logika untuk status code yang berbeda berdasarkan error.message
      res.status(500).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Gagal mendapatkan respons dari Blackbox AI.'
      });
    }
  });

  // Tambahkan rute lain di sini...
};
