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

// Define getPrecipitation
async function getPrecipitation() {
  console.log('Starting getPrecipitation at', new Date().toLocaleString()); // Timestamp for start
  const promises = Object.entries(stateRegions).flatMap(([state, regions]) =>
    regions.map(region => {
      console.log(`Fetching for ${region.name} at ${region.lat},${region.lon}`);
      return fetch(`https://api.weather.gov/points/${region.lat},${region.lon}`, { headers: { 'User-Agent': userAgent } })
        .then(response => {
          if (!response.ok) {
            console.error(`Points API error for ${region.name}:`, response.status, response.statusText);
            throw new Error(`Points API failed for ${region.name}: ${response.status}`);
          }
          console.log(`Points response status for ${region.name}:`, response.status);
          return response.json();
        })
        .then(data => {
          console.log(`Points Data for ${region.name}:`, data);
          return fetch(data.properties.forecastHourly, { headers: { 'User-Agent': userAgent } })
            .then(response => {
              if (!response.ok) {
                console.error(`Hourly API error for ${region.name}:`, response.status, response.statusText);
                throw new Error(`Hourly API failed for ${region.name}: ${response.status}`);
              }
              console.log(`Hourly response status for ${region.name}:`, response.status);
              return response.json();
            })
            .then(hourly => {
              console.log(`Hourly Data for ${region.name}:`, hourly);
              console.log(`Hourly Periods Structure for ${region.name}:`, JSON.stringify(hourly.properties.periods, null, 2));
              let maxProb = 0;
              for (let period of hourly.properties.periods) {
                const prob = period.probabilityOfPrecipitation?.value || 0;
                if (prob > maxProb) maxProb = prob;
              }
              let precip = 0;
              if (maxProb >= 70) precip = 0.5 + (maxProb - 70) * 0.01;
              else if (maxProb >= 50) precip = 0.3 + (maxProb - 50) * 0.005;
              else if (maxProb >= 30) precip = 0.1 + (maxProb - 30) * 0.002;
              console.log(`Max probability for ${region.name}: ${maxProb}%, Precip: ${precip}in`);
              return { state, region: region.name, precip };
            })
            .catch(error => {
              console.error(`Fetch error for ${region.name}:`, error);
              return { state, region: region.name, precip: 0 };
            });
        })
        .catch(error => {
          console.error(`Points fetch error for ${region.name}:`, error);
          return { state, region: region.name, precip: 0 };
        });
    })
  );
  try {
    const results = await Promise.all(promises);
    console.log('Precipitation results:', results);
    return results.map(result => ({ ...result, state: result.state || 'Unknown', region: result.region || 'Unknown' }));
  } catch (error) {
    console.error('Promise.all error:', error);
    return [];
  }
}

// Define colorMap
function colorMap() {
  console.log('Starting colorMap at', new Date().toLocaleString()); // Timestamp for start
  const map = document.querySelector("#usMap");
  if (!map) {
    console.error('Canvas element #usMap not found');
    return;
  }
  const ctx = map.getContext("2d");
  if (!ctx) {
    console.error('Failed to get 2D context for #usMap');
    return;
  }
  ctx.clearRect(0, 0, map.width, map.height);
  getPrecipitation().then(data => {
    console.log('ColorMap data:', data);
    if (!data || data.length === 0) {
      console.error('No precipitation data received');
      return;
    }
    data.forEach(item => {
      console.log(`Precipitation value for ${item.region}: ${item.precip}`);
      let color;
      if (item.precip === 0) return;
      else if (item.precip > 0 && item.precip < 1) color = "lightgray";
      else if (item.precip <= 4) color = "lightblue";
      else if (item.precip <= 8) color = "mediumblue";
      else if (item.precip <= 12) color = "darkblue";
      else if (item.precip <= 18) color = "purple";
      else color = "red";
      const coords = getRegionCoords(item.state, item.region);
      ctx.fillStyle = color;
      ctx.fillRect(coords.x, coords.y, 50, 50);
      ctx.fillStyle = "black";
      ctx.fillText(`${item.precip.toFixed(1)}in`, coords.x + 10, coords.y + 20);
    });
  }).catch(error => {
    console.error('ColorMap error:', error);
  });
}

function getRegionCoords(state, region) {
  const coords = {
    "MN-NW MN": { x: 50, y: 50 },
    "FL-SW FL": { x: 100, y: 50 }
  };
  return coords[`${state}-${region}`] || { x: 0, y: 0 };
}

// Initialize
console.log('Script loaded at', new Date().toLocaleString()); // Confirm script load
window.addEventListener('load', () => {
  console.log('Window loaded, calling colorMap');
  colorMap();
});
