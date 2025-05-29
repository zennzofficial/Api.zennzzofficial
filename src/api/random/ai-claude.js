// File: claudeOneApi.js
const axios = require('axios');
const { JSDOM } = require('jsdom'); // Dependency: npm install jsdom
const FormData = require('form-data'); // Dependency: npm install form-data

const CLAUDEAI_ONE_BASE_URL = 'https://claudeai.one';

const commonHeaders = {
    // User-Agent umum, bisa disesuaikan jika claudeai.one sensitif
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Accept': '*/*', // Lebih baik disesuaikan jika tahu tipe respons yang diharapkan
    'Accept-Language': 'en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7',
    'Origin': CLAUDEAI_ONE_BASE_URL,
    'Referer': `${CLAUDEAI_ONE_BASE_URL}/`
};

/**
 * Fungsi inti untuk mendapatkan respons dari ClaudeAI.one
 * @param {string} userPrompt - Prompt dari pengguna.
 * @returns {Promise<string>} Respons teks dari Claude AI.
 */
async function fetchClaudeOneResponse(userPrompt) {
  try {
    // 1. Ambil halaman awal untuk token
    console.log(`ClaudeAI.one: Mengambil halaman awal dari ${CLAUDEAI_ONE_BASE_URL}/`);
    const initialPageResponse = await axios.get(`${CLAUDEAI_ONE_BASE_URL}/`, {
      headers: commonHeaders,
      timeout: 20000 // Timeout 20 detik
    });
    const html = initialPageResponse.data;
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const nonce = doc.querySelector('[data-nonce]')?.getAttribute('data-nonce');
    const postId = doc.querySelector('[data-post-id]')?.getAttribute('data-post-id');
    const botId = doc.querySelector('[data-bot-id]')?.getAttribute('data-bot-id');

    if (!nonce || !postId || !botId) {
      console.error("ClaudeAI.one: Gagal mengekstrak nonce, postId, atau botId.", { nonce, postId, botId });
      throw new Error('Gagal mengekstrak token penting dari claudeai.one. Situs mungkin berubah.');
    }

    let wpaicg_chat_client_id = '';
    const localStorageMatch = html.match(/localStorage\.setItem\(['"]wpaicg_chat_client_id['"],\s*['"](.+?)['"]\)/);
    if (localStorageMatch && localStorageMatch[1]) {
      wpaicg_chat_client_id = localStorageMatch[1];
    } else {
      console.warn("ClaudeAI.one: wpaicg_chat_client_id tidak ditemukan dari regex, membuat ID acak.");
      wpaicg_chat_client_id = 'JHFiony-' + Math.random().toString(36).substring(2, 12);
    }
    console.log("ClaudeAI.one: Token berhasil diekstrak:", { nonce, postId, botId, wpaicg_chat_client_id });

    // 2. Kirim POST request dengan token dan prompt
    const form = new FormData();
    form.append('_wpnonce', nonce);
    form.append('post_id', postId);
    form.append('url', `${CLAUDEAI_ONE_BASE_URL}/`); // URL halaman asal
    form.append('action', 'wpaicg_chat_shortcode_message');
    form.append('message', userPrompt); // Menggunakan prompt dari pengguna
    form.append('bot_id', botId);
    form.append('chatbot_identity', 'shortcode');
    form.append('wpaicg_chat_history', '[]'); // Riwayat chat kosong untuk permintaan baru
    form.append('wpaicg_chat_client_id', wpaicg_chat_client_id);

    console.log(`ClaudeAI.one: Mengirim prompt "${userPrompt.substring(0,30)}..." ke admin-ajax.php`);
    const ajaxResponse = await axios.post(
      `${CLAUDEAI_ONE_BASE_URL}/wp-admin/admin-ajax.php`,
      form,
      { 
        headers: { 
          ...commonHeaders, // Termasuk User-Agent, Origin, Referer
          ...form.getHeaders() // Header spesifik untuk FormData (Content-Type, boundary)
        },
        timeout: 90000 // Timeout 90 detik untuk respons AI
      }
    );

    const responseData = ajaxResponse.data;

    // Sesuai catatan: "ambil yg bagian data aj, itu respon utama"
    if (responseData && responseData.success === true && typeof responseData.data === 'string') {
      return responseData.data.trim(); // Kembalikan string respons AI
    } else if (responseData && responseData.success === false) {
      throw new Error(responseData.data?.message || responseData.data || 'ClaudeAI.one mengembalikan error.');
    } else {
      console.warn("ClaudeAI.one: Struktur respons tidak terduga atau field 'data' bukan string.", responseData);
      throw new Error('Respons dari ClaudeAI.one tidak memiliki format string yang diharapkan di field "data".');
    }

  } catch (error) {
    console.error("ClaudeAI.one Scraper Error:", error.response?.data || error.message, error.stack);
    let errorMessage = 'Gagal berinteraksi dengan ClaudeAI.one.';
    if (axios.isAxiosError(error)) {
        errorMessage = `Kesalahan jaringan saat menghubungi ClaudeAI.one: ${error.message}`;
        if (error.response?.data) {
            const errData = error.response.data;
            errorMessage = (typeof errData === 'string' ? errData.substring(0, 250) : 
                           (errData.message || errData.error)) || errorMessage;
        }
    } else {
        errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
}

// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/ai/claudeone', async (req, res) => {
    const { prompt } = req.query;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'prompt' wajib diisi."
      });
    }

    try {
      const claudeResponseText = await fetchClaudeOneResponse(prompt);
      
      // Kirim sebagai text/plain sesuai permintaan
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(claudeResponseText);

    } catch (error) {
      console.error("ClaudeAI.one Endpoint Error:", error.message, error.stack);
      // Jika error sudah berupa string, gunakan itu. Jika objek, ambil message.
      const message = typeof error.message === 'string' ? error.message : 'Gagal mendapatkan respons dari ClaudeAI.one.';
      res.status(500).json({ // Error selalu JSON
        status: false,
        creator: creatorName,
        message: message
      });
    }
  });

  // Tambahkan rute lain di sini...
};
