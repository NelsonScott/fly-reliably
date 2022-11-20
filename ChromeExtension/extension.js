const milisecondsToWait = 500;

console.log("Loading extension");

chrome.storage.sync.set({key: value}, function() {
    console.log('Value is set to ' + value);
  });
  
flightReliabilityData = {}
// TODO: see about re-raising the error, and in general improving error reporting
// TODO: investigate async vs sync before taking to production
$.ajax({
    url: 'https://e8pwzic1gg.execute-api.us-east-1.amazonaws.com/',
    type: 'GET',
    success: function(data){ 
        console.debug(`raw reliability data received: ${data}`);
        flightReliabilityData = JSON.parse(data);
    },
    error: function(error) {
        console.error(`error: ${error}`);
    },
    async: false
});

longToShortName = {
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

// Calculate averages for all airlines to compare each individually against
const onTimeValues = Object.entries(flightReliabilityData).map(entry => entry[1]['ontime_percentage']);
const avgOnTime = onTimeValues.reduce((accumulator, value) => accumulator + value, 0) / onTimeValues.length;
console.debug("avgOnTime: " + avgOnTime);

const cancelValues = Object.entries(flightReliabilityData).map(entry => entry[1]['cancelled_percentage']);
const avgCancel = cancelValues.reduce((accumulator, value) => accumulator + value, 0) / cancelValues.length;
console.debug("avgCancel: " + avgCancel);

console.debug("flightReliabilityData keys: " + Object.keys(flightReliabilityData));
function main() {
    console.debug("flightReliabilityData keys inside main(): " + Object.keys(flightReliabilityData));

    Object.keys(flightReliabilityData).forEach(airlineLongName => {
        console.debug(`airlineLongName: ${airlineLongName}`);
        
        shortVersion = longToShortName[airlineLongName];
        console.debug(`shortVersion: ${shortVersion}`);
        airlineContainers = $("span:contains('" + shortVersion + "')");

        for (let idx = 0; idx < airlineContainers.length; idx++) {
            const airlineContainer = airlineContainers[idx];
            var text = airlineContainer.textContent;
            if (text.includes("On-Time")) {
                // Skip if we've already filled it in
                continue;
            }

            appendReliabilityMetrics(airlineContainer, airlineLongName);
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

    setTimeout(main, milisecondsToWait);
}

function appendReliabilityMetrics(airlineContainer, airlineName) {
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

// Initial kickoff, then it'll loop
main();