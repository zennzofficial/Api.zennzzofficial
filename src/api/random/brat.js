// File: bratApi.js (atau nama lain)

const { createCanvas, registerFont, loadImage } = require('canvas'); // loadImage mungkin diperlukan jika background adalah gambar
const Jimp = require('jimp');
const path = require('path'); // Untuk path font yang lebih robust
const axios = require('axios'); // Mungkin tidak diperlukan di file ini, tapi jaga-jaga untuk konsistensi

// --- REGISTRASI FONT ---
// Letakkan AppleColorEmoji.ttf di root proyek Anda atau sesuaikan path-nya.
// Ini akan dijalankan sekali saat modul di-load.
const fontFileName = 'AppleColorEmoji.ttf'; // Pastikan nama file ini benar
const projectRoot = process.cwd(); // Direktori kerja saat ini (root proyek di Vercel)
const fontPath = path.resolve(projectRoot, fontFileName);

try {
    registerFont(fontPath, { family: 'AppleFont' });
    console.log(`Font 'AppleFont' berhasil diregistrasi dari: ${fontPath}`);
} catch (fontError) {
    console.error(`GAGAL MEREGISTRASI FONT: Pastikan file '${fontFileName}' ada di root proyek Anda (${projectRoot}) dan Vercel memiliki akses. Error: ${fontError.message}`);
    // Anda mungkin ingin menghentikan aplikasi jika font penting
    // throw new Error(`Kritis: Gagal memuat font AppleColorEmoji. ${fontError.message}`);
}

// Fungsi colorize tetap sama
function colorize(ctx, width, colorsInput, height = 0) { // Tambah height untuk gradien vertikal jika perlu
    if (typeof colorsInput === 'string' && colorsInput.startsWith('http')) { // Jika URL gambar
      return null; // Akan ditangani oleh loadImage
    }
    if (colorsInput instanceof Array) {
        let gradient = ctx.createLinearGradient(0, 0, width, 0); // Gradien horizontal default
        // Bisa ditambahkan logika untuk tipe gradien lain (vertikal, radial) berdasarkan input
        let step = colorsInput.length > 1 ? 1 / (colorsInput.length - 1) : 1;
        colorsInput.forEach((color, index) => {
            gradient.addColorStop(Math.min(index * step, 1), color);
        });
        return gradient;
    } else {
        return colorsInput; // Warna solid
    }
}

