const axios = require('axios');

const cache = { version: '', id: '' };

async function getClientID() {
  try {
    const { data: html } = await axios.get('https://soundcloud.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Exonity/1.0'
      }
    });

    const version = html.match(/<script>window\.__sc_version="(\d{10})"<\/script>/)?.[1];
    if (!version) return;

    if (cache.version === version) return cache.id;

    const scriptMatches = [...html.matchAll(/<script.*?src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+)"/g)];
    for (const [, scriptUrl] of scriptMatches) {
      const { data: js } = await axios.get(scriptUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Exonity/1.0'
        }
      });
      const idMatch = js.match(/client_id:"([a-zA-Z0-9]{32})"/);
      if (idMatch) {
        cache.version = version;
        cache.id = idMatch[1];
        return idMatch[1];
      }
    }
  } catch (err) {
    console.error('Gagal ambil client_id:', err.message);
  }
}

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const sisa = sec % 60;
  return `${min}:${sisa.toString().padStart(2, '0')}`;
}

function formatNumber(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

async function sndSearch(query) {
  if (!query) throw new Error('Masukkan query pencarian');

  const client_id = await getClientID();
  if (!client_id) throw new Error('Gagal mendapatkan client_id');

  const url = 'https://api-v2.soundcloud.com/search/tracks';

  const response = await axios.get(url, {
    params: { q: query, client_id, limit: 30 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Exonity/1.0'
    }
  });

  const result = response.data.collection.map(track => ({
    id: track.id,
    title: track.title,
    url: track.permalink_url,
    duration: formatDuration(track.full_duration),
    thumbnail: track.artwork_url,
    author: {
      name: track.user.username,
      url: track.user.permalink_url
    },
    like_count: formatNumber(track.likes_count || 0),
    download_count: formatNumber(track.download_count || 0),
    play_count: formatNumber(track.playback_count || 0),
    release_date: formatDate(track.release_date || track.created_at)
  }));

  return result;
}

module.exports = function (app) {
  app.get('/search/SoundCloud', async (req, res) => {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "query" tidak ditemukan'
      });
    }

    try {
      const result = await sndSearch(query);
      res.json({
        status: true,
        creator: 'Exonity',
        query,
        count: result.length,
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message || 'Terjadi kesalahan saat mengambil data SoundCloud'
      });
    }
  });
};
