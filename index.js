const express = require('express');
const puppeteer = require('puppeteer');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

app.get('/', async (req, res) => {
  const { cinemaId, sessionId, featureId } = req.query;
  const { totalSeats, availableSeats } = await getSeats({ cinemaId, sessionId, featureId });

  return res.send({ totalSeats, availableSeats });
});

app.listen(port, () => console.log('App listening on port ' + port));

const getSeats = async ({ cinemaId, sessionId, featureId }) => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const navigationPromise = page.waitForNavigation();

  const requestURL = `https://tickets.cinemarkhoyts.com.ar/NSTicketing/?CinemaId=${cinemaId}&SessionId=${sessionId}&FeatureId=${featureId}`;
  console.log('TCL: getSeats -> requestURL', requestURL);
  await page.goto(requestURL, { waitUntil: 'networkidle0', referer: 'no-referrer-when-downgrade' });

  await page.waitForSelector('.md-w-6 #txtEmailAddress');
  await page.focus('.md-w-6 #txtEmailAddress');
  await page.keyboard.type(process.env.CINEMARK_USERNAME);

  await page.waitForSelector('.md-w-6 #txtPassword');
  await page.focus('.md-w-6 #txtPassword');
  await page.keyboard.type(process.env.CINEMARK_PASSWORD);

  await page.waitForSelector('#logiform #btnLogin');
  await page.click('#logiform #btnLogin');

  await navigationPromise;

  await page.waitForSelector('.categories-list > .featured > div > .category-slider-wrap > .category-slider');
  await page.click('.categories-list > .featured > div > .category-slider-wrap > .category-slider');

  await page.waitForSelector('div > .ticket-reg > .ticket-price > .ticket-price-reg > .ticket-price-reg');
  await page.click('div > .ticket-reg > .ticket-price > .ticket-price-reg > .ticket-price-reg');

  await page.waitForSelector('.select-container #btnNext');
  await page.click('.select-container #btnNext');

  await navigationPromise;

  const available = await page.$$('a.available');
  const availableSeats = available.length;

  const singleSeats = await page.$$('.seat-single > a:not(.void)');
  const totalSeats = singleSeats.length;

  return { totalSeats, availableSeats };

  await browser.close();
};
