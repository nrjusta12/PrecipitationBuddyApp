// Define state regions with coordinates (testing with one region)
const stateRegions = {
  "MN": [
    { name: "NW MN", lat: 47.5, lon: -95.0 }
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
              console.log('Hourly response status:', response.status); // Debug: Log hourly status
              if (!response.ok) {
                console.log('Hourly error details:', response);
                throw new Error('Hourly request failed');
              }
              return response.json();
            })
            .then(hourly => {
              console.log('Hourly Data:', hourly); // Debug: Log the entire hourly response
              // Try to extract quantitative precipitation (in inches) - fallback to 0 if not available
              const precip = hourly.properties.periods[0]?.quantitativePrecipitation?.value?.[0] || 0;
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
  return results.map(result => ({ ...result, state: result.state || 'MN', region: result.region || 'Unknown' })); // Ensure state and region
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
      if (item.precip === 0) color = "lightgray"; // 0 inches
      else if (item.precip <= 1) color = "lightblue"; // 0-1 inch
      else if (item.precip <= 2) color = "blue"; // 1-2 inches
      else if (item.precip <= 4) color = "darkblue"; // 2-4 inches
      else if (item.precip <= 6) color = "purple"; // 4-6 inches
      else color = "red"; // 6+ inches
      const coords = getRegionCoords(item.state, item.region);
      ctx.fillStyle = color;
      ctx.fillRect(coords.x, coords.y, 50, 50); // Adjustable size
      ctx.fillStyle = "black";
      ctx.fillText(`${item.precip || '0'}in`, coords.x + 10, coords.y + 20); // Use inches
    });
  }).catch(error => {
    console.log('ColorMap error:', error); // Debug: Catch overall errors
  });
}

function getRegionCoords(state, region) {
  const coords = {
    "MN-NW MN": { x: 50, y: 50 }
  };
  return coords[`${state}-${region}`] || { x: 0, y: 0 };
}

colorMap(); // Call the colorMap function
console.log('Script loaded'); // Confirm script is loaded
