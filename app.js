const apiKey = '8e9639ed4d2e2462d31292fc723f9e44'; // <-- Updated API key
const btn = document.getElementById('getWeatherBtn');
const cityInput = document.getElementById('cityInput');
const resultDiv = document.getElementById('weatherResult');
const locationBtn = document.getElementById('getLocationBtn');
const celsiusBtn = document.getElementById('celsiusBtn');
const fahrenheitBtn = document.getElementById('fahrenheitBtn');
const forecastResult = document.getElementById('forecastResult');
const historyList = document.getElementById('historyList');
const hourlyForecastResult = document.getElementById('hourlyForecastResult');

let currentUnit = 'metric'; // 'metric' for Celsius, 'imperial' for Fahrenheit
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory') || '[]');

// Initialize
loadSearchHistory();

function formatTime(unix, timezone) {
    const date = new Date((unix + timezone) * 1000);
    return date.toUTCString().match(/\d{2}:\d{2}/)[0];
}

function formatDate(unix, timezone) {
    const date = new Date((unix + timezone) * 1000);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addToHistory(city) {
    if (!searchHistory.includes(city)) {
        searchHistory.unshift(city);
        if (searchHistory.length > 5) searchHistory.pop();
        localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));
        loadSearchHistory();
    }
}

function loadSearchHistory() {
    historyList.innerHTML = '';
    searchHistory.forEach(city => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.textContent = city;
        historyItem.addEventListener('click', () => {
            cityInput.value = city;
            btn.click();
        });
        historyList.appendChild(historyItem);
    });
}

async function fetchWeatherByCoords(lat, lon, city = '') {
    resultDiv.innerHTML = '<p>Loading...</p>';
    forecastResult.innerHTML = '';
    hourlyForecastResult.innerHTML = '';
    try {
        // Current weather
        const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`);
        if (!weatherRes.ok) throw new Error('Weather data not found');
        const data = await weatherRes.json();
        const weather = data.weather[0];
        
        const tempUnit = currentUnit === 'metric' ? '°C' : '°F';
        resultDiv.innerHTML = `
            <h2>${data.name}, ${data.sys.country}</h2>
            <div class="weather-icon">
                <img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" alt="${weather.description}" class="weather-img">
            </div>
            <p class="weather-desc">${weather.main} (${weather.description})</p>
            <p class="temp-main">${Math.round(data.main.temp)}${tempUnit}</p>
            <p class="temp-feels">Feels like: ${Math.round(data.main.feels_like)}${tempUnit}</p>
            <div class="temp-range">
                <span>Min: ${Math.round(data.main.temp_min)}${tempUnit}</span>
                <span>Max: ${Math.round(data.main.temp_max)}${tempUnit}</span>
            </div>
            <p>Humidity: ${data.main.humidity}%</p>
            <p>Wind: ${data.wind.speed} ${currentUnit === 'metric' ? 'm/s' : 'mph'}</p>
            <p>Sunrise: ${formatTime(data.sys.sunrise, data.timezone)} | Sunset: ${formatTime(data.sys.sunset, data.timezone)}</p>
        `;
        
        // 5-day forecast & hourly forecast
        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${currentUnit}`);
        if (forecastRes.ok) {
            const forecastData = await forecastRes.json();
            // 5-day forecast
            const dailyForecasts = forecastData.list.filter((item, index) => index % 8 === 0).slice(1, 6);
            forecastResult.innerHTML = `
                <h3>5-Day Forecast</h3>
                <div class="forecast-container">
                    ${dailyForecasts.map(day => {
                        const date = new Date(day.dt * 1000);
                        const weather = day.weather[0];
                        return `
                            <div class="forecast-day">
                                <div class="forecast-date">${formatDate(day.dt, forecastData.city.timezone)}</div>
                                <img src="https://openweathermap.org/img/wn/${weather.icon}.png" alt="${weather.description}">
                                <div class="forecast-temp">${Math.round(day.main.temp)}${tempUnit}</div>
                                <div class="forecast-desc">${weather.main}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            // Hourly forecast (next 8 intervals = 24 hours)
            const next8 = forecastData.list.slice(0, 8);
            hourlyForecastResult.innerHTML = `
                <h3>24-Hour Hourly Forecast</h3>
                <div class="hourly-forecast-container">
                    ${next8.map(hour => {
                        const date = new Date(hour.dt * 1000);
                        const hourStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const weather = hour.weather[0];
                        return `
                            <div class="hourly-forecast-item">
                                <div class="hourly-time">${hourStr}</div>
                                <img src="https://openweathermap.org/img/wn/${weather.icon}.png" alt="${weather.description}">
                                <div class="hourly-temp">${Math.round(hour.main.temp)}${tempUnit}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        document.body.style.background = getWeatherBackground(weather.main);
        if (city) addToHistory(city);
    } catch (err) {
        resultDiv.innerHTML = `<p>Error: ${err.message}</p>`;
    }
}

