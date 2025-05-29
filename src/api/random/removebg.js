const axios = require('axios');
const FormData = require('form-data'); // Pastikan sudah diinstal: npm install form-data
const { Buffer } = require('buffer'); // Buffer sudah global, tapi bisa eksplisit jika perlu

// Objek removalAi dengan semua logikanya
const removalAi = {
  api: {
    base: 'https://removal.ai',
    remove: 'https://api.removal.ai',
    endpoint: {
      webtoken: '/wp-admin/admin-ajax.php',
      remove: '/3.0/remove',
      slug: '/upload/'
    }
  },
  headers: { 'user-agent': 'Postify/1.0.0' }, // User-agent sederhana

  isUrl: async (link) => {
    if (!link || !link.match(/^https?:\/\/.+\/.+$/)) {
      return { valid: false, code: 400, error: "Link imagenya mana? Input kagak boleh kosong yak bree.." };
    }
    try {
      const response = await axios.get(link, { responseType: 'arraybuffer', timeout: 10000 });
      const contentType = response.headers['content-type'];
      if (!contentType?.startsWith('image/')) {
        return { valid: false, code: 400, error: "Njirr, bukan link image ini mah 😂" };
      }
      const buffer = Buffer.from(response.data);
      if (buffer.length > 5 * 1024 * 1024) {
        return { valid: false, code: 400, error: "File imagenya kegedean bree, max 5mb yak.. 🙃" };
      }
      return {
        valid: true,
        buffer,
        fileName: link.split('/').pop().split('#')[0].split('?')[0] || 'image.jpg', // Default filename
        type: contentType
      };
    } catch (err) {
      return { valid: false, code: err.response?.status || 400, error: "Linknya kagak ada gambarnya bree.. atau error pas download." };
    }
  },

  getSecurity: async () => {
    try {
      const response = await axios.get(`${removalAi.api.base}${removalAi.api.endpoint.slug}`, { timeout: 10000 });
      const sc = response.data.match(/ajax_upload_object = (.*?);/);
      if (!sc || !sc[1]) { // Periksa sc[1] juga
        return { valid: false, code: 500, error: "Security tokennya kagak ada di responsenya bree 🙈 (regex fail)" };
      }
      return { valid: true, security: JSON.parse(sc[1]).security };
    } catch (err) {
      return { valid: false, code: err.response?.status || 500, error: "Waduhh endpoint securitynya kagak ada bree 🤔 (request fail)" };
    }
  },

  getWebToken: async (security) => {
    if (!security) {
      return { valid: false, code: 400, error: "Securitynya mana?? Kagak ada inputnya nih 🙃" };
    }
    try {
      const response = await axios.get(`${removalAi.api.base}${removalAi.api.endpoint.webtoken}`, {
        params: { action: 'ajax_get_webtoken', security },
        headers: {
          ...removalAi.headers,
          'Referer': `${removalAi.api.base}${removalAi.api.endpoint.slug}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 10000
      });
      if (!response.data.success) {
        return { valid: false, code: 400, error: response.data.data?.message || "Servernya nolak buat diakses bree 🙈 (webtoken fail)" };
      }
      return { valid: true, webtoken: response.data.data.webtoken };
    } catch (err) {
      return { valid: false, code: err.response?.status || 500, error: "Endpoint Webtokennya kagak ada bree 🙈 (request fail)" };
    }
  },

  remove: async (link) => {
    const img = await removalAi.isUrl(link);
    if (!img.valid) return { success: false, code: img.code, result: { error: img.error } };

    const res = await removalAi.getSecurity();
    if (!res.valid) return { success: false, code: res.code, result: { error: res.error } };

    const toket = await removalAi.getWebToken(res.security);
    if (!toket.valid) return { success: false, code: toket.code, result: { error: toket.error } };

    try {
      const formData = new FormData();
      formData.append('image_file', img.buffer, {
        filename: img.fileName,
        contentType: img.type
      });

      const response = await axios.post(`${removalAi.api.remove}${removalAi.api.endpoint.remove}`, formData, {
        headers: {
          ...removalAi.headers,
          'authority': 'api.removal.ai',
          'origin': removalAi.api.base,
          'web-token': toket.webtoken,
          ...formData.getHeaders() // Penting untuk FormData
        },
        responseType: 'arraybuffer', // Jika hasilnya adalah gambar langsung
        timeout: 30000 // Beri waktu lebih untuk proses remove BG
      });
      
      // Cek content-type, jika image, langsung kirim buffer
      // Jika JSON, proses seperti biasa
      const contentType = response.headers['content-type'];
      if (contentType && contentType.startsWith('image/')) {
        return {
            success: true,
            code: 200,
            isImage: true, // Flag bahwa ini adalah data gambar
            buffer: Buffer.from(response.data), // Kirim buffer
            contentType: contentType
        };
      }

      // Jika bukan gambar, coba parse sebagai JSON
      // Perlu di-decode dulu jika responseType 'arraybuffer' tapi isinya JSON
      let responseData;
      try {
          responseData = JSON.parse(Buffer.from(response.data).toString('utf8'));
      } catch (e) {
          throw new Error("Gagal parse respons JSON dari removal.ai setelah remove BG.");
      }

      const { status, ...resx } = responseData; // Asumsi ada status di JSON
      return { success: true, code: 200, isImage: false, result: resx };

    } catch (err) {
      console.error("Removal.ai POST Error:", err.response?.data ? Buffer.from(err.response.data).toString() : err.message);
      let errorMessage = "Server Removal AInya gagal memproses remove bgnya 🥴";
      if (err.response?.data) {
          try {
              const errorData = JSON.parse(Buffer.from(err.response.data).toString('utf8'));
              errorMessage = errorData.message || errorData.error || errorMessage;
          } catch (e) {
              // Biarkan pesan default
          }
      } else if (err.message) {
          errorMessage = err.message;
      }
      return { success: false, code: err.response?.status || 500, result: { error: errorMessage } };
    }
  }
};

// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/tools/removebg', async (req, res) => {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: 'Parameter url (link gambar) wajib diisi.'
      });
    }

    try {
      const response = await removalAi.remove(url);

      if (response.success) {
        if (response.isImage && response.buffer) {
            res.setHeader('Content-Type', response.contentType);
            return res.send(response.buffer); // Kirim gambar langsung
        }
        // Jika bukan gambar, kirim JSON seperti biasa
        res.status(response.code || 200).json({
          status: true,
          creator: creatorName,
          result: response.result
        });
      } else {
        res.status(response.code || 500).json({
          status: false,
          creator: creatorName,
          message: response.result?.error || 'Terjadi kesalahan tidak diketahui.'
        });
      }
    } catch (error) {
      // Catchall untuk error tak terduga di luar logika removalAi.remove
      console.error("RemoveBG API Endpoint Error:", error.message, error.stack);
      res.status(500).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Terjadi kesalahan internal pada server.'
      });
    }
  });

  // Tambahkan rute lain di sini...
};
