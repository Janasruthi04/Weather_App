// ====== CONFIG ======
const OPENWEATHER_API_KEY = '6057db82d0c0b541b39508464eda7e3e'; // <-- replace with your OpenWeatherMap API key if needed
const ICON = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;

// Unsplash Source (no key) for city background (best-effort image)
const setCityImage = (cityLike) => {
  const el = document.getElementById('heroBg');
  if(!cityLike) { el.style.opacity = .2; return; }
  el.style.backgroundImage = `url(https://source.unsplash.com/1600x900/?${encodeURIComponent(cityLike)})`;
  el.style.opacity = .25;
};

// ====== STATE ======
let chart; // Chart.js instance

// ====== HELPERS ======
const byId = (id)=> document.getElementById(id);
const fmtTime = (ts, tzOffsetSec) => {
  const d = new Date((ts + tzOffsetSec) * 1000);
  return d.toUTCString().match(/\d{2}:\d{2}/)[0];
};
const fmtDate = (ts, tzOffsetSec) => {
  const d = new Date((ts + tzOffsetSec) * 1000);
  return d.toUTCString().slice(0, 16);
};
const titleCase = (s) => s.replace(/\b\w/g, m => m.toUpperCase());

const saveRecent = (q) => {
  const key = 'recentWeatherQueries';
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const deduped = [q, ...items.filter(i => i.toLowerCase() !== q.toLowerCase())].slice(0,6);
  localStorage.setItem(key, JSON.stringify(deduped));
  renderRecent();
};
const renderRecent = () => {
  const key = 'recentWeatherQueries';
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  const wrap = byId('recent');
  wrap.innerHTML = '';
  items.forEach(i => {
    const chip = document.createElement('div');
    chip.className = 'chip'; chip.textContent = i; chip.onclick = () => search(i);
    wrap.appendChild(chip);
  })
};

// Weather-class background
const setWeatherTheme = (main) => {
  const b = document.body; b.classList.remove('sunny','cloudy','rainy','storm','snow');
  const m = (main||'').toLowerCase();
  if(m.includes('clear')) b.classList.add('sunny');
  else if(m.includes('snow')) b.classList.add('snow');
  else if(m.includes('thunder')) b.classList.add('storm');
  else if(m.includes('rain') || m.includes('drizzle')) b.classList.add('rainy');
  else b.classList.add('cloudy');
};

// ====== API CALLS ======
async function fetchCurrentByQuery(q){
  // supports city name, zip, etc. OpenWeather handles many forms.
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const res = await fetch(url);
  if(!res.ok){ throw new Error('Location not found. Try city, city,country or zip.'); }
  return res.json();
}
async function fetchCurrentByCoords(lat, lon){
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const res = await fetch(url); if(!res.ok) throw new Error('Could not fetch by coordinates.'); return res.json();
}
async function fetchForecast(lat, lon){
  // 5-day / 3-hour forecast
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const res = await fetch(url); if(!res.ok) throw new Error('Forecast not available.'); return res.json();
}