btn.addEventListener('click', async () => {
    const city = cityInput.value.trim();
    if (!city) {
        resultDiv.innerHTML = '<p>Please enter a city name.</p>';
        return;
    }
    resultDiv.innerHTML = '<p>Loading...</p>';
    try {
        // Step 1: Get coordinates from city name using Geocoding API
        const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`);
        if (!geoRes.ok) throw new Error('City not found');
        const geoData = await geoRes.json();
        if (!geoData.length) throw new Error('City not found');
        const { lat, lon } = geoData[0];
        await fetchWeatherByCoords(lat, lon, city);
    } catch (err) {
        resultDiv.innerHTML = `<p>Error: ${err.message}</p>`;
    }
});

locationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        resultDiv.innerHTML = '<p>Geolocation is not supported by your browser.</p>';
        return;
    }
    resultDiv.innerHTML = '<p>Getting your location...</p>';
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherByCoords(latitude, longitude);
        },
        (error) => {
            resultDiv.innerHTML = `<p>Could not get location: ${error.message}</p>`;
        }
    );
});

// Temperature unit toggle
celsiusBtn.addEventListener('click', () => {
    if (currentUnit !== 'metric') {
        currentUnit = 'metric';
        celsiusBtn.classList.add('active');
        fahrenheitBtn.classList.remove('active');
        // Refresh current weather if available
        if (resultDiv.innerHTML && !resultDiv.innerHTML.includes('Loading') && !resultDiv.innerHTML.includes('Error')) {
            // Re-fetch with new unit
            const city = cityInput.value.trim();
            if (city) btn.click();
        }
    }
});

fahrenheitBtn.addEventListener('click', () => {
    if (currentUnit !== 'imperial') {
        currentUnit = 'imperial';
        fahrenheitBtn.classList.add('active');
        celsiusBtn.classList.remove('active');
        // Refresh current weather if available
        if (resultDiv.innerHTML && !resultDiv.innerHTML.includes('Loading') && !resultDiv.innerHTML.includes('Error')) {
            // Re-fetch with new unit
            const city = cityInput.value.trim();
            if (city) btn.click();
        }
    }
});

function getWeatherBackground(main) {
    switch(main.toLowerCase()) {
        case 'clear': return 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)';
        case 'clouds': return 'linear-gradient(120deg, #d7d2cc 0%, #304352 100%)';
        case 'rain': return 'linear-gradient(120deg, #4e54c8 0%, #8f94fb 100%)';
        case 'thunderstorm': return 'linear-gradient(120deg, #232526 0%, #414345 100%)';
        case 'snow': return 'linear-gradient(120deg, #e0eafc 0%, #cfdef3 100%)';
        case 'drizzle': return 'linear-gradient(120deg, #89f7fe 0%, #66a6ff 100%)';
        case 'mist':
        case 'fog': return 'linear-gradient(120deg, #cfd9df 0%, #e2ebf0 100%)';
        default: return '#e0e7ff';
    }
} 