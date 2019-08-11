const fs = require('fs').promises
const puppeteer = require('puppeteer')

require('dotenv').config()

const getSeats = async (request, response) => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox'],
  })

  // const { cinemaId, sessionId, featureId } = request.query

  const page = await browser.newPage()
  const navigationPromise = page.waitForNavigation()

  const requestURL =
    'https://tickets.cinemarkhoyts.com.ar/NSTicketing/nsLogin.aspx?ReturnUrl=%2fNSTicketing%2f%3fCinemaId%3d733%26SessionId%3d51445%26FeatureId%3d0&CinemaId=733&SessionId=51445&FeatureId=0'
  await page.goto(requestURL, { waitUntil: 'networkidle0', referer: 'no-referrer-when-downgrade' })

  await page.waitForSelector('.md-w-6 #txtEmailAddress')
  await page.focus('.md-w-6 #txtEmailAddress')
  await page.keyboard.type(process.env.CINEMARK_USERNAME)

  await page.waitForSelector('.md-w-6 #txtPassword')
  await page.focus('.md-w-6 #txtPassword')
  await page.keyboard.type(process.env.CINEMARK_PASSWORD)

  await page.waitForSelector('#logiform #btnLogin')
  await page.click('#logiform #btnLogin')

  await navigationPromise

  await page.waitForSelector('.categories-list > .featured > div > .category-slider-wrap > .category-slider')
  await page.click('.categories-list > .featured > div > .category-slider-wrap > .category-slider')

  await page.waitForSelector('div > .ticket-reg > .ticket-price > .ticket-price-reg > .ticket-price-reg')
  await page.click('div > .ticket-reg > .ticket-price > .ticket-price-reg > .ticket-price-reg')

  await page.waitForSelector('.select-container #btnNext')
  await page.click('.select-container #btnNext')

  await navigationPromise

  const available = await page.$$('.available')
  const availableSeats = available.length

  const seatsMap = await page.$('.seat-block')
  const seatsBlock = await page.evaluate(() => {
    const seatsBlock = document.querySelector('.seat-block')
    seatsBlock.removeChild(seatsBlock.childNodes[0])

    return seatsBlock.innerHTML
  })

  await fs.writeFile(
    'index.html',
    `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <meta http-equiv="X-UA-Compatible" content="ie=edge"/>
          <title>Document</title>
          <link rel="stylesheet" href="./style.min.css"/>
        </head>
        <body>${seatsBlock}</body>
      </html>
  `
  )

  await browser.close()
}

getSeats()
