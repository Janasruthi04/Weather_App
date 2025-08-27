# Weather App — Pro Edition

A single-page weather web app split into clean folders for GitHub. **No features changed**, only separated into HTML, CSS, and JS files to look professional and be easy to maintain.

## ✨ Features (same as your original)
- Current weather by city/zip
- Geolocation ("📍 Current")
- 5-day forecast (noon snapshots)
- Hourly line chart (next 12 hours, 3-hour steps)
- Dynamic animated backgrounds by weather
- Glassmorphism UI
- Recent searches (localStorage)
- Light/Dark toggle
- City background via Unsplash Source

## 📂 Structure
```
weather-app-pro/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── assets/
```
*(assets folder reserved if you add icons later)*

## 🚀 Run Locally
Just open `index.html` in a browser. No build step required.

> This uses the OpenWeather API directly from the browser.

## 🔑 API Key
The app currently uses the same key from your original code:
```
6057db82d0c0b541b39508464eda7e3e
```
If you want to use your own key, edit `js/app.js`:
```js
const OPENWEATHER_API_KEY = 'YOUR_KEY_HERE';
```

## 🌐 Deploy on GitHub Pages
1. Create a new GitHub repo (e.g., `weather-app-pro`).
2. Upload all files/folders from this project.
3. Go to **Settings → Pages → Build and deployment**.
4. **Source**: Deploy from a branch → **Branch**: `main` → `/ (root)` → **Save**.
5. Your site will be live at: `https://<your-username>.github.io/weather-app-pro/`

## 🙌 Credit
Built by **Janasruthi N**.
