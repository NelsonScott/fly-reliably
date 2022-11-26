// This line must come before importing any instrumented module.
const tracer = require('dd-trace').init()

// const puppeteer = require('puppeteer');
const puppeteer = require('puppeteer')
var https = require('https');
const fs = require("fs");
var StatsD = require('hot-shots');
var dogstatsd = new StatsD();

dogstatsd.increment('fetcher.runs');

// TODO: there's a fair bit of cleanup needed in here, removing unused stuff, etc
module.exports.run = async (event, context) => {
    console.log('Starting Airline data fetcher');

    const browser = await puppeteer.launch({
        headless: true, slowMo: 100
    });
    const page = await browser.newPage();
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.2.1.min.js' })
    const navigationPromise = page.waitForNavigation()

    await page.goto('https://www.transtats.bts.gov/OT_Delay/OT_DelayCause1.asp');
    await page.screenshot({ path: 'transtats.png' });

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

    // Doesn't seem to work
    // TOOD: see if safely remove
    await page.waitForSelector('table > tbody > tr > .finePrint:nth-child(3) > a:nth-child(2)');
    console.log('Clicking on link to download CSV');
    await page.click('table > tbody > tr > .finePrint:nth-child(3) > a:nth-child(2)');

    // https://stackoverflow.com/questions/74424735/puppeteer-not-actually-downloading-zip-despite-clicking-link
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

    console.log('Getting links');
    const links = await page.evaluate(
        () => Array.from(
            document.querySelectorAll('a[href]'),
            a => {
                dict = {};
                dict['href'] = a.getAttribute('href');
                dict['innerText'] = a.innerText;
                return dict;
            }
        )
    );

    for (let idx = 0; idx < links.length; idx++) {
        const link = links[idx];
        if (link.innerText === 'Download Raw Data') {
            console.log('Found download link', link.href);
            console.log('Text was', link.innerText);
            // var url = new URL(link.href, "https://www.transtats.bts.gov/OT_Delay/") 
            // https.get(url, (resp) => {
            //     let data = '';
            //     resp.on('data', (chunk) => {
            //         data += chunk;
            //     });
            //     resp.on('end', () => {
            //         console.log('Downloaded data', data);
            //     });
            // });
        }
    }

    await browser.close();
    console.log('Fetcher finished');
};

// TODO: maybe not best practice, but it works
module.exports.run();