const axios = require('axios');
const { URLSearchParams } = require('url'); // URLSearchParams sudah global, tapi bisa diimpor

/**
 * Fungsi inti untuk menghasilkan cerita dari aistorygenerator.co
 * @param {string} userPrompt - Prompt cerita dari pengguna.
 * @returns {Promise<string>} String cerita yang dihasilkan.
 */
async function generateAiStory(userPrompt) {
  const params = {
    question: userPrompt,
    model_provider: 'OpenAI',
    engine: 'gpt-4o-mini', // Pastikan engine ini valid/tersedia
    max_tokens: 2600,
    temperature: 1,
    top_p: 1,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
    stop: '',
    post_title: 'AI Story Generator', // Mungkin tidak terlalu berpengaruh
    id: 492, // ID ini mungkin spesifik
    source_stream: 'form',
    nonce: 'edb9335bee' // Nonce ini krusial, jika dinamis, scraper akan gagal
  };

  try {
    const apiUrl = 'https://aistorygenerator.co/index.php?wpaicg_stream=yes&' + new URLSearchParams(params).toString();
    
    const response = await axios.get(apiUrl, {
      headers: { 'referer': 'https://aistorygenerator.co/' },
      responseType: 'stream',
      timeout: 120000 // Timeout 2 menit untuk generasi cerita yang panjang
    });

    const parseJSON = (str) => { try { return JSON.parse(str); } catch { return {}; } };
    let story = '';
    let accumulatedErrorData = ''; // Untuk menangkap data error di dalam stream

    for await (const chunk of response.data) {
      const chunkString = chunk.toString();
      const lines = chunkString.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const clean = line.replace('data: ', '').trim();
          if (clean && clean !== '[DONE]') {
            const parsedData = parseJSON(clean);
            const content = parsedData.choices?.[0]?.delta?.content;
            if (content) {
              story += content;
            } else if (parsedData.error || parsedData.message) {
              // Jika stream mengirim objek error
              console.warn("AI Story Stream Error Data:", parsedData);
              accumulatedErrorData += (typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData)) + "\n";
            }
          }
        }
      }
    }
    
    if (!story && accumulatedErrorData) {
        throw new Error(`Stream API eksternal mengembalikan error: ${accumulatedErrorData.trim()}`);
    }
    if (!story && !accumulatedErrorData) {
        // Ini bisa terjadi jika stream selesai tanpa data atau [DONE]
        throw new Error("Gagal menghasilkan cerita atau respons kosong dari API eksternal.");
    }

    return story.trim(); // Kembalikan cerita sebagai string

  } catch (e) {
    // Menangani error dari axios (mis. timeout, koneksi, status non-2xx)
    let detailMessage = "Kesalahan tidak diketahui saat menghubungi AI Story Generator.";
    if (e.response) { // Error dengan respons dari server
      // Jika responsnya stream, perlu cara khusus untuk membacanya
      if (e.response.data && e.response.data.readable) {
        try {
          const errorStreamBuffer = [];
          for await (const chunk of e.response.data) {
            errorStreamBuffer.push(chunk);
          }
          detailMessage = Buffer.concat(errorStreamBuffer).toString();
        } catch (streamReadError) {
          detailMessage = "Gagal membaca stream error dari server eksternal.";
        }
      } else if (e.response.data) {
        detailMessage = typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data);
      }
    } else if (e.message) { // Error jaringan atau lainnya
      detailMessage = e.message;
    }
    
    console.error("AI Story Main Catch Error:", detailMessage, e.stack);
    throw new Error(detailMessage); // Lempar error untuk ditangani handler Express
  }
}

// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/ai/aistory', async (req, res) => {
    const { prompt } = req.query;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'prompt' wajib diisi."
      });
    }

    try {
      const storyResult = await generateAiStory(prompt);
      
      if (storyResult) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(storyResult); // Kirim cerita sebagai string biasa
      } else {
        // Seharusnya sudah ditangani oleh error di generateAiStory, tapi sebagai fallback
        throw new Error("Hasil cerita kosong meskipun tidak ada error terdeteksi.");
      }

    } catch (error) {
      console.error("AI Story Endpoint Error:", error.message, error.stack);
      res.status(500).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Gagal menghasilkan cerita AI.'
      });
    }
  });

  // Tambahkan rute lain di sini...
};
