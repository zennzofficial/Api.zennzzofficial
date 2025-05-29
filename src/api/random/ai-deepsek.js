// File: deepseekApi.js
const fs = require('fs').promises; // Menggunakan fs.promises bawaan
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto'); // Untuk crypto.randomUUID()
const path = require('path'); // Untuk path WASM yang lebih robust

// Dinamik import untuk file-type jika Anda menggunakan versi ESM-only terbaru.
// Atau pastikan Anda menginstal versi yang mendukung CommonJS seperti "file-type": "^16.5.4"
// dan gunakan: const { fileTypeFromBuffer } = require('file-type');
let fileTypeFromBuffer;

class DeepSeekHash {
  constructor() {
    this.wasmInstance = null;
    this.offset = 0;
    this.cachedUint8Memory = null;
    this.cachedTextEncoder = new TextEncoder();
  }

  encodeString(text, allocate, reallocate = null) {
    if (!reallocate) {
      const encoded = this.cachedTextEncoder.encode(text);
      const ptr = allocate(encoded.length, 1) >>> 0;
      const memory = this.getCachedUint8Memory();
      memory.subarray(ptr, ptr + encoded.length).set(encoded);
      this.offset = encoded.length;
      return ptr;
    }
    const strLength = text.length;
    let ptr = allocate(strLength, 1) >>> 0;
    const memory = this.getCachedUint8Memory();
    let asciiLength = 0;
    for (; asciiLength < strLength; asciiLength++) {
      const charCode = text.charCodeAt(asciiLength);
      if (charCode > 127) break;
      memory[ptr + asciiLength] = charCode;
    }
    if (asciiLength !== strLength) {
      if (asciiLength > 0) text = text.slice(asciiLength);
      ptr = reallocate(ptr, strLength, asciiLength + text.length * 3, 1) >>> 0;
      const result = this.cachedTextEncoder.encodeInto(text, this.getCachedUint8Memory().subarray(ptr + asciiLength, ptr + asciiLength + text.length * 3));
      asciiLength += result.written;
      ptr = reallocate(ptr, asciiLength + text.length * 3, asciiLength, 1) >>> 0;
    }
    this.offset = asciiLength;
    return ptr;
  }

  getCachedUint8Memory() {
    if (this.cachedUint8Memory === null || this.cachedUint8Memory.byteLength === 0) {
      this.cachedUint8Memory = new Uint8Array(this.wasmInstance.memory.buffer);
    }
    return this.cachedUint8Memory;
  }

  calculateHash(algorithm, challenge, salt, difficulty, expireAt) {
    if (algorithm !== 'DeepSeekHashV1') {
      throw new Error('Unsupported algorithm: ' + algorithm);
    }
    const prefix = `${salt}_${expireAt}_`;
    try {
      const retptr = this.wasmInstance.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = this.encodeString(challenge, this.wasmInstance.__wbindgen_export_0, this.wasmInstance.__wbindgen_export_1);
      const len0 = this.offset;
      const ptr1 = this.encodeString(prefix, this.wasmInstance.__wbindgen_export_0, this.wasmInstance.__wbindgen_export_1);
      const len1 = this.offset;
      this.wasmInstance.wasm_solve(retptr, ptr0, len0, ptr1, len1, difficulty);
      const dataView = new DataView(this.wasmInstance.memory.buffer);
      const status = dataView.getInt32(retptr + 0, true);
      const value = dataView.getFloat64(retptr + 8, true);
      if (status === 0) return undefined; // Atau throw error
      return value;
    } finally {
      this.wasmInstance.__wbindgen_add_to_stack_pointer(16);
    }
  }

