const express = require('express');
const path = require('path');
const Jimp = require('jimp');

const app = express();
const port = process.env.PORT || 3000;

let createCanvas, registerFont, loadImage;
try {
  ({ createCanvas, registerFont, loadImage } = require('canvas'));
  const fontPath = path.resolve(process.cwd(), 'AppleColorEmoji.ttf');
  registerFont(fontPath, { family: 'AppleFont' });
} catch (e) {
  console.warn("Canvas tidak tersedia, fallback ke Jimp.");
}

function colorize(ctx, width, colorsInput) {
  if (typeof colorsInput === 'string' && colorsInput.startsWith('http')) return null;
  if (Array.isArray(colorsInput)) {
    let gradient = ctx.createLinearGradient(0, 0, width, 0);
    let step = colorsInput.length > 1 ? 1 / (colorsInput.length - 1) : 1;
    colorsInput.forEach((color, index) => {
      gradient.addColorStop(Math.min(index * step, 1), color);
    });
    return gradient;
  }
  return colorsInput;
}

async function makeBratImage(obj) {
  const width = 512;
  const height = 512;
  const margin = 20;
  const wordSpacingFactor = 0.15;
  const fontSizeDefault = 120;

  const textInput = typeof obj.text === 'string' ? obj.text : '';
  const textColor = obj.color || 'black';
  const blurAmount = obj.blur === undefined ? 3 : parseInt(obj.blur);
  const backgroundInput = obj.background || 'white';
  const words = textInput.trim().split(/\s+/);

  try {
    if (!createCanvas) throw new Error('Canvas not available');
    const cvs = createCanvas(width, height);
    const ctx = cvs.getContext('2d');

    if (typeof backgroundInput === 'string' && backgroundInput.startsWith('http')) {
      const bgImage = await loadImage(backgroundInput);
      ctx.drawImage(bgImage, 0, 0, width, height);
    } else {
      ctx.fillStyle = colorize(ctx, width, backgroundInput) || 'white';
      ctx.fillRect(0, 0, width, height);
    }

    let fontSize = fontSizeDefault;
    const lineHeightMultiplier = 1.2;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let lines = [];
    const rebuildLines = () => {
      lines = [];
      let current = [];
      ctx.font = `${fontSize}px AppleFont`;
      for (const word of words) {
        const currentLine = current.join(' ');
        const spacing = fontSize * wordSpacingFactor * (current.length - 1);
        const testLine = current.length ? `${currentLine} ${word}` : word;
        const lineWidth = ctx.measureText(testLine).width + spacing;
        if (lineWidth < width - 2 * margin) {
          current.push(word);
        } else {
          lines.push(current.join(' '));
          current = [word];
        }
      }
      if (current.length) lines.push(current.join(' '));
    };

    rebuildLines();
    while (lines.length * fontSize * lineHeightMultiplier > height - 2 * margin && fontSize > 10) {
      fontSize -= 2;
      rebuildLines();
    }

    const lineHeight = fontSize * lineHeightMultiplier;
    let y = margin + (height - 2 * margin - lines.length * lineHeight) / 2;

    let wordIndex = 0;
    for (const line of lines) {
      const lineWords = line.split(' ');
      const textWidth = ctx.measureText(lineWords.join('')).width;
      const spacing = fontSize * wordSpacingFactor * (lineWords.length - 1);
      let x = margin + (width - 2 * margin - textWidth - spacing) / 2;

      for (const word of lineWords) {
        ctx.fillStyle = textColor;
        ctx.fillText(word, x, y);
        x += ctx.measureText(word).width + (fontSize * wordSpacingFactor);
        wordIndex++;
      }
      y += lineHeight;
    }

    let imageBuffer = cvs.toBuffer('image/png');
    if (blurAmount > 0) {
      const jimpImg = await Jimp.read(imageBuffer);
      jimpImg.blur(blurAmount);
      imageBuffer = await jimpImg.getBufferAsync(Jimp.MIME_PNG);
    }

    return imageBuffer;
  } catch (e) {
    console.warn('Gagal pakai canvas, fallback ke Jimp:', e.message);
  }

  // Fallback ke Jimp jika canvas error
  const image = typeof backgroundInput === 'string' && backgroundInput.startsWith('http')
    ? await Jimp.read(backgroundInput).catch(() => new Jimp(width, height, 'white'))
    : new Jimp(width, height, backgroundInput);

  image.resize(width, height);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
  const text = textInput.trim();

  image.print(
    font,
    margin,
    margin,
    {
      text,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    },
    width - 2 * margin,
    height - 2 * margin
  );

  if (blurAmount > 0) image.blur(blurAmount);
  return await image.getBufferAsync(Jimp.MIME_PNG);
}

// --- ROUTE EXPRESS ---
app.get('/maker/brat', async (req, res) => {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({
      status: false,
      creator: "ZenzzXD",
      message: "Parameter 'text' wajib diisi."
    });
  }

  try {
    const imageBuffer = await makeBratImage({ text });
    res.setHeader('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).json({
      status: false,
      creator: "ZenzzXD",
      message: error.message || 'Gagal membuat gambar brat.'
    });
  }
});

// --- START SERVER (optional jika bukan untuk Vercel) ---
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server ready di http://localhost:${port}`);
  });
}

module.exports = app;
