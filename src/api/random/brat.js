const { createCanvas, registerFont, loadImage } = require('canvas');
const Jimp = require('jimp');
const path = require('path');

// --- REGISTRASI FONT ---
const fontFileName = 'AppleColorEmoji.ttf';
const projectRoot = process.cwd();
const fontPath = path.resolve(projectRoot, fontFileName);

try {
    registerFont(fontPath, { family: 'AppleFont' });
    console.log(`Font 'AppleFont' berhasil diregistrasi dari: ${fontPath}`);
} catch (fontError) {
    console.error(`GAGAL MEREGISTRASI FONT: Pastikan file '${fontFileName}' ada di root proyek Anda (${projectRoot}) dan Vercel memiliki akses. Error: ${fontError.message}`);
}

// Fungsi colorize tetap sama (meskipun untuk background hanya akan dipakai jika ada parameter eksplisit nantinya)
function colorize(ctx, width, colorsInput, height = 0) {
    if (typeof colorsInput === 'string' && colorsInput.startsWith('http')) {
      return null;
    }
    if (colorsInput instanceof Array) {
        let gradient = ctx.createLinearGradient(0, 0, width, 0);
        let step = colorsInput.length > 1 ? 1 / (colorsInput.length - 1) : 1;
        colorsInput.forEach((color, index) => {
            gradient.addColorStop(Math.min(index * step, 1), color);
        });
        return gradient;
    } else {
        return colorsInput;
    }
}

async function makeBratImage(obj) {
    const width = 512;
    const height = 512;
    const margin = 20;
    const wordSpacingFactor = 0.15;

    const cvs = createCanvas(width, height);
    const ctx = cvs.getContext('2d');

    const textInput = typeof obj.text === 'string' ? obj.text : '';
    // Default values akan digunakan dari sini
    const textColor = obj.color || 'black'; 
    const blurAmount = obj.blur === undefined ? 3 : parseInt(obj.blur);
    const backgroundInput = obj.background || 'white';


    const teks = textInput.trim();
    const words = teks.split(' ').filter(w => w !== '');
    const wordColors = words.map(() => textColor);

    // Set background
    ctx.fillStyle = 'white'; // Default utama
    if (typeof backgroundInput === 'string' && backgroundInput.startsWith('http')) {
        try {
            const image = await loadImage(backgroundInput);
            ctx.drawImage(image, 0, 0, width, height);
        } catch (imgError) {
            console.error("Gagal load background image, menggunakan default:", imgError.message);
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        ctx.fillStyle = colorize(ctx, width, backgroundInput, height) || 'white';
        ctx.fillRect(0, 0, width, height);
    }

    let fontSize = 120;
    const lineHeightMultiplier = 1.2;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.textDrawingMode = "glyph";

    let lines = [];
    const rebuildLines = () => {
        lines = [];
        let currentLineWords = [];
        ctx.font = `${fontSize}px AppleFont`;

        for (const word of words) {
            if (ctx.measureText(word).width > width - 2 * margin) {
                fontSize -= 2;
                if (fontSize < 10) {
                    lines = words.map(w => w); 
                    return; 
                }
                return rebuildLines();
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

    rebuildLines();

    while (lines.length * fontSize * lineHeightMultiplier > height - 2 * margin && fontSize >= 10) {
        fontSize -= 2;
        if (fontSize < 10) break;
        rebuildLines();
    }
    
    const lineHeight = fontSize * lineHeightMultiplier;
    let y = margin + (height - 2 * margin - lines.length * lineHeight) / 2; 
    if (y < margin) y = margin; 

    let wordIndex = 0;
    for (const line of lines) {
        const wordsInLine = line.split(' ');
        const totalTextWidthInLine = ctx.measureText(wordsInLine.join('')).width;
        const totalSpacingInLine = fontSize * wordSpacingFactor * Math.max(0, wordsInLine.length - 1);
        const totalLineWidth = totalTextWidthInLine + totalSpacingInLine;
        let x = margin + (width - 2 * margin - totalLineWidth) / 2; 
        if (x < margin) x = margin;

        for (const word of wordsInLine) {
            ctx.fillStyle = colorize(ctx, ctx.measureText(word).width, wordColors[wordIndex]) || 'black';
            ctx.fillText(word, x, y);
            x += ctx.measureText(word).width + (fontSize * wordSpacingFactor);
            wordIndex++;
        }
        y += lineHeight;
    }

    let imageBuffer = cvs.toBuffer('image/png');
    if (blurAmount > 0) {
        try {
            const image = await Jimp.read(imageBuffer);
            image.blur(blurAmount);
            imageBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
        } catch (jimpError) {
            console.error("Gagal melakukan blur dengan Jimp:", jimpError.message);
        }
    }
    return imageBuffer;
}

// --- Rute Express ---
module.exports = (app) => {
  const creatorName = "ZenzzXD";

  app.get('/maker/brat', async (req, res) => {
    const { text } = req.query; // Hanya mengambil 'text'

    if (!text) {
      return res.status(400).json({
        status: false,
        creator: creatorName,
        message: "Parameter 'text' wajib diisi."
      });
    }

    try {
      // Panggil makeBratImage hanya dengan text.
      // Fungsi makeBratImage akan menggunakan default untuk color, background, dan blur.
      const imageBuffer = await makeBratImage({ text: text });

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