async function makeBratImage(obj) {
    const width = 512;
    const height = 512;
    const margin = 20;
    const wordSpacingFactor = 0.15; // Persentase dari ukuran font untuk spasi antar kata

    // Buat canvas baru untuk setiap request di lingkungan Node.js
    const cvs = createCanvas(width, height);
    const ctx = cvs.getContext('2d');

    const textInput = typeof obj.text === 'string' ? obj.text : '';
    const textColor = obj.color || 'black'; // Warna default untuk semua teks
    const blurAmount = obj.blur === undefined ? 3 : parseInt(obj.blur);

    // Persiapan teks dan warna per kata (saat ini semua kata warna sama)
    const teks = textInput.trim();
    const words = teks.split(' ').filter(w => w !== ''); // Filter kata kosong
    const wordColors = words.map(() => textColor); // Semua kata mendapat warna yang sama

    // Set background
    ctx.fillStyle = 'white'; // Default background jika tidak ada atau gagal load
    if (obj.background) {
        if (typeof obj.background === 'string' && obj.background.startsWith('http')) {
            try {
                const image = await loadImage(obj.background);
                ctx.drawImage(image, 0, 0, width, height);
            } catch (imgError) {
                console.error("Gagal load background image:", imgError.message);
                ctx.fillRect(0, 0, width, height); // Fallback ke putih
            }
        } else {
            ctx.fillStyle = colorize(ctx, width, obj.background, height) || 'white';
            ctx.fillRect(0, 0, width, height);
        }
    } else {
      ctx.fillRect(0, 0, width, height); // Background putih default
    }


    let fontSize = 120; // Ukuran font awal yang lebih masuk akal
    const lineHeightMultiplier = 1.2; // Pengali tinggi baris

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.textDrawingMode = "glyph"; // Untuk rendering emoji yang lebih baik dengan font Apple

    let lines = [];

    const rebuildLines = () => {
        lines = [];
        let currentLineWords = [];
        ctx.font = `${fontSize}px AppleFont`; // Set font sebelum measureText

        for (const word of words) {
            if (ctx.measureText(word).width > width - 2 * margin) { // Satu kata terlalu panjang
                fontSize -= 2;
                if (fontSize < 10) { // Batas minimal font size
                    console.warn("Font size terlalu kecil, teks mungkin tidak muat.");
                    lines = words.map(w => w); // Tiap kata satu baris jika terlalu kecil
                    return; // Keluar jika font terlalu kecil
                }
                return rebuildLines(); // Rekursif dengan font lebih kecil
            }

            const currentLineText = currentLineWords.join(' ');
            const wordSpacing = fontSize * wordSpacingFactor * Math.max(0, currentLineWords.length -1);
            const testLine = currentLineWords.length > 0 ? `${currentLineText} ${word}` : word;
            const lineWidth = ctx.measureText(testLine).width + wordSpacing;


            if (lineWidth < width - 2 * margin) {
                currentLineWords.push(word);
            } else {
                if (currentLineWords.length > 0) lines.push(currentLineWords.join(' '));
                currentLineWords = [word];
            }
        }
        if (currentLineWords.length > 0) lines.push(currentLineWords.join(' '));
    };

    rebuildLines(); // Panggilan pertama

    // Sesuaikan font size jika tinggi teks melebihi canvas
    while (lines.length * fontSize * lineHeightMultiplier > height - 2 * margin && fontSize >= 10) {
        fontSize -= 2;
        if (fontSize < 10) {
             console.warn("Font size mencapai minimum, teks mungkin terpotong vertikal.");
             break;
        }
        rebuildLines();
    }
    
    const lineHeight = fontSize * lineHeightMultiplier;
    let y = margin + (height - 2 * margin - lines.length * lineHeight) / 2; // Tengahkan vertikal
    if (y < margin) y = margin; // Pastikan tidak keluar dari margin atas

    let wordIndex = 0;
    for (const line of lines) {
        const wordsInLine = line.split(' ');
        const totalTextWidthInLine = ctx.measureText(wordsInLine.join('')).width;
        const totalSpacingInLine = fontSize * wordSpacingFactor * Math.max(0, wordsInLine.length - 1);
        const totalLineWidth = totalTextWidthInLine + totalSpacingInLine;

        let x = margin + (width - 2 * margin - totalLineWidth) / 2; // Tengahkan horizontal
        if (x < margin) x = margin; // Pastikan tidak keluar dari margin kiri

        for (const word of wordsInLine) {
            ctx.fillStyle = colorize(ctx, ctx.measureText(word).width, wordColors[wordIndex]) || 'black';
            ctx.fillText(word, x, y);
            x += ctx.measureText(word).width + (fontSize * wordSpacingFactor);
            wordIndex++;
        }
        y += lineHeight;
    }

    // Proses blur dengan Jimp
    let imageBuffer = cvs.toBuffer('image/png');
    if (blurAmount > 0) {
        try {
            const image = await Jimp.read(imageBuffer);
            image.blur(blurAmount);
            imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
        } catch (jimpError) {
            console.error("Gagal melakukan blur dengan Jimp:", jimpError.message);
            // Lanjutkan tanpa blur jika Jimp gagal
        }
    }
    return imageBuffer;
}


// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/maker/brat', async (req, res) => {
    const { text, color, background } = req.query;
    let blur;
    if (req.query.blur !== undefined) {
        blur = parseInt(req.query.blur);
        if (isNaN(blur) || blur < 0) {
            return res.status(400).json({
                status: false,
                creator: creatorName,
                message: "Parameter 'blur' harus berupa angka positif."
            });
        }
    }


    if (!text) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'text' wajib diisi."
      });
    }

    try {
      let bgParam = background;
      // Coba parse background jika itu adalah array JSON (untuk gradien)
      if (background && background.startsWith('[') && background.endsWith(']')) {
          try {
              bgParam = JSON.parse(background);
          } catch (e) {
              // Biarkan sebagai string jika parse gagal, mungkin warna solid atau URL
              console.warn("Gagal parse background sebagai JSON array, akan dianggap string:", background);
          }
      }


      const imageBuffer = await makeBratImage({ 
        text, 
        color: color, // Akan default ke hitam jika undefined
        background: bgParam, // Bisa string warna, array warna (gradien), atau URL gambar
        blur: blur // Akan default ke 3 jika undefined
      });

      res.setHeader('Content-Type', 'image/png');
      res.send(imageBuffer);

    } catch (error) {
      console.error("Brat Maker API Endpoint Error:", error.message, error.stack);
      res.status(500).json({
        status: false,
        creator: creatorName,
        message: error.message || 'Gagal membuat gambar brat.'
      });
    }
  });
};
