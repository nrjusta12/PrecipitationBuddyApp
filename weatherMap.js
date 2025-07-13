// Define state regions with multiple coordinates
const stateRegions = {
  "MN": [
    { name: "NW MN", lat: 47.5, lon: -95.0 },
    { name: "SE MN", lat: 43.7, lon: -93.1 }
  ],
  "FL": [
    { name: "SW FL", lat: 26.1, lon: -81.7 },
    { name: "NE FL", lat: 30.3, lon: -81.4 }
  ],
  "TX": [
    { name: "SE TX", lat: 29.76, lon: -95.38 },
    { name: "NW TX", lat: 33.0, lon: -100.0 }
  ],
  "CA": [
    { name: "N CA", lat: 38.0, lon: -120.0 },
    { name: "S CA", lat: 34.0, lon: -118.0 }
  ],
  "NY": [
    { name: "N NY", lat: 43.0, lon: -75.0 },
    { name: "S NY", lat: 40.7, lon: -73.9 }
  ]
};

// Define user agent
const userAgent = "PrecipitationBuddyApp (njusta@yahoo.com)";

// Function to handle state selection
function updateSelectedStates(selectedStates) {
  console.log('Selected states:', selectedStates);
  window.selectedStates = selectedStates; // Ensure global update
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
        if (!response.ok) throw new Error(`Points API failed for ${region.name}: ${response.status}`);
        return response.json();
      })
      .then(data => fetch(data.properties.forecastHourly, { headers: { 'User-Agent': userAgent } }))
      .then(response => {
        if (!response.ok) throw new Error(`Hourly API failed for ${region.name}: ${response.status}`);
        return response.json();
      })
      .then(hourly => {
        let maxProb = 0;
        for (let period of hourly.properties.periods) {
          const prob = period.probabilityOfPrecipitation?.value || 0;
          if (prob > maxProb) maxProb = prob;
        }
        let precip = 0;
        if (maxProb >= 70) precip = 0.5 + (maxProb - 70) * 0.01;
        else if (maxProb >= 50) precip = 0.25 + (maxProb - 50) * 0.005;
        else if (maxProb >= 30) precip = 0.01 + (maxProb - 30) * 0.002;
        console.log(`Max probability for ${region.name}: ${maxProb}%, Precip: ${precip}in`);
        return { state: Object.keys(stateRegions).find(state => stateRegions[state].includes(region)), region: region.name, precip };
      })
      .catch(error => {
        console.error(`Fetch error for ${region.name}:`, error);
        return { state: Object.keys(stateRegions).find(state => stateRegions[state].includes(region)), region: region.name, precip: 0 };
      });
  });
  try {
    const results = await Promise.all(promises);
    console.log('Precipitation results:', results);
    return results;
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
    console.error('SVG element #appMap not found');
    return;
  }
  getPrecipitation(window.selectedRegions || Object.values(stateRegions).flat()).then(data => {
    console.log('ColorMap data:', data);
    if (!data || data.length === 0) {
      console.error('No precipitation data received');
      return;
    }
    // Clear existing text elements
    map.querySelectorAll('text').forEach(text => text.remove());
    data.forEach(item => {
      console.log(`Precipitation value for ${item.region}: ${item.precip}`);
      const statePath = map.querySelector(`#${item.state}`);
      if (statePath) {
        let color;
        if (item.precip === 0 || item.precip <= 0.1) color = "lightgray";
        else if (item.precip <= 0.5) color = "#b3e5fc";
        else if (item.precip <= 1) color = "#42a5f5";
        else if (item.precip <= 2) color = "#1e88e5";
        else if (item.precip <= 4) color = "#ab47bc";
        else color = "#e57373";
        statePath.style.fill = color;
        statePath.style.opacity = window.selectedStates?.includes(item.state) ? 1 : 0;
        const centroid = { x: statePath.getBBox().x + statePath.getBBox().width / 2, y: statePath.getBBox().y + statePath.getBBox().height / 2 };
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("id", `${item.state}-${item.region}-text`);
        text.setAttribute("x", centroid.x);
        text.setAttribute("y", centroid.y);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("fill", "black");
        text.textContent = `${item.precip.toFixed(2)}in`;
        map.appendChild(text);
      }
    });
  }).catch(error => {
    console.error('ColorMap error:', error);
  });
}

// Initialize with default states
window.selectedStates = [];
window.addEventListener('load', () => {
  console.log('Window loaded, calling colorMap');
  colorMap();
  const states = Object.keys(stateRegions);
  const controlDiv = document.querySelector('.controls');
  states.forEach(state => {
    const button = document.createElement('button');
    button.textContent = state;
    button.style.margin = '5px';
    button.addEventListener('click', () => {
      let selected = window.selectedStates || [];
      if (selected.includes(state)) {
        selected = selected.filter(s => s !== state); // Remove state
      } else {
        selected.push(state); // Add state
      }
      window.selectedStates = selected;
      updateSelectedStates(selected);
    });
    controlDiv.appendChild(button);
  });
});
