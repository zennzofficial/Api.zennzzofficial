const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

module.exports = async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto('https://www.kompas.tv/nasional', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const articles = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a.card__link')).map(el => ({
        title: el.querySelector('.card__title')?.innerText.trim(),
        link: el.href
      })).filter(x => x.title && x.link);
    });

    await browser.close();

    return res.status(200).json({
      status: true,
      creator: 'ZenzzXD',
      count: articles.length,
      result: articles
    });
  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({
      status: false,
      message: 'Scraping gagal',
      error: err.message
    });
  }
};
