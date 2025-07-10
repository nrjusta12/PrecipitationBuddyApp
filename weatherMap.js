// Define state regions with coordinates
const stateRegions = {
  "MN": [{ name: "NW MN", lat: 47.5, lon: -95.0 }],
  "FL": [{ name: "SW FL", lat: 26.1, lon: -81.7 }],
  "TX": [{ name: "SE TX", lat: 29.76, lon: -95.38 }] // Updated to Houston area
};

// Define user agent
const userAgent = "PrecipitationBuddyApp (njusta@yahoo.com)";

// Define state outlines (simplified polygons for trial)
const stateOutlines = {
  "MN": [{ x: 50, y: 50 }, { x: 100, y: 50 }, { x: 120, y: 100 }, { x: 80, y: 150 }, { x: 50, y: 50 }],
  "FL": [{ x: 150, y: 50 }, { x: 200, y: 50 }, { x: 220, y: 100 }, { x: 180, y: 150 }, { x: 150, y: 50 }],
  "TX": [{ x: 250, y: 50 }, { x: 300, y: 50 }, { x: 320, y: 100 }, { x: 280, y: 150 }, { x: 250, y: 50 }]
};

// Function to handle state selection
function updateSelectedStates(selectedStates) {
  console.log('Selected states:', selectedStates);
  window.selectedRegions = Object.entries(stateRegions)
    .filter(([state]) => selectedStates.includes(state))
    .flatMap(([_, regions]) => regions);
  colorMap();
}

// Define getPrecipitation
async function getPrecipitation(regions) {
  console.log('Starting getPrecipitation at', new Date().toLocaleString());
  const promises = regions.map(region => {
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
            return { state: Object.keys(stateRegions).find(state => stateRegions[state].includes(region)), region: region.name, precip };
          })
          .catch(error => {
            console.error(`Fetch error for ${region.name}:`, error);
            return { state: Object.keys(stateRegions).find(state => stateRegions[state].includes(region)), region: region.name, precip: 0 };
          });
      })
      .catch(error => {
        console.error(`Points fetch error for ${region.name}:`, error);
        return { state: Object.keys(stateRegions).find(state => stateRegions[state].includes(region)), region: region.name, precip: 0 };
      });
  });
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
  console.log('Starting colorMap at', new Date().toLocaleString());
  const map = document.querySelector("#appMap");
  if (!map) {
    console.error('Canvas element #appMap not found');
    return;
  }
  const ctx = map.getContext("2d");
  if (!ctx) {
    console.error('Failed to get 2D context for #appMap');
    return;
  }
  ctx.clearRect(0, 0, map.width, map.height);
  getPrecipitation(window.selectedRegions || Object.values(stateRegions).flat()).then(data => {
    console.log('ColorMap data:', data);
    if (!data || data.length === 0) {
      console.error('No precipitation data received');
      return;
    }
    data.forEach(item => {
      console.log(`Precipitation value for ${item.region}: ${item.precip}`);
      const outline = stateOutlines[item.state];
      if (outline) {
        ctx.beginPath();
        ctx.moveTo(outline[0].x, outline[0].y);
        for (let i = 1; i < outline.length; i++) {
          ctx.lineTo(outline[i].x, outline[i].y);
        }
        ctx.closePath();
        let color;
        if (item.precip === 0) color = "white"; // Visible outline for 0in
        else if (item.precip > 0 && item.precip < 1) color = "lightgray";
        else if (item.precip <= 4) color = "lightblue";
        else if (item.precip <= 8) color = "mediumblue";
        else if (item.precip <= 12) color = "darkblue";
        else if (item.precip <= 18) color = "purple";
        else color = "red";
        ctx.strokeStyle = "black"; // Add outline for visibility
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.fillStyle = "black";
        const centroid = { x: outline.reduce((sum, p) => sum + p.x, 0) / outline.length, y: outline.reduce((sum, p) => sum + p.y, 0) / outline.length };
        ctx.fillText(`${item.precip.toFixed(1)}in`, centroid.x, centroid.y);
      }
    });
  }).catch(error => {
    console.error('ColorMap error:', error);
  });
}

// Initialize with default states
window.selectedRegions = Object.values(stateRegions).flat();
window.addEventListener('load', () => {
  console.log('Window loaded, calling colorMap');
  colorMap();
  // Add dummy state selection buttons
  const states = Object.keys(stateRegions);
  const controlDiv = document.createElement('div');
  controlDiv.style.position = 'absolute';
  controlDiv.style.top = '10px';
  controlDiv.style.left = '10px';
  states.forEach(state => {
    const button = document.createElement('button');
    button.textContent = state;
    button.style.margin = '5px';
    button.addEventListener('click', () => {
      let selected = window.selectedStates || [];
      if (selected.includes(state)) {
        selected = selected.filter(s => s !== state);
      } else {
        selected.push(state);
      }
      window.selectedStates = selected;
      updateSelectedStates(selected);
    });
    controlDiv.appendChild(button);
  });
  document.body.appendChild(controlDiv);
});
