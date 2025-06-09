const axios = require('axios');

async function checkHosting(domain) {
  if (!domain) throw 'Hadeh, gini bree... lu kasih domain nya yak 🗿 Jangan kosong begini, aelah 🌝';

  const format = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  const clean = domain.toLowerCase().trim().replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');

  if (!format.test(clean)) {
    throw 'Format domain lu kagak valid bree.. Contohnya gini: domain.com atau https://domain.com yak 😂';
  }

  const url = `https://hosting-checker.net/api/hosting/${clean}`;
  const headers = {
    'authority': 'hosting-checker.net',
    'referer': `https://hosting-checker.net/websites/${clean}`,
    'user-agent': 'Postify/1.0.0'
  };

  const res = await axios.get(url, {
    headers,
    validateStatus: false
  });

  if (!res.data || res.status !== 200) {
    if (res.status === 404) throw 'Domain lu kagak ada datanya bree.. 🗿';
    if (res.status === 429) throw 'Sabar bree.. Kebanyakan request nih, tunggu bentar yak 😋';
    throw 'Domain lu kagak bisa di cek bree.. Coba web yang lain yak 🙈';
  }

  const data = res.data;

  return {
    domain: {
      name: data.web?.domain,
      original: data.web?.originalDomain || data.web?.domain,
      ipv6_support: data.web?.ipV6Support
    },
    web: {
      ips: data.web?.lookups?.map(ip => ({
        address: ip.address,
        is_ipv6: ip.isIPv6,
        location: ip.location,
        provider: ip.provider
      })) || [],
      providers: data.web?.providers || []
    },
    nameserver: {
      ipv6_support: data.nameserver?.ipV6Support,
      servers: data.nameserver?.lookups?.map(ns => ({
        domain: ns.domain,
        ips: ns.lookups?.map(ip => ({
          address: ip.address,
          is_ipv6: ip.isIPv6,
          location: ip.location,
          provider: ip.provider
        })) || []
      })) || [],
      providers: data.nameserver?.providers || []
    },
    mail: {
      incoming: {
        ipv6_support: data.incomingMail?.ipV6Support,
        servers: data.incomingMail?.lookups?.map(mail => ({
          domain: mail.domain,
          ips: mail.lookups?.map(ip => ({
            address: ip.address,
            is_ipv6: ip.isIPv6,
            location: ip.location,
            provider: ip.provider
          })) || []
        })) || [],
        providers: data.incomingMail?.providers || []
      },
      outgoing: {
        ipv6_support: data.outgoingMail?.ipV6Support,
        ips: data.outgoingMail?.lookups?.map(ip => ({
          address: ip.address,
          is_ipv6: ip.isIPv6,
          location: ip.location,
          provider: ip.provider
        })) || [],
        providers: data.outgoingMail?.providers || []
      }
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = function (app) {
  app.get('/tools/hostingcheck', async (req, res) => {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Parameter domain tidak boleh kosong'
      });
    }

    try {
      const result = await checkHosting(domain);
      res.status(200).json({
        status: true,
        creator: 'ZenzzXD',
        result
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        creator: 'ZenzzXD',
        message: 'Gagal mengecek hosting domain',
        error: err?.message || String(err)
      });
    }
  });
};
