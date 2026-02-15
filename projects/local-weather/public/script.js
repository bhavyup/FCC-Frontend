(() => {
  'use strict';

  // ─── Elements ─────────────────────────────────────────
  const canvas      = document.getElementById('canvas');
  const particles   = document.getElementById('particles');
  const loadingEl   = document.getElementById('loading');
  const weatherEl   = document.getElementById('weather');
  const errorEl     = document.getElementById('error');
  const errorText   = document.getElementById('error-text');
  const retryBtn    = document.getElementById('error-retry');

  const locNameEl   = document.getElementById('loc-name');
  const tempEl      = document.getElementById('temp');
  const tempUnitEl  = document.getElementById('temp-unit');
  const condIconEl  = document.getElementById('cond-icon');
  const condTextEl  = document.getElementById('cond-text');
  const feelsEl     = document.getElementById('d-feels');
  const humidityEl  = document.getElementById('d-humidity');
  const windEl      = document.getElementById('d-wind');
  const pressureEl  = document.getElementById('d-pressure');

  const unitToggle  = document.getElementById('unit-toggle');
  const unitC       = document.getElementById('unit-c');
  const unitF       = document.getElementById('unit-f');

  // ─── State ────────────────────────────────────────────
  let useFahrenheit = true;
  let weatherData   = null;

  // ─── API Endpoint ─────────────────────────────────────
  const API_BASE = 'https://weather-proxy.freecodecamp.rocks/api/current';

  // ─── Weather Themes ───────────────────────────────────
  // Map OpenWeatherMap "main" condition to gradient + particle type
  const themes = {
    Clear: {
      gradTop: '#2d1b4e', gradMid: '#e8734a', gradBot: '#f5c76e',
      particles: 'sun'
    },
    Clouds: {
      gradTop: '#1a1e2e', gradMid: '#2a3040', gradBot: '#3d4556',
      particles: 'clouds'
    },
    Rain: {
      gradTop: '#0c1220', gradMid: '#1a2540', gradBot: '#1e3050',
      particles: 'rain'
    },
    Drizzle: {
      gradTop: '#141d2e', gradMid: '#1e2d44', gradBot: '#2a3d58',
      particles: 'rain'
    },
    Thunderstorm: {
      gradTop: '#0a0c14', gradMid: '#121828', gradBot: '#1a2030',
      particles: 'rain'
    },
    Snow: {
      gradTop: '#1e2230', gradMid: '#3a4050', gradBot: '#5a6070',
      particles: 'snow'
    },
    Mist: {
      gradTop: '#1c1e24', gradMid: '#2a2e38', gradBot: '#3e424e',
      particles: 'mist'
    },
    Fog: {
      gradTop: '#1c1e24', gradMid: '#2a2e38', gradBot: '#3e424e',
      particles: 'mist'
    },
    Haze: {
      gradTop: '#2a2520', gradMid: '#3a3228', gradBot: '#504838',
      particles: 'mist'
    },
    default: {
      gradTop: '#1a1a2e', gradMid: '#16213e', gradBot: '#0f3460',
      particles: 'none'
    }
  };

  // ─── Temperature-aware gradient adjustment ────────────
  // Hot days: warmer gradients. Cold days: cooler/icy tones.
  function getTheme(condition, tempC) {
    const base = themes[condition] || themes.default;

    // Override for extreme temps
    if (tempC > 35) {
      return { ...base, gradTop: '#4a1a0a', gradMid: '#c8522a', gradBot: '#e89060' };
    }
    if (tempC > 28 && condition === 'Clear') {
      return { ...base, gradTop: '#3a1530', gradMid: '#d45a3a', gradBot: '#f0a860' };
    }
    if (tempC < -5) {
      return { ...base, gradTop: '#0a1020', gradMid: '#1a2a4a', gradBot: '#3a5070' };
    }
    if (tempC < 5) {
      return { ...base, gradTop: '#101828', gradMid: '#1e3048', gradBot: '#3a5068' };
    }

    return base;
  }

  // ─── Apply Theme ──────────────────────────────────────

  function applyTheme(theme) {
    canvas.style.background =
      'linear-gradient(160deg, ' + theme.gradTop + ', ' + theme.gradMid + ' 45%, ' + theme.gradBot + ')';

    clearParticles();

    switch (theme.particles) {
      case 'rain':  spawnRain(); break;
      case 'snow':  spawnSnow(); break;
      case 'clouds': spawnClouds(); break;
      case 'sun':   spawnSun(); break;
      case 'mist':  spawnMist(); break;
    }
  }

  // ─── Particle Generators ──────────────────────────────

  function clearParticles() {
    particles.innerHTML = '';
  }

  function spawnRain() {
    for (let i = 0; i < 60; i++) {
      const drop = document.createElement('div');
      drop.className = 'rain-drop';
      drop.style.left   = Math.random() * 100 + '%';
      drop.style.height  = (12 + Math.random() * 14) + 'px';
      drop.style.animationDuration = (0.5 + Math.random() * 0.6) + 's';
      drop.style.animationDelay    = Math.random() * 2 + 's';
      drop.style.opacity = 0.2 + Math.random() * 0.4;
      particles.appendChild(drop);
    }
  }

  function spawnSnow() {
    for (let i = 0; i < 40; i++) {
      const flake = document.createElement('div');
      flake.className = 'snow-flake';
      flake.style.left   = Math.random() * 100 + '%';
      const size = 3 + Math.random() * 5;
      flake.style.width  = size + 'px';
      flake.style.height = size + 'px';
      flake.style.animationDuration = (4 + Math.random() * 6) + 's';
      flake.style.animationDelay    = Math.random() * 5 + 's';
      particles.appendChild(flake);
    }
  }

  function spawnClouds() {
    for (let i = 0; i < 5; i++) {
      const puff = document.createElement('div');
      puff.className = 'cloud-puff';
      puff.style.top    = (5 + Math.random() * 40) + '%';
      puff.style.width  = (120 + Math.random() * 200) + 'px';
      puff.style.height = (40 + Math.random() * 40) + 'px';
      puff.style.animationDuration = (25 + Math.random() * 35) + 's';
      puff.style.animationDelay    = Math.random() * 20 + 's';
      particles.appendChild(puff);
    }
  }

  function spawnSun() {
    const ray = document.createElement('div');
    ray.className = 'sun-ray';
    particles.appendChild(ray);
    // Also add a couple of soft clouds for texture
    for (let i = 0; i < 3; i++) {
      const puff = document.createElement('div');
      puff.className = 'cloud-puff';
      puff.style.top = (8 + Math.random() * 25) + '%';
      puff.style.width  = (100 + Math.random() * 150) + 'px';
      puff.style.height = (30 + Math.random() * 30) + 'px';
      puff.style.animationDuration = (30 + Math.random() * 30) + 's';
      puff.style.animationDelay    = Math.random() * 15 + 's';
      puff.style.opacity = '0.03';
      particles.appendChild(puff);
    }
  }

  function spawnMist() {
    for (let i = 0; i < 3; i++) {
      const m = document.createElement('div');
      m.className = 'mist-layer';
      m.style.bottom = (i * 8) + '%';
      m.style.animationDuration = (10 + i * 4) + 's';
      m.style.opacity = 0.06 + i * 0.02;
      particles.appendChild(m);
    }
  }

  // ─── Conversions ──────────────────────────────────────

  function cToF(c)  { return (c * 9 / 5) + 32; }
  function fToC(f)  { return (f - 32) * 5 / 9; }
  function round(n) { return Math.round(n * 10) / 10; }

  // ─── Render Weather ───────────────────────────────────

  function renderWeather(data) {
    weatherData = data;

    const city    = data.name || 'Unknown';
    const country = data.sys && data.sys.country ? ', ' + data.sys.country : '';
    locNameEl.textContent = city + country;

    const tempC = data.main.temp;
    const feelsC = data.main.feels_like;
    const displayTemp  = useFahrenheit ? round(cToF(tempC))  : round(tempC);
    const displayFeels = useFahrenheit ? round(cToF(feelsC)) : round(feelsC);
    const unit = useFahrenheit ? '°F' : '°C';

    tempEl.textContent     = Math.round(displayTemp);
    tempUnitEl.textContent = unit;
    feelsEl.textContent    = Math.round(displayFeels) + unit;

    humidityEl.textContent = data.main.humidity + '%';
    windEl.textContent     = round(data.wind.speed) + ' m/s';
    pressureEl.textContent = data.main.pressure + ' hPa';

    // Condition
    const weather = data.weather[0];
    condTextEl.textContent = weather.description;
    condIconEl.src = weather.icon;
    condIconEl.alt = weather.description;

    // Apply theme
    const theme = getTheme(weather.main, tempC);
    applyTheme(theme);

    // Show weather
    loadingEl.style.display = 'none';
    errorEl.style.display   = 'none';
    weatherEl.style.display = 'flex';
  }

  function showError(msg) {
    loadingEl.style.display = 'none';
    weatherEl.style.display = 'none';
    errorText.textContent = msg;
    errorEl.style.display = 'flex';
  }

  // ─── Fetch Weather ────────────────────────────────────

  function fetchWeather(lat, lon) {
    loadingEl.style.display = 'flex';
    weatherEl.style.display = 'none';
    errorEl.style.display   = 'none';

    fetch(API_BASE + '?lat=' + lat + '&lon=' + lon)
      .then(res => {
        if (!res.ok) throw new Error('Weather API error');
        return res.json();
      })
      .then(data => {
        if (!data || !data.main) throw new Error('Invalid data');
        renderWeather(data);
      })
      .catch(err => {
        console.error(err);
        showError('Unable to fetch weather data. Please try again.');
      });
  }

  // ─── Geolocation ──────────────────────────────────────

  function getLocation() {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }

    loadingEl.style.display = 'flex';

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error(err);
        // Fallback: try IP-based (New York as absolute fallback)
        showError('Location access denied. Please allow location access and try again.');
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  }

  // ─── Unit Toggle ──────────────────────────────────────

  unitToggle.addEventListener('click', () => {
    useFahrenheit = !useFahrenheit;
    unitC.classList.toggle('active', !useFahrenheit);
    unitF.classList.toggle('active', useFahrenheit);

    if (weatherData) renderWeather(weatherData);
  });

  // ─── Retry ────────────────────────────────────────────

  retryBtn.addEventListener('click', getLocation);

  // ─── Init ─────────────────────────────────────────────
  getLocation();
})();
