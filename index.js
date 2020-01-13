const express = require('express');
const chromium = require('chrome-aws-lambda');

if (process.env.NODE_ENV === 'development') require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

app.get('/', async (req, res) => {
  try {
    const { cinemaId, showId, featureId } = req.query;
    const { totalSeats, availableSeats } = await getSeats({ cinemaId, showId });

    return res.send({ totalSeats, availableSeats });
  } catch (error) {
    res.sendStatus(500);
  }
});

app.listen(port, () => console.log('App listening on port ' + port));

const getSeats = async ({ cinemaId, showId }) => {
  // const browser = await puppeteer.launch({
  //   args: ['--no-sandbox'],
  //   headless: process.env.NODE_ENV !== 'development',
  // });

  const browser = await chromium.puppeteer.launch({
    executablePath: await chromium.executablePath,
    args: chromium.args,
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport,
  });

  const page = await browser.newPage();
  if (process.env.NODE_ENV === 'development') await page.setViewport({ width: 1280, height: 720 });
  const navigationPromise = page.waitForNavigation();

  const requestURL = `https://tickets.cinemarkhoyts.com.ar/NSTicketing/?CinemaId=${cinemaId}&SessionId=${showId}&FeatureId=0`;
  await page.goto(requestURL, {
    waitUntil: 'networkidle0',
    referer: 'no-referrer-when-downgrade',
  });

  await page.waitForSelector('#txtEmailAddress');
  await page.focus('#txtEmailAddress');
  await page.keyboard.type(process.env.CINEMARK_USERNAME);

  await page.waitForSelector('.md-w-6 #txtPassword');
  await page.focus('.md-w-6 #txtPassword');
  await page.keyboard.type(process.env.CINEMARK_PASSWORD);

  await page.waitForSelector('#logiform #btnLogin');
  await page.click('#logiform #btnLogin');

  await navigationPromise;

  try {
    const modalSelector = '.b-modal';
    await page.waitForSelector(modalSelector, { timeout: 400 });

    await page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);
      elements.forEach((element) => element.parentNode.removeChild(element));
    }, modalSelector);
  } catch (error) {}

  await page.waitForSelector('div.categories-list > div.category:nth-child(2) a.ticket-price-reg');
  await page.click('div.categories-list > div.category:nth-child(2) a.ticket-price-reg');

  await page.waitForSelector('#btnNext');
  await page.click('#btnNext');

  await navigationPromise;

  const available = await page.$$('a.available');
  const availableSeats = available.length;

  const singleSeats = await page.$$('.seat-single > a:not(.void)');
  const totalSeats = singleSeats.length;

  await browser.close();

  return { totalSeats, availableSeats };
};
