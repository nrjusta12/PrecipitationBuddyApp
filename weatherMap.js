// Define state regions with coordinates (testing with MN and FL for potential rain)
const stateRegions = {
  "MN": [
    { name: "NW MN", lat: 47.5, lon: -95.0 }
  ],
  "FL": [
    { name: "SW FL", lat: 26.1, lon: -81.7 } // Southwest FL, prone to summer rain
  ]
};

// Define user agent
const userAgent = "PrecipitationBuddyApp (njusta@yahoo.com)";

// Define getPrecipitation outside of colorMap
async function getPrecipitation() {
  console.log('Starting getPrecipitation'); // Debug: Log start of function
  const promises = Object.entries(stateRegions).flatMap(([state, regions]) =>
    regions.map(region => {
      console.log(`Fetching for ${region.name} at ${region.lat},${region.lon}`); // Debug: Log each fetch
      return fetch(`https://api.weather.gov/points/${region.lat},${region.lon}`, { headers: { 'User-Agent': userAgent } })
        .then(response => {
          console.log('Points response status:', response.status); // Debug: Log response status
          return response.json();
        })
        .then(data => {
          console.log('Points Data:', data); // Debug: Log the entire points response
          return fetch(data.properties.forecastHourly, { headers: { 'User-Agent': userAgent } })
            .then(response => {
              console.log('Hourly response status:', response.status); // Log hourly status
              if (!response.ok) {
                console.log('Hourly error details:', response);
                throw new Error('Hourly request failed');
              }
              return response.json();
            })
            .then(hourly => {
              console.log('Hourly Data:', hourly); // Debug: Log the entire hourly response
              console.log('Hourly Periods Structure:', JSON.stringify(hourly.properties.periods, null, 2)); // Debug: Log periods structure
              // Find maximum probability of precipitation and estimate inches
              let maxProb = 0;
              for (let period of hourly.properties.periods) {
                if (period.probabilityOfPrecipitation?.value > maxProb) {
                  maxProb = period.probabilityOfPrecipitation.value;
                }
              }
              let precip = 0;
              if (maxProb >= 70) precip = 0.5 + (maxProb - 70) * 0.01; // 70%+ = 0.5-1+ inches
              else if (maxProb >= 50) precip = 0.3 + (maxProb - 50) * 0.005; // 50-69% = 0.3-0.5 inches
              else if (maxProb >= 30) precip = 0.1 + (maxProb - 30) * 0.002; // 30-49% = 0.1-0.2 inches
              return { state, region: region.name, precip };
            })
            .catch(error => {
              console.log('Fetch error caught:', error); // Debug: Catch and log errors
              return { state, region: region.name, precip: 0 }; // Fallback data with state and region
            });
        })
        .catch(error => {
          console.log('Points fetch error:', error); // Debug: Catch initial fetch errors
          return { state, region: region.name, precip: 0 }; // Fallback data with state and region
        });
    })
  );
  const results = await Promise.all(promises);
  console.log('Precipitation results:', results); // Debug: Log final results
  return results.map(result => ({ ...result, state: result.state || 'Unknown', region: result.region || 'Unknown' })); // Ensure state and region
}

// Define colorMap separately
function colorMap() {
  getPrecipitation().then(data => {
    console.log('ColorMap data:', data); // Debug: Log data received by colorMap
    const map = document.querySelector("#usMap");
    const ctx = map.getContext("2d");
    ctx.clearRect(0, 0, map.width, map.height);
    data.forEach(item => {
      console.log('Precipitation value for', item.region, ':', item.precip); // Debug: Log precipitation value
      let color;
      if (item.precip === 0) {
        // No color change, skip drawing
        return; // Skip to next item
      } else if (item.precip > 0 && item.precip < 1) color = "lightgray"; // 0.1-0.99 inches
      else if (item.precip <= 4) color = "lightblue"; // 1-4 inches
      else if (item.precip <= 8) color = "mediumblue"; // 4-8 inches
      else if (item.precip <= 12) color = "darkblue"; // 8-12 inches
      else if (item.precip <= 18) color = "purple"; // 12-18 inches
      else color = "red"; // >18 inches
      const coords = getRegionCoords(item.state, item.region);
      ctx.fillStyle = color;
      ctx.fillRect(coords.x, coords.y, 50, 50); // Adjustable size
      ctx.fillStyle = "black";
      ctx.fillText(`${item.precip.toFixed(1)}in`, coords.x + 10, coords.y + 20); // Use inches with 1 decimal
    });
  }).catch(error => {
    console.log('ColorMap error:', error); // Debug: Catch overall errors
  });
}

function getRegionCoords(state, region) {
  const coords = {
    "MN-NW MN": { x: 50, y: 50 },
    "FL-SW FL": { x: 100, y: 50 } // New coord for SW FL
  };
  return coords[`${state}-${region}`] || { x: 0, y: 0 };
}

colorMap(); // Call the colorMap function
console.log('Script loaded'); // Confirm script is loaded
