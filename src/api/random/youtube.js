const axios = require('axios');
const { JSDOM } = require('jsdom');
const FormData = require('form-data');

function b64decode(str) {
  return Buffer.from(str, 'base64').toString();
}

async function fetchYTMP3Ing(url, type = 'mp3') {
  const jantung = {
    "accept": "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
  };

  const getRes = await axios.get("https://ytmp3.ing/", {
    headers: jantung,
    withCredentials: true
  });

  let csrfToken = null;
  let cookies = [];
  if (getRes.headers['set-cookie']) {
    cookies = getRes.headers['set-cookie'].map(x => x.split(';')[0]);
    const match = cookies.join(';').match(/csrftoken=([^;]+)/);
    if (match) csrfToken = match[1];
  }
  if (!csrfToken) {
    const dom = new JSDOM(getRes.data);
    const input = dom.window.document.querySelector('input[name="csrfmiddlewaretoken"]');
    csrfToken = input?.value || null;
  }
  if (!csrfToken) throw 'CSRF token gak ketemu!';

  const searchRes = await axios.post(
    "https://ytmp3.ing/search",
    `csrfmiddlewaretoken=${csrfToken}&query=${encodeURIComponent(url)}`,
    {
      headers: {
        ...jantung,
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "cookie": cookies.join('; ')
      },
      withCredentials: true
    }
  );

  const resultList = Array.isArray(searchRes.data) ? searchRes.data : searchRes.data?.search_result;
  const first = resultList?.[0];
  if (!first) throw 'Gagal menemukan video';

  const youtubeUrl = "https://www.youtube.com" + first.url_suffix;
  const form = new FormData();
  form.append("url", youtubeUrl);

  const actionUrl = `https://ytmp3.ing/${type === 'mp3' ? 'audio' : 'video'}`;
  const res = await axios.post(actionUrl, form, {
    headers: {
      ...jantung,
      ...form.getHeaders(),
      "x-csrftoken": csrfToken,
      "cookie": cookies.join('; ')
    },
    withCredentials: true
  });

  const filename = res.data?.filename || res.data?.file || res.data?.title;
  const base64Url = res.data?.url;
  if (!filename || !base64Url) throw 'Gagal dapat file info';

  await new Promise(res => setTimeout(res, 2000));
  await axios.post(
    "https://v1.ytmp3.ing/download",
    { format: type.toUpperCase(), filename },
    { headers: { ...jantung, "content-type": "application/json" } }
  );

  const finalUrl = b64decode(base64Url);
  return {
    status: true,
    title: first.title,
    channel: first.channel,
    format: type,
    data: {
      filename,
      url: finalUrl
    }
  };
}

module.exports = function (app) {
  app.get('/downloader/ytmp3', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: 'Masukkan parameter ?url=' });

    try {
      const result = await fetchYTMP3Ing(url, 'mp3');
      res.json(result);
    } catch (err) {
      res.status(500).json({ status: false, message: err.toString() });
    }
  });

  app.get('/downloader/ytmp4', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ status: false, message: 'Masukkan parameter ?url=' });

    try {
      const result = await fetchYTMP3Ing(url, 'mp4');
      res.json(result);
    } catch (err) {
      res.status(500).json({ status: false, message: err.toString() });
    }
  });
};
