const axios = require('axios');

const clientId = '5b7e083725ea4d5298e64e6efa50ecfe';
const clientSecret = 'c5445e7f2f31485cbfb715c63191acae';

async function getAccessToken() {
  const res = await axios.post(
    'https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      }
    }
  );
  return res.data.access_token;
}

async function searchSpotify(query) {
  const token = await getAccessToken();
  const res = await axios.get('https://api.spotify.com/v1/search', {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query,
      type: 'track',
      limit: 3
    }
  });

  return res.data.tracks.items.map(track => ({
    title: track.name,
    artist: track.artists.map(a => a.name).join(', '),
    album: track.album.name,
    url: track.external_urls.spotify,
    cover: track.album.images[0]?.url || null
  }));
}

module.exports = function (app) {
  app.get('/search/spotify', async (req, res) => {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter query tidak boleh kosong'
      });
    }

    try {
      const result = await searchSpotify(query);
      res.json({
        status: true,
        creator: 'ZenzzXD',
        result
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengambil data dari Spotify',
        error: err?.message || String(err)
      });
    }
  });
};