// ====== RENDERERS ======
function renderCurrent(data){
  const el = byId('current');
  const { name, sys, main, weather, wind, coord, timezone } = data;
  const w = weather?.[0] || { description:'', icon:'01d', main:'' };
  setWeatherTheme(w.main);

  el.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; justify-content:space-between">
      <div>
        <h2>${name || '—'}, ${sys?.country || ''}</h2>
        <div class="meta">${titleCase(w.description)} · ${fmtDate(Math.floor(Date.now()/1000), timezone||0)}</div>
      </div>
      <img src="${ICON(w.icon)}" alt="icon" width="72" height="72"/>
    </div>
    <div class="grid">
      <div class="kv"><div class="label">Temperature</div><div class="val">${Math.round(main.temp)}°C</div></div>
      <div class="kv"><div class="label">Feels Like</div><div class="val">${Math.round(main.feels_like)}°C</div></div>
      <div class="kv"><div class="label">Humidity</div><div class="val">${main.humidity}%</div></div>
      <div class="kv"><div class="label">Wind</div><div class="val">${(wind.speed).toFixed(1)} m/s</div></div>
      <div class="kv"><div class="label">Pressure</div><div class="val">${main.pressure} hPa</div></div>
      <div class="kv"><div class="label">Coords</div><div class="val">${coord.lat.toFixed(2)}, ${coord.lon.toFixed(2)}</div></div>
    </div>
  `;
  setCityImage(name || 'city');
  byId('updated').textContent = `Updated: ${new Date().toLocaleTimeString()}`;
}

function renderForecast(data){
  const wrap = byId('forecast');
  wrap.innerHTML = '';
  // 5-day: choose noon entries
  const daily = data.list.filter(x => x.dt_txt.includes('12:00:00')).slice(0,5);
  daily.forEach(item => {
    const d = new Date(item.dt_txt);
    const day = d.toLocaleDateString(undefined,{weekday:'short'});
    const temp = Math.round(item.main.temp);
    const icon = item.weather?.[0]?.icon || '01d';
    const desc = titleCase(item.weather?.[0]?.description || '');
    const div = document.createElement('div');
    div.className = 'day';
    div.innerHTML = `<div style="font-weight:600">${day}</div><img src="${ICON(icon)}" alt=""><div style="margin-top:6px">${temp}°C</div><div class="meta" style="margin-top:2px">${desc}</div>`;
    wrap.appendChild(div);
  });

  // Hourly: next 12 hours (3h steps → next 4 points)
  const slice = data.list.slice(0, 4);
  const labels = slice.map(i => new Date(i.dt_txt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
  const temps = slice.map(i => i.main.temp);
  drawChart(labels, temps);
}

function drawChart(labels, temps){
  const ctx = byId('hourlyChart').getContext('2d');
  if(chart){ chart.destroy(); }
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Temp (°C)', data: temps, tension:.35, pointRadius:4, borderWidth:2 }]},
    options: {
      plugins:{ legend:{ display:true } },
      scales:{ x:{ grid:{ display:false } }, y:{ grid:{ display:true } } },
    }
  });
}

// ====== INTERACTIONS ======
async function search(q){
  try{
    const query = (q || '').trim();
    if(!query){ byId('current').innerHTML = '<p class="meta">Type a city to search.</p>'; return; }
    byId('current').innerHTML = '<p class="meta">Loading current weather…</p>';
    const cur = await fetchCurrentByQuery(query);
    renderCurrent(cur);
    saveRecent(query);
    byId('forecast').innerHTML = '<p class="meta">Loading forecast…</p>';
    const fc = await fetchForecast(cur.coord.lat, cur.coord.lon);
    renderForecast(fc);
  }catch(err){
    byId('current').innerHTML = `<p class="meta">${err.message}</p>`;
    byId('forecast').innerHTML = '';
  }
}

// Debounce search by Enter
const input = byId('q');
input.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); search(input.value); }});
byId('searchBtn').onclick = ()=> search(input.value);

// Geolocation
byId('geoBtn').onclick = async ()=>{
  if(!navigator.geolocation){ alert('Geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const { latitude:lat, longitude:lon } = pos.coords;
      byId('current').innerHTML = '<p class="meta">Loading current location…</p>';
      const cur = await fetchCurrentByCoords(lat, lon);
      renderCurrent(cur);
      const fc = await fetchForecast(lat, lon);
      renderForecast(fc);
      saveRecent(`${cur.name}`);
    }catch(e){ byId('current').innerHTML = `<p class=meta>${e.message}</p>`; }
  }, err=> alert('Location permission denied or unavailable.'))
};

// Theme toggle
const themeSwitch = byId('themeSwitch');
const applyTheme = (t)=>{ document.body.classList.toggle('dark', t==='dark'); localStorage.setItem('theme', t); };
themeSwitch.addEventListener('click', ()=>{
  const t = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme(t);
});
applyTheme(localStorage.getItem('theme')||'light');

// Info modal
const infoModal = byId('infoModal');
byId('infoBtn').onclick = ()=> infoModal.classList.add('open');
byId('closeInfo').onclick = ()=> infoModal.classList.remove('open');

// 初 render recents
renderRecent();