  async init(wasmPath) {
    try {
      if (!fileTypeFromBuffer) { // Lazy load file-type
          fileTypeFromBuffer = (await import('file-type')).fileTypeFromBuffer;
      }
      const imports = { wbg: {} }; // Objek impor dasar untuk WASM
      const wasmBuffer = await fs.readFile(wasmPath);
      const { instance } = await WebAssembly.instantiate(wasmBuffer, imports);
      this.wasmInstance = instance.exports;
      console.log("WASM Instance initialized for DeepSeekHash.");
      return this.wasmInstance;
    } catch (err) {
        console.error("Failed to initialize WASM for DeepSeekHash:", err);
        throw new Error(`Gagal memuat atau menginisialisasi file WASM: ${err.message}. Pastikan file WASM ada di path yang benar dan Node.js mendukung WebAssembly.`);
    }
  }
}

const deepseek = {
  // AMBIL DARI ENVIRONMENT VARIABLE! Jangan di-hardcode.
  authorization: process.env.DEEPSEEK_AUTH_TOKEN || "YOUR_FALLBACK_TOKEN_IF_ANY",
  path_wasm: path.resolve(process.cwd(), "./sha3_wasm_bg.wasm"), // Path relatif ke root proyek
  
  // Cache untuk instance DeepSeekHash yang sudah diinisialisasi
  _deepSeekHashInstance: null,
  async getHasher() {
      if (!this._deepSeekHashInstance) {
          const hasher = new DeepSeekHash();
          await hasher.init(this.path_wasm);
          this._deepSeekHashInstance = hasher;
      }
      return this._deepSeekHashInstance;
  },

  commonHeaders: function() {
      if (!this.authorization || this.authorization === "____" || this.authorization === "YOUR_FALLBACK_TOKEN_IF_ANY") {
          throw new Error("Token otorisasi DeepSeek belum diatur. Set DEEPSEEK_AUTH_TOKEN di environment variable.");
      }
      return {
        'User-Agent': 'DeepSeek/1.2.1 Android/31', // Atau User-Agent browser umum
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip', // Axios akan handle dekompresi
        'Content-Type': 'application/json',
        'x-client-platform': 'android',
        'x-client-version': '1.2.1',
        'x-client-locale': 'en_US',
        'x-rangers-id': '7865329968002107661', // Ini mungkin perlu dinamis
        'authorization': `Bearer ${this.authorization}`,
        'accept-charset': 'UTF-8'
      };
  },

  async createNewChat() {
     const response = await axios.post("https://chat.deepseek.com/api/v0/chat_session/create", 
       { agent: "chat" }, 
       { headers: this.commonHeaders(), timeout: 10000 }
     );
     const id = response.data?.data?.biz_data?.id;
     if (!id) throw new Error("Gagal membuat sesi chat baru DeepSeek.");
     return id;
  },
  
  async generateSignature(targetPath) {
     const challengeResponse = await axios.post("https://chat.deepseek.com/api/v0/chat/create_pow_challenge", 
       { target_path: targetPath }, 
       { headers: this.commonHeaders(), timeout: 10000 }
     );
     
     const challengeData = challengeResponse.data?.data?.biz_data?.challenge;
     if (!challengeData) throw new Error("Gagal mendapatkan POW challenge dari DeepSeek.");
     
     const { algorithm, challenge, salt, difficulty, expire_at, signature } = challengeData;
     
     const deepSeekHasher = await this.getHasher(); // Dapatkan instance yang sudah/baru diinisialisasi
     const answer = deepSeekHasher.calculateHash(algorithm, challenge, salt, difficulty, expire_at);
     
     if (answer === undefined) throw new Error("Gagal menghitung jawaban POW.");

     const powResult = { algorithm, challenge, salt, answer, signature, target_path: targetPath };
     return Buffer.from(JSON.stringify(powResult)).toString('base64');
  },
  
  async chatCompletions({ prompt, chat_session_id, parent_message_id = null, ref_file_urls = [], thinking_enabled = false, search_enabled = false }) {
     let ref_file_ids = [];
     if (ref_file_urls && ref_file_urls.length > 0) {
        for (const item of ref_file_urls) {
          const file_id = await this.uploadFile(item); // Menggunakan this
          if (file_id) ref_file_ids.push(file_id);
        }
     }
     
     const signature = await this.generateSignature("/api/v0/chat/completion"); // Menggunakan this
     
     const response = await axios.post("https://chat.deepseek.com/api/v0/chat/completion", {
        chat_session_id,
        parent_message_id,
        prompt,
        ref_file_ids,
        thinking_enabled,
        search_enabled,
        legacy_format: true
     }, {
        headers: {
           ...this.commonHeaders(),
           'x-ds-pow-response': signature,
        },
        timeout: 120000 // Timeout 2 menit untuk chat
     });

     // Deepseek completion biasanya adalah stream, tapi kode asli Anda mengembalikan string yang diparsing.
     // Jika response.data adalah string berisi event, parseEventStream akan bekerja.
     // Jika axios mengembalikan stream, perlu penanganan berbeda.
     // Untuk sekarang, asumsikan response.data adalah string yang bisa diparsing.
     return this.parseEventStream(response.data); // Menggunakan this
  },
  
  async uploadFile(url) {
     if (!fileTypeFromBuffer) { // Pastikan sudah di-load
        fileTypeFromBuffer = (await import('file-type')).fileTypeFromBuffer;
     }
     const fileResponse = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
     
     const buffer = Buffer.from(fileResponse.data);
     const fileTypeResult = await fileTypeFromBuffer(buffer);
     const ext = fileTypeResult ? fileTypeResult.ext : 'bin';
     const mimetype = fileTypeResult ? fileTypeResult.mime : fileResponse.headers['content-type'] || 'application/octet-stream';

     const allowedMimeTypes = ["application/json", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
     if (!(mimetype.startsWith("image/") || mimetype.startsWith("text/") || allowedMimeTypes.includes(mimetype))) {
         throw new Error(`Tipe file ${mimetype} tidak didukung untuk diupload ke DeepSeek.`);
     }
     
     let data = new FormData();
     data.append('file', buffer, `${crypto.randomUUID()}.${ext}`);
     
     const signature = await this.generateSignature("/api/v0/file/upload_file"); // Menggunakan this
     
     const uploadRes = await axios.post("https://chat.deepseek.com/api/v0/file/upload_file", data, {
        headers: {
           ...this.commonHeaders(),
           'x-ds-pow-response': signature,
           ...data.getHeaders() // Penting untuk FormData
        },
        timeout: 30000 // Timeout untuk upload
     });
     
     const file_id = uploadRes.data?.data?.biz_data?.id;
     if (!file_id) throw new Error("Gagal mendapatkan file ID setelah upload.");

     let attempts = 0;
     while (attempts < 12) { // Coba cek selama 1 menit (12 x 5 detik)
        const checkRes = await axios.get(`https://chat.deepseek.com/api/v0/file/fetch_files?file_ids=${file_id}`, {
          headers: this.commonHeaders(),
          timeout: 5000
        });
        
        console.info(`DEEPSEEK CHECKING FILE (${attempts+1}/12) WITH ID: ${file_id}`);
        const fileStatus = checkRes.data?.data?.biz_data?.files?.[0]?.status;

        if (fileStatus === "SUCCESS") return file_id;
        if (fileStatus === "FAILED" || fileStatus === "REJECTED") throw new Error(`DeepSeek gagal memproses file yang diupload (status: ${fileStatus}).`);
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
     }
     throw new Error(`Timeout menunggu file ${file_id} diproses oleh DeepSeek.`);
  },
  
  parseEventStream(dataString) { // dataString adalah seluruh string dari event stream
     const lines = dataString.split('\n');
     let responseText = ''; // diganti dari response menjadi responseText
     let thinking = '';
     let search_queries = [];
     let search_results = [];
     let search_indexes = [];
     let message_id = -1;
     let parent_id = -1;
     
     for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('data:')) {
            const jsonStr = line.substring(5).trim();
            try {
                if (jsonStr && jsonStr !== '{}' && jsonStr !== '[DONE]') { // Tambah cek [DONE]
                    const doc = JSON.parse(jsonStr);
                    if (doc?.choices?.[0]?.delta?.type === "text" && doc?.choices?.[0]?.delta?.content) responseText += doc.choices[0].delta.content;
                    if (doc?.choices?.[0]?.delta?.type === "thinking" && doc?.choices?.[0]?.delta?.content) thinking += doc.choices[0].delta.content;
                    if (doc?.choices?.[0]?.delta?.type === "search_query" && doc?.choices?.[0]?.delta?.search_queries) search_queries = doc.choices[0].delta.search_queries;
                    if (doc?.choices?.[0]?.delta?.type === "search_result" && doc?.choices?.[0]?.delta?.search_results) search_results = doc.choices[0].delta.search_results;
                    if (doc?.choices?.[0]?.delta?.type === "search_index" && doc?.choices?.[0]?.delta?.search_indexes) search_indexes = doc.choices[0].delta.search_indexes;
                    if (doc.message_id) message_id = doc.message_id;
                    if (doc.parent_id) parent_id = doc.parent_id;
                    if (doc?.v && typeof doc.v === 'string' && doc?.p === "response/content") responseText += doc.v;
                    else if (doc?.v && typeof doc.v === 'string' && !doc?.p) responseText += doc.v;
                    if (doc?.v?.response?.message_id) message_id = doc.v.response.message_id;
                    if (doc?.v?.response?.parent_id) parent_id = doc.v.response.parent_id;
                }
            } catch (e) {
                console.warn("Gagal parse baris event stream DeepSeek:", jsonStr, e.message);
            }
        }
     }
     return { message: responseText, thoughts: thinking, search_queries, search_results, search_indexes, message_id, parent_id };
  }
};

// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  // Inisialisasi WASM sekali saat aplikasi dimulai jika memungkinkan,
  // atau setidaknya cache instance DeepSeekHash setelah inisialisasi pertama.
  // Untuk Vercel, setiap invocations bisa jadi cold start, jadi caching instance mungkin
  // hanya efektif dalam satu invocations yang sama jika generateSignature dipanggil berkali-kali.
  // Kode di atas sudah mencoba cache di `deepseek.getHasher()`.

  app.post('/ai/deepseek', async (req, res) => {
    const { 
        prompt, 
        chat_session_id, 
        parent_message_id, 
        ref_file_urls,
        thinking_enabled,
        search_enabled 
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'prompt' wajib diisi dalam body request."
      });
    }
    
    if (!deepseek.authorization || deepseek.authorization === "____" || deepseek.authorization === "YOUR_FALLBACK_TOKEN_IF_ANY") {
         return res.status(500).json({
            status: false,
            creator: creatorName,
            message: "Server Error: Token otorisasi DeepSeek belum dikonfigurasi. Hubungi administrator."
        });
    }

    try {
      let current_chat_session_id = chat_session_id;
      if (!current_chat_session_id) {
        console.log("Membuat sesi chat baru DeepSeek...");
        current_chat_session_id = await deepseek.createNewChat();
      }

      console.log(`Mengirim prompt ke DeepSeek (sesi: ${current_chat_session_id}): "${prompt.substring(0, 50)}..."`);
      const result = await deepseek.chatCompletions({
        prompt,
        chat_session_id: current_chat_session_id,
        parent_message_id,
        ref_file_urls,
        thinking_enabled,
        search_enabled
      });

      res.json({
        status: true,
        creator: creatorName,
        chat_session_id: current_chat_session_id, // Kembalikan sesi ID untuk chat lanjutan
        result: result
      });

    } catch (error) {
      console.error("DeepSeek API Endpoint Error:", error.message, error.stack);
      res.status(500).json({ // Default ke 500, bisa disesuaikan jika ada error spesifik
        status: false,
        creator: creatorName,
        message: error.message || 'Gagal mendapatkan respons dari DeepSeek AI.'
      });
    }
  });
};
