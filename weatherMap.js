// Define state regions with coordinates (testing with one region)
const stateRegions = {
  "MN": [
    { name: "NW MN", lat: 47.5, lon: -95.0 }
  ]
};

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
          return fetch(data.properties.forecast, { headers: { 'User-Agent': userAgent } })
            .then(response => {
              console.log('Forecast response status:', response.status); // Debug: Log forecast status
              if (!response.ok) {
                console.log('Forecast error details:', response);
                throw new Error('Forecast request failed');
              }
              return response.json();
            })
            .catch(error => {
              console.log('Fetch error caught:', error); // Debug: Catch and log errors
              return { state, region: region.name, precip: 0 }; // Fallback data
            });
        })
        .catch(error => {
          console.log('Points fetch error:', error); // Debug: Catch initial fetch errors
          return { state, region: region.name, precip: 0 }; // Fallback data
        });
    })
  );
  const results = await Promise.all(promises);
  console.log('Precipitation results:', results); // Debug: Log final results
  return results;
}

// Define colorMap separately
function colorMap() {
  getPrecipitation().then(data => {
    console.log('ColorMap data:', data); // Debug: Log data received by colorMap
    const map = document.querySelector("#usMap");
    const ctx = map.getContext("2d");
    ctx.clearRect(0, 0, map.width, map.height);
    data.forEach(item => {
      let color;
      if (item.precip < 1) color = "lightgray";
      else if (item.precip <= 4) color = "lightblue";
      else if (item.precip <= 8) color = "blue";
      else if (item.precip <= 12) color = "darkblue";
      else if (item.precip <= 18) color = "purple";
      else color = "red";
      const coords = getRegionCoords(item.state, item.region);
      ctx.fillStyle = color;
      ctx.fillRect(coords.x, coords.y, 50, 50); // Adjustable size
      ctx.fillStyle = "black";
      ctx.fillText(`${item.precip}in`, coords.x + 10, coords.y + 20);
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

const userAgent = "PrecipitationBuddyApp (njusta@yahoo.com)";

colorMap(); // Call the colorMap function
console.log('Script loaded'); // Confirm script is loaded
const userAgent = "PrecipitationBuddyApp (njusta@yahoo.com)";

colorMap(); // Call the colorMap function
console.log('Script loaded'); // Confirm script is loaded
