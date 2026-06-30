/* ==========================================================================
   Weatherline
   Fetches live conditions from Open-Meteo (no API key required) based on
   either a free-text place search or the browser's geolocation API.
   ========================================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     DOM references
     --------------------------------------------------------------------- */
  const panelEl        = document.querySelector('.panel');
  const searchForm      = document.getElementById('searchForm');
  const locationInput   = document.getElementById('locationInput');
  const locateBtn        = document.getElementById('locateBtn');
  const statusRegion     = document.getElementById('statusRegion');
  const emptyState       = document.getElementById('emptyState');
  const readingSection   = document.getElementById('readingSection');
  const statsGrid        = document.getElementById('statsGrid');

  const weatherIconEl    = document.getElementById('weatherIcon');
  const temperatureEl    = document.getElementById('temperature');
  const unitCBtn         = document.getElementById('unitC');
  const unitFBtn         = document.getElementById('unitF');
  const conditionEl      = document.getElementById('condition');
  const placeNameEl      = document.getElementById('placeName');
  const dateTimeEl       = document.getElementById('dateTime');

  const statFeelsEl      = document.getElementById('statFeels');
  const statHumidityEl   = document.getElementById('statHumidity');
  const statWindEl       = document.getElementById('statWind');
  const windArrowEl      = document.getElementById('windArrow');
  const statPressureEl   = document.getElementById('statPressure');
  const statUvEl         = document.getElementById('statUv');
  const statHighLowEl    = document.getElementById('statHighLow');

  /* ---------------------------------------------------------------------
     App state
     --------------------------------------------------------------------- */
  const state = {
    unit: 'C',     // 'C' | 'F' — only affects display, raw data stays Celsius
    tempC: null,
    feelsC: null,
    highC: null,
    lowC: null,
  };

  /* ---------------------------------------------------------------------
     WMO weather code lookup
     https://open-meteo.com/en/docs  (current.weather_code)
     --------------------------------------------------------------------- */
  const WEATHER_CODES = {
    0:  { label: 'Clear sky',                 category: 'clear'  },
    1:  { label: 'Mainly clear',               category: 'clear'  },
    2:  { label: 'Partly cloudy',               category: 'cloudy' },
    3:  { label: 'Overcast',                   category: 'cloudy' },
    45: { label: 'Fog',                         category: 'fog'    },
    48: { label: 'Depositing rime fog',         category: 'fog'    },
    51: { label: 'Light drizzle',               category: 'rain'   },
    53: { label: 'Moderate drizzle',            category: 'rain'   },
    55: { label: 'Dense drizzle',               category: 'rain'   },
    56: { label: 'Light freezing drizzle',      category: 'rain'   },
    57: { label: 'Dense freezing drizzle',      category: 'rain'   },
    61: { label: 'Slight rain',                 category: 'rain'   },
    63: { label: 'Moderate rain',               category: 'rain'   },
    65: { label: 'Heavy rain',                  category: 'rain'   },
    66: { label: 'Light freezing rain',         category: 'rain'   },
    67: { label: 'Heavy freezing rain',         category: 'rain'   },
    71: { label: 'Slight snow fall',            category: 'snow'   },
    73: { label: 'Moderate snow fall',          category: 'snow'   },
    75: { label: 'Heavy snow fall',             category: 'snow'   },
    77: { label: 'Snow grains',                 category: 'snow'   },
    80: { label: 'Slight rain showers',         category: 'rain'   },
    81: { label: 'Moderate rain showers',       category: 'rain'   },
    82: { label: 'Violent rain showers',        category: 'rain'   },
    85: { label: 'Slight snow showers',         category: 'snow'   },
    86: { label: 'Heavy snow showers',          category: 'snow'   },
    95: { label: 'Thunderstorm',                category: 'storm'  },
    96: { label: 'Thunderstorm, slight hail',    category: 'storm'  },
    99: { label: 'Thunderstorm, heavy hail',     category: 'storm'  },
  };

  function weatherInfoFor(code) {
    return WEATHER_CODES[code] || { label: 'Unknown conditions', category: 'cloudy' };
  }

  /* ---------------------------------------------------------------------
     Icon set — inline SVG, line-art, themed via currentColor
     --------------------------------------------------------------------- */
  const ICONS = {
    sun: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="12" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.2"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="32" y1="6" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="58"/><line x1="6" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="58" y2="32"/><line x1="13.5" y1="13.5" x2="19" y2="19"/><line x1="45" y1="45" x2="50.5" y2="50.5"/><line x1="13.5" y1="50.5" x2="19" y2="45"/><line x1="45" y1="19" x2="50.5" y2="13.5"/></g></svg>`,

    moon: `<svg viewBox="0 0 64 64"><path d="M40 8a24 24 0 1 0 16 40A20 20 0 0 1 40 8Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

    cloudSun: `<svg viewBox="0 0 64 64"><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="23" cy="19" r="7" fill="currentColor" fill-opacity="0.2"/><line x1="23" y1="4" x2="23" y2="8"/><line x1="9" y1="19" x2="13" y2="19"/><line x1="12.5" y1="8.5" x2="15.3" y2="11.3"/></g><path d="M18 46a9 9 0 0 1 .8-17.9A12 12 0 0 1 42 30a8 8 0 0 1-1 16H18Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

    cloudMoon: `<svg viewBox="0 0 64 64"><path d="M27 16a7 7 0 1 0 5 11.9A8.5 8.5 0 0 1 27 16Z" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M18 46a9 9 0 0 1 .8-17.9A12 12 0 0 1 42 30a8 8 0 0 1-1 16H18Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

    cloud: `<svg viewBox="0 0 64 64"><path d="M18 42a9 9 0 0 1 1-17.9A12 12 0 0 1 42 28a8 8 0 0 1-1 16H18Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>`,

    fog: `<svg viewBox="0 0 64 64"><path d="M20 34a9 9 0 0 1 1-17.9A12 12 0 0 1 44 20a8 8 0 0 1-1 16H20Z" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="14" y1="46" x2="50" y2="46"/><line x1="10" y1="54" x2="54" y2="54"/></g></svg>`,

    rain: `<svg viewBox="0 0 64 64"><path d="M18 34a9 9 0 0 1 1-17.9A12 12 0 0 1 42 20a8 8 0 0 1-1 16H18Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="22" y1="44" x2="18" y2="54"/><line x1="32" y1="44" x2="28" y2="54"/><line x1="42" y1="44" x2="38" y2="54"/></g></svg>`,

    snow: `<svg viewBox="0 0 64 64"><path d="M18 34a9 9 0 0 1 1-17.9A12 12 0 0 1 42 20a8 8 0 0 1-1 16H18Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="22" y1="46" x2="22" y2="54"/><line x1="18.5" y1="48" x2="25.5" y2="52"/><line x1="25.5" y1="48" x2="18.5" y2="52"/><line x1="38" y1="46" x2="38" y2="54"/><line x1="34.5" y1="48" x2="41.5" y2="52"/><line x1="41.5" y1="48" x2="34.5" y2="52"/></g></svg>`,

    storm: `<svg viewBox="0 0 64 64"><path d="M18 32a9 9 0 0 1 1-17.9A12 12 0 0 1 42 18a8 8 0 0 1-1 16H18Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M33 40l-9 13h7l-3 9 11-15h-7l3-7Z" fill="currentColor" fill-opacity="0.3" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`,
  };

  function iconFor(category, isDay) {
    switch (category) {
      case 'clear':  return isDay ? ICONS.sun : ICONS.moon;
      case 'cloudy': return isDay ? ICONS.cloudSun : ICONS.cloudMoon;
      case 'fog':    return ICONS.fog;
      case 'rain':   return ICONS.rain;
      case 'snow':   return ICONS.snow;
      case 'storm':  return ICONS.storm;
      default:       return ICONS.cloud;
    }
  }

  /* ---------------------------------------------------------------------
     Small formatting helpers
     --------------------------------------------------------------------- */
  const COMPASS_POINTS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

  function degToCompass(deg) {
    const idx = Math.round(deg / 22.5) % 16;
    return COMPASS_POINTS[idx];
  }

  function cToF(c) {
    return (c * 9) / 5 + 32;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  // current.time from Open-Meteo (timezone=auto) is the location's own local
  // wall-clock time as a plain string, e.g. "2026-06-30T14:30" — parsed
  // manually so the browser's own timezone never gets mixed in.
  function formatLocalTime(isoLocalString) {
    const [datePart, timePart] = isoLocalString.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = timePart.split(':').map(Number);
    const utcStamp = new Date(Date.UTC(y, m - 1, d));
    const weekday = utcStamp.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const month = utcStamp.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    return `${weekday}, ${d} ${month} · ${pad2(hh)}:${pad2(mm)}`;
  }

  function formatPlaceLabel(result) {
    const parts = [result.name];
    if (result.admin1 && result.admin1 !== result.name) parts.push(result.admin1);
    if (result.country) parts.push(result.country);
    return parts.join(', ');
  }

  /* ---------------------------------------------------------------------
     UI helpers
     --------------------------------------------------------------------- */
  function setStatus(message, isError = false) {
    statusRegion.textContent = message;
    statusRegion.classList.toggle('is-error', isError);
  }

  function setLoading(isLoading) {
    panelEl.classList.toggle('is-loading', isLoading);
    locationInput.disabled = isLoading;
    locateBtn.disabled = isLoading;
  }

  function setUnit(unit) {
    if (state.unit === unit) return;
    state.unit = unit;
    unitCBtn.classList.toggle('is-active', unit === 'C');
    unitCBtn.setAttribute('aria-pressed', String(unit === 'C'));
    unitFBtn.classList.toggle('is-active', unit === 'F');
    unitFBtn.setAttribute('aria-pressed', String(unit === 'F'));
    if (state.tempC !== null) updateTemperatureDisplay();
  }

  function updateTemperatureDisplay() {
    const useF = state.unit === 'F';
    const temp = useF ? cToF(state.tempC) : state.tempC;
    const feels = useF ? cToF(state.feelsC) : state.feelsC;
    const hi = useF ? cToF(state.highC) : state.highC;
    const lo = useF ? cToF(state.lowC) : state.lowC;
    const unitLabel = useF ? '°F' : '°C';

    temperatureEl.textContent = `${Math.round(temp)}°`;
    statFeelsEl.textContent = `${Math.round(feels)}${unitLabel}`;
    statHighLowEl.textContent = `${Math.round(hi)}° / ${Math.round(lo)}°`;
  }

  /* ---------------------------------------------------------------------
     Rendering
     --------------------------------------------------------------------- */
  function render(weatherData, placeLabel) {
    const current = weatherData.current;
    const daily = weatherData.daily;
    const info = weatherInfoFor(current.weather_code);
    const isDay = current.is_day === 1;

    document.body.dataset.weather = info.category;
    document.body.dataset.daytime = isDay ? 'day' : 'night';

    state.tempC = current.temperature_2m;
    state.feelsC = current.apparent_temperature;
    state.highC = daily && daily.temperature_2m_max ? daily.temperature_2m_max[0] : current.temperature_2m;
    state.lowC = daily && daily.temperature_2m_min ? daily.temperature_2m_min[0] : current.temperature_2m;

    updateTemperatureDisplay();

    weatherIconEl.innerHTML = iconFor(info.category, isDay);
    conditionEl.textContent = info.label;
    placeNameEl.textContent = placeLabel;
    dateTimeEl.textContent = formatLocalTime(current.time);

    statHumidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;
    statWindEl.textContent = `${Math.round(current.wind_speed_10m)} km/h ${degToCompass(current.wind_direction_10m)}`;
    windArrowEl.style.transform = `rotate(${current.wind_direction_10m}deg)`;
    statPressureEl.textContent = `${Math.round(current.pressure_msl)} hPa`;

    const uv = daily && daily.uv_index_max ? daily.uv_index_max[0] : null;
    statUvEl.textContent = uv !== null && uv !== undefined ? uv.toFixed(1) : '—';

    emptyState.hidden = true;
    readingSection.hidden = false;
    statsGrid.hidden = false;
  }

  /* ---------------------------------------------------------------------
     Network calls
     --------------------------------------------------------------------- */
  async function geocodeCity(query) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding request failed');
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    const r = data.results[0];
    return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country, admin1: r.admin1 };
  }

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Reverse geocoding failed');
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || 'Your location';
      return data.countryName ? `${city}, ${data.countryName}` : city;
    } catch (err) {
      return 'Your location';
    }
  }

  async function fetchWeather(lat, lon) {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl',
      daily: 'temperature_2m_max,temperature_2m_min,uv_index_max',
      timezone: 'auto',
      forecast_days: '1',
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!res.ok) throw new Error('Weather request failed');
    return res.json();
  }

  /* ---------------------------------------------------------------------
     Orchestration
     --------------------------------------------------------------------- */
  async function loadWeatherForCity(query) {
    setLoading(true);
    setStatus('Searching…');
    try {
      const place = await geocodeCity(query);
      if (!place) {
        setStatus('Location not found — check the spelling and try again.', true);
        return;
      }
      const weather = await fetchWeather(place.lat, place.lon);
      render(weather, formatPlaceLabel(place));
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus('Connection lost — try again in a moment.', true);
    } finally {
      setLoading(false);
    }
  }

  function loadWeatherForCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setStatus("Geolocation isn't supported in this browser — try searching instead.", true);
      return;
    }

    setLoading(true);
    setStatus('Locating you…');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const [placeLabel, weather] = await Promise.all([
            reverseGeocode(latitude, longitude),
            fetchWeather(latitude, longitude),
          ]);
          render(weather, placeLabel);
          setStatus('');
        } catch (err) {
          console.error(err);
          setStatus('Connection lost — try again in a moment.', true);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        const messages = {
          1: 'Location access denied — search for a place instead.',
          2: 'Location unavailable — search for a place instead.',
          3: 'Location request timed out — search for a place instead.',
        };
        setStatus(messages[err.code] || "Couldn't get your location — search for a place instead.", true);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  /* ---------------------------------------------------------------------
     Event wiring
     --------------------------------------------------------------------- */
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = locationInput.value.trim();
    if (!query) return;
    loadWeatherForCity(query);
  });

  locateBtn.addEventListener('click', loadWeatherForCurrentLocation);
  unitCBtn.addEventListener('click', () => setUnit('C'));
  unitFBtn.addEventListener('click', () => setUnit('F'));
})();