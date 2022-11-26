// This line must come before importing any instrumented module.
const tracer = require('dd-trace').init()

// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer')
var https = require('https');
const fs = require("fs");
var StatsD = require('hot-shots');
var dogstatsd = new StatsD();

dogstatsd.increment('fetcher.runs');
module.exports.run = async (event, context) => {
    console.log('Starting Airline data fetcher');

    const browser = await puppeteer.launch({
        headless: true, slowMo: 100
    });
    const page = await browser.newPage();
    // TODO: Not sure how useful the page console logs are, maybe move to debug
    // page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' })
    const navigationPromise = page.waitForNavigation()

    await page.goto('https://www.transtats.bts.gov/OT_Delay/OT_DelayCause1.asp');

    await page.waitForSelector('#PeriodFrom')
    let optionValuePeriodFrom = await page.$$eval('option', options => {
        var returnValue;
        LOOKBACK_MONTHS = 6;
        date = new Date();
        date.setMonth(date.getMonth() - LOOKBACK_MONTHS);
        month = date.toLocaleDateString('en-us', { month: "long" })
        year = date.toLocaleDateString('en-us', { year: "numeric" })
        let needle = [month, year].join(', ')

        options.forEach(option => {
            if (option.innerText === needle) {
                returnValue = option.value;
            }
        });

        return returnValue;
    });
    console.log("optionValuePeriodFrom", optionValuePeriodFrom);
    await page.select('#PeriodFrom', optionValuePeriodFrom);
    // By default 'Period To' is last month with data, leave it unchanged
    // Otherwise would need to loop over previous months to find latest

    await page.waitForSelector('#submit');
    await page.click('#submit');

    await navigationPromise;

    // https://stackoverflow.com/questions/74424735/puppeteer-not-actually-downloading-zip-despite-clicking-link
    await page.waitForSelector('table > tbody > tr > .finePrint:nth-child(3) > a:nth-child(2)');
    const handle = await page.$(
        "table > tbody > tr > .finePrint:nth-child(3) > a:nth-child(2)"
      );
    console.log('handle', handle);
    const relativeZipUrl = await page.evaluate(
    (anchor) => anchor.getAttribute("href"),
    handle
    );
    console.log('relativeZipUrl', relativeZipUrl);
    const url = "https://www.transtats.bts.gov/OT_Delay/".concat(relativeZipUrl);
    const encodedUrl = encodeURI(url);
    
    // Dont run in PROD
    https.globalAgent.options.rejectUnauthorized = false;

    https.get(encodedUrl, (res) => {
        const path = `${__dirname}/download.zip`;
        const filePath = fs.createWriteStream(path);
        res.pipe(filePath);
        filePath.on("finish", () => {
            filePath.close();
            console.log("Download Completed");
        });
    });

    await browser.close();
    console.log('Fetcher finished');
};

// TODO: maybe not best practice, but it works
module.exports.run();