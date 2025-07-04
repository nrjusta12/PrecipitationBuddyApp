// Define state regions with coordinates
const stateRegions = {
  "MN": [
    { name: "NW MN", lat: 47.5, lon: -95.0 },
    { name: "NE MN", lat: 47.5, lon: -92.0 },
    { name: "SW MN", lat: 43.5, lon: -95.0 },
    { name: "SE MN", lat: 43.5, lon: -92.0 },
    { name: "Central MN", lat: 45.5, lon: -93.5 }
  ],
  "WI": [
    { name: "NW WI", lat: 46.0, lon: -91.0 },
    { name: "NE WI", lat: 46.0, lon: -87.0 },
    { name: "SW WI", lat: 42.5, lon: -91.0 },
    { name: "SE WI", lat: 42.5, lon: -87.0 },
    { name: "Central WI", lat: 44.5, lon: -89.5 }
  ],
  "IL": [
    { name: "NW IL", lat: 42.5, lon: -90.0 },
    { name: "NE IL", lat: 42.5, lon: -87.5 },
    { name: "SW IL", lat: 37.5, lon: -90.0 },
    { name: "SE IL", lat: 37.5, lon: -87.5 },
    { name: "Central IL", lat: 40.0, lon: -89.0 }
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
              if (!response.ok) throw new Error('Forecast request failed');
              return response.json();
            })
            .then(forecast => ({
              state: state,
              region: region.name,
              precip: forecast.properties.periods[0].probabilityOfPrecipitation.value || 0
            }))
        })
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
  });
}

function getRegionCoords(state, region) {
  const coords = {
    "MN-NW MN": { x: 50, y: 50 },
    "MN-NE MN": { x: 100, y: 50 },
    "MN-SW MN": { x: 50, y: 150 },
    "MN-SE MN": { x: 100, y: 150 },
    "MN-Central MN": { x: 75, y: 100 },
    "WI-NW WI": { x: 120, y: 60 },
    "WI-NE WI": { x: 170, y: 60 },
    "WI-SW WI": { x: 120, y: 160 },
    "WI-SE WI": { x: 170, y: 160 },
    "WI-Central WI": { x: 145, y: 110 },
    "IL-NW IL": { x: 190, y: 70 },
    "IL-NE IL": { x: 240, y: 70 },
    "IL-SW IL": { x: 190, y: 170 },
    "IL-SE IL": { x: 240, y: 170 },
    "IL-Central IL": { x: 215, y: 120 }
  };
  return coords[`${state}-${region}`] || { x: 0, y: 0 };
}

const userAgent = "PrecipitationBuddyApp (njusta@yahoo.com)";

colorMap(); // Call the colorMap function
console.log('Script loaded'); // Confirm script is loaded
