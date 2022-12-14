# [Flight Stats Fetcher]() &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)]() [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

These scripts fetch airline reliability data from the Department of Transportation.

## Installation
1. Download this Repo
1. `npm install`

### Ubuntu
Extra packages were needed on a Ubuntu 22 instance. List found from [here](https://oofnivek.medium.com/ubuntu-install-puppeteer-bd551d6e5fc1)
```bash
sudo apt install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi-dev libxtst-dev libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 libatk-bridge2.0-0 libpangocairo-1.0-0 libgtk-3-0 libgbm1
```
## Documentation
### BTS Headers
Explanation of each key in BTS data found [here](https://www.openintro.org/data/index.php?data=airline_delay)

### Debugging Puppeteer Script
For interactive debugging, this was useful for me.
```shell
// To debug add a debugger in code 
// run: node --inspect-brk fetcher.js --runInBand
// Then open, in main chrome browser, chrome://inspect/#devices
// Then click on the inspect link
```

### Example Cron Syntax
Tested on a Ubuntu instance.  Writes log to file and reports to Datadog
```
0 0 * * * /home/ubuntu/.local/bin/dogwrap -n "<name of command>" -k <your dd api key> --submit_mode all --tags=<name of tag> --send_metric "/usr/bin/node '/home/ubuntu/FlyReliably/FlightDataFetcher/fetcher.js' 2>&1 /var/log/fetcher.log" >> /home/ubuntu/fetcher-cron.log 2>&1
```

## Contributing

Feel free to open a Pull Request (preferred) or open an issue, but note there aren't currently any promises on response time.  

### License

FlightDataFetcher is [MIT licensed](./LICENSE).