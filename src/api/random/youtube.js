const axios = require('axios');
const FormData = require('form-data');
const { JSDOM } = require('jsdom');

module.exports = function(app) {
    const jantung = {
        "accept": "*/*",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
    };

    function b64decode(str) {
        return Buffer.from(str, 'base64').toString();
    }

    async function getCSRFToken() {
        const getRes = await axios.get("https://ytmp3.ing/", {
            headers: jantung,
            withCredentials: true
        });

        let cookies = [];
        let csrfToken = null;

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

        if (!csrfToken) throw new Error("CSRF token tidak ditemukan");

        return { csrfToken, cookies };
    }

    async function searchYoutube(query, csrfToken, cookies) {
        const searchData = `csrfmiddlewaretoken=${csrfToken}&query=${encodeURIComponent(query)}`;
        const searchRes = await axios.post("https://ytmp3.ing/search", searchData, {
            headers: {
                ...jantung,
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "cookie": cookies.join('; ')
            },
            withCredentials: true
        });

        const resultList = Array.isArray(searchRes.data) ? searchRes.data : searchRes.data?.search_result;
        const first = resultList?.[0];

        if (!first) throw new Error("Video tidak ditemukan");
        return {
            title: first.title,
            channel: first.channel,
            url: "https://www.youtube.com" + first.url_suffix
        };
    }

    async function getAudioDownload(url, csrfToken, cookies) {
        const body = new FormData();
        body.append("url", url);

        const res = await axios.post("https://ytmp3.ing/audio", body, {
            headers: {
                ...jantung,
                ...body.getHeaders(),
                "x-csrftoken": csrfToken,
                "cookie": cookies.join('; ')
            },
            withCredentials: true
        });

        const filename = res.data?.filename || res.data?.file || res.data?.title;
        const base64url = res.data?.url;
        if (!filename || !base64url) return null;

        await new Promise(r => setTimeout(r, 2000));
        await axios.post("https://v1.ytmp3.ing/download", {
            format: "MP3",
            filename
        }, {
            headers: {
                ...jantung,
                "content-type": "application/json"
            }
        });

        return {
            filename,
            url: b64decode(base64url)
        };
    }

    async function getVideoDownload(url, csrfToken, cookies) {
        const body = new FormData();
        body.append("url", url);

        const res = await axios.post("https://ytmp3.ing/video", body, {
            headers: {
                ...jantung,
                ...body.getHeaders(),
                "x-csrftoken": csrfToken,
                "cookie": cookies.join('; ')
            },
            withCredentials: true
        });

        const filename = res.data?.filename;
        const base64url = res.data?.url;
        if (!filename || !base64url) return null;

        await new Promise(r => setTimeout(r, 2000));
        await axios.post("https://v1.ytmp3.ing/download", {
            format: "MP4",
            filename
        }, {
            headers: {
                ...jantung,
                "content-type": "application/json"
            }
        });

        return {
            filename,
            url: b64decode(base64url)
        };
    }

    // == MP3 Endpoint ==
    app.get('/downloader/ytmp3', async (req, res) => {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: 'Parameter ?url= diperlukan' });

            const { csrfToken, cookies } = await getCSRFToken();
            const data = await searchYoutube(url, csrfToken, cookies);
            const audio = await getAudioDownload(data.url, csrfToken, cookies);

            if (!audio) return res.status(404).json({ status: false, error: 'Gagal mengambil MP3' });

            res.json({
                status: true,
                type: "audio",
                title: data.title,
                channel: data.channel,
                mp3: audio
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    });

    // == MP4 Endpoint ==
    app.get('/downloader/ytmp4', async (req, res) => {
        try {
            const { url } = req.query;
            if (!url) return res.status(400).json({ status: false, error: 'Parameter ?url= diperlukan' });

            const { csrfToken, cookies } = await getCSRFToken();
            const data = await searchYoutube(url, csrfToken, cookies);
            const video = await getVideoDownload(data.url, csrfToken, cookies);

            if (!video) return res.status(404).json({ status: false, error: 'Gagal mengambil MP4' });

            res.json({
                status: true,
                type: "video",
                title: data.title,
                channel: data.channel,
                mp4: video
            });
        } catch (e) {
            res.status(500).json({ status: false, error: e.message });
        }
    });
};
