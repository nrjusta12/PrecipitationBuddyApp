async function getPrecipitation() {
  console.log('Starting getPrecipitation');
  const promises = Object.entries(stateRegions).flatMap(([state, regions]) =>
    regions.map(region => {
      console.log(`Fetching for ${region.name} at ${region.lat},${region.lon}`);
      return fetch(`https://api.weather.gov/points/${region.lat},${region.lon}`, { headers: { 'User-Agent': userAgent } })
        .then(response => {
          console.log('Points response status:', response.status);
          return response.json();
        })
        .then(data => {
          console.log('Points Data:', data);
          return fetch(data.properties.forecastHourly, { headers: { 'User-Agent': userAgent } })
            .then(response => {
              console.log('Hourly response status:', response.status);
              if (!response.ok) throw new Error('Hourly request failed');
              return response.json();
            })
            .then(hourly => {
              console.log('Hourly Data:', hourly);
              console.log('Hourly Periods Structure:', JSON.stringify(hourly.properties.periods, null, 2));
              // Ensure maximum probability is selected
              let maxProb = 0;
              for (let period of hourly.properties.periods) {
                const prob = period.probabilityOfPrecipitation?.value || 0;
                if (prob > maxProb) maxProb = prob;
              }
              let precip = 0;
              if (maxProb >= 70) precip = 0.5 + (maxProb - 70) * 0.01;
              else if (maxProb >= 50) precip = 0.3 + (maxProb - 50) * 0.005;
              else if (maxProb >= 30) precip = 0.1 + (maxProb - 30) * 0.002;
              return { state, region: region.name, precip };
            })
            .catch(error => {
              console.log('Fetch error caught:', error);
              return { state, region: region.name, precip: 0 };
            });
        })
        .catch(error => {
          console.log('Points fetch error:', error);
          return { state, region: region.name, precip: 0 };
        });
    })
  );
  const results = await Promise.all(promises);
  console.log('Precipitation results:', results);
  return results.map(result => ({ ...result, state: result.state || 'Unknown', region: result.region || 'Unknown' }));
}
