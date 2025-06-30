// Define getPrecipitation outside of colorMap
async function getPrecipitation() {
  const promises = Object.entries(stateRegions).flatMap(([state, regions]) =>
    regions.map(region =>
      fetch(`https://api.weather.gov/points/${region.lat},${region.lon}`, { headers: { 'User-Agent': userAgent } })
        .then(response => response.json())
        .then(data => {
          console.log(data.properties.forecast); // Debug: Log the forecast URL
          return fetch(data.properties.forecast, { headers: { 'User-Agent': userAgent } })
            .then(response => {
              if (!response.ok) throw new Error('Forecast request failed');
              return response.json();
            })
            .then(forecast => ({
              state: state,
              region: region.name,
              precip: forecast.properties.periods[0].probabilityOfPrecipitation.value || 0
            }))
        })
    )
  );
  const results = await Promise.all(promises);
  return results;
}

// Define colorMap separately
function colorMap() {
  getPrecipitation().then(data => {
    console.log(data);
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