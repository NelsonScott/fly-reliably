const milisecondsToWait = 500;
const CHROME_STORAGE_KEY = 'storedFlightReliabilityData'
const LONG_TO_SHORT_NAME = {
    "Endeavor Air Inc.": "Endeavor",
    "American Airlines Inc.": "American",
    "Alaska Airlines Inc.": "Alaska",
    "JetBlue Airways": "JetBlue",
    "Delta Air Lines Inc.": "Delta",
    "Frontier Airlines Inc.": "Frontier",
    "Allegiant Air": "Allegiant",
    "Hawaiian Airlines Inc.": "Hawaiian",
    "Envoy Air": "Envoy",
    "Spirit Air Lines": "Spirit",
    "PSA Airlines Inc.": "PSA",
    "SkyWest Airlines Inc.": "SkyWest",
    "Horizon Air": "Horizon",
    "United Air Lines Inc.": "United",
    "Southwest Airlines Co.": "Southwest",
    "Mesa Airlines Inc.": "Mesa",
    "Republic Airline": "Republic"
}
var avgOnTime;
var avgCancel;
const CACHE_EXPIRY = TWENTY_FOUR_HRS_IN_MILISECONDS = 1000 * 60 * 60 * 24;
// chrome.storage.sync.remove([CHROME_STORAGE_KEY]);

chrome.storage.sync.get([CHROME_STORAGE_KEY], function (result) {
    console.debug(`Storage result: ${JSON.stringify(result)}`);

    if (result[CHROME_STORAGE_KEY]) {
        console.debug("result", JSON.stringify(result));
        reliabilityDataWithTimestamp = result[CHROME_STORAGE_KEY];
        if (Date.now() - reliabilityDataWithTimestamp["timestamp"] > CACHE_EXPIRY) {
            console.debug(`Data is older than 24 hours, fetching new data`);
            getFlightReliabilityData();
        } else {
            console.debug(`Data is less than 24 hours old, using cached data`);
            reliabilityData = reliabilityDataWithTimestamp["data"];
            console.debug("Loaded from storage", JSON.stringify(reliabilityData));
            main(reliabilityData)
        }
    } else {
        console.debug("Flight reliability data not found in storage, making API call");
        getFlightReliabilityData();
    }
});

function getFlightReliabilityData() {
    // TODO: see about re-raising the error, and in general improving error reporting
    $.ajax({
        url: 'https://e8pwzic1gg.execute-api.us-east-1.amazonaws.com/',
        type: 'GET',
        success: function (data) {
            console.debug(`raw reliability data received: ${data}`);
            data = JSON.parse(data);
            const dataWithTimestamp = {
                "timestamp": Date.now(),
                "data": data
            }
            chrome.storage.sync.set({ [CHROME_STORAGE_KEY]: dataWithTimestamp }, function () {
                console.debug('Flight reliability data w/ timestamp stored in chrome storage', dataWithTimestamp);
                main(data);
            });
        },
        error: function (error) {
            console.error(`error: ${error}`);
        }
    });
}

function setIndustryAvgValues(flightReliabilityData) {
    // Calculate averages for all airlines to compare each individually against
    const onTimeValues = Object.entries(flightReliabilityData).map(entry => entry[1]['ontime_percentage']);
    avgOnTime = onTimeValues.reduce((accumulator, value) => accumulator + value, 0) / onTimeValues.length;
    console.debug("avgOnTime: " + avgOnTime);

    const cancelValues = Object.entries(flightReliabilityData).map(entry => entry[1]['cancelled_percentage']);
    avgCancel = cancelValues.reduce((accumulator, value) => accumulator + value, 0) / cancelValues.length;
    console.debug("avgCancel: " + avgCancel);
}

function main(flightReliabilityData) {
    console.debug("flightReliabilityData in main()", JSON.stringify(flightReliabilityData));

    setIndustryAvgValues(flightReliabilityData);

    Object.keys(flightReliabilityData).forEach(airlineLongName => {
        shortVersion = LONG_TO_SHORT_NAME[airlineLongName];
        airlineContainers = $("span:contains('" + shortVersion + "')");

        for (let idx = 0; idx < airlineContainers.length; idx++) {
            const airlineContainer = airlineContainers[idx];
            var text = airlineContainer.textContent;
            if (text.includes("On-Time")) {
                // Skip if we've already filled it in
                continue;
            }

            appendReliabilityMetrics(flightReliabilityData, airlineContainer, airlineLongName);
        }
    });

    // Oddly some spans at bottom of page are incorrectly getting populated with Metrics
    // Do some cleanup
    const reliablityTerms = ["On-Time", "Canceled"];
    reliablityTerms.forEach(reliablityTerm => {
        const cleanUpIDs = ["Language", "Location"];
        cleanUpIDs.forEach(cleanUpID => {
            $(`span:contains('${cleanUpID}')`).children(`span:contains('${reliablityTerm}')`).remove();
        });
    });

    setTimeout(main, milisecondsToWait, flightReliabilityData);
}

function appendReliabilityMetrics(flightReliabilityData, airlineContainer, airlineName) {
    console.debug(`airlineName: ${airlineName}`);
    console.debug(`flightReliabilityData: ${JSON.stringify(flightReliabilityData)}`);
    var reliablityMetrics = flightReliabilityData[airlineName];
    console.debug(`reliablityMetrics: ${JSON.stringify(reliablityMetrics)}`);
    var color = "green"
    const onTimeRate = reliablityMetrics["ontime_percentage"];
    if (onTimeRate < avgOnTime) {
        color = "red";
    } else {
        color = "green";
    }
    reliabilityInfo = $('<span />').attr('style', `color:${color}`).html(` On-Time ${onTimeRate}% |`);
    $(airlineContainer).append(reliabilityInfo);

    const cancelRate = reliablityMetrics["cancelled_percentage"];
    if (cancelRate > avgCancel) {
        color = "red";
    } else {
        color = "green";
    }
    cancelInfo = $('<span />').attr('style', `color:${color}`).html(` Canceled ${cancelRate}%`);
    $(airlineContainer).append(cancelInfo);
}