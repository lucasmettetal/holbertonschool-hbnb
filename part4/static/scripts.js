/* ===== CONFIGURATION ===== */

const API_BASE_URL = 'http://127.0.0.1:5000/api/v1';
const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`;
const PLACES_ENDPOINT = `${API_BASE_URL}/places/`;

/* ===== COOKIE HELPERS ===== */

function setCookie(name, value, days = 7) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split(';');

  for (let i = 0; i < cookies.length; i += 1) {
    const cookie = cookies[i].trim();

    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }

  return null;
}

/* ===== GENERIC MESSAGE HELPERS ===== */

function displayError(message) {
  const errorContainer = document.getElementById('error-message');

  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

function clearError() {
  const errorContainer = document.getElementById('error-message');

  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
  }
}

function displaySuccess(message) {
  const successContainer = document.getElementById('success-message');

  if (successContainer) {
    successContainer.textContent = message;
    successContainer.style.display = 'block';
  }
}

function clearSuccess() {
  const successContainer = document.getElementById('success-message');

  if (successContainer) {
    successContainer.textContent = '';
    successContainer.style.display = 'none';
  }
}

/* ===== LOGIN PAGE ===== */

async function loginUser(email, password) {
  try {
    const response = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      const errorMessage = data.message || 'Login failed. Please check your credentials.';
      displayError(errorMessage);
      return;
    }

    const token = data.access_token || data.token;

    if (!token) {
      displayError('No token received from server.');
      return;
    }

    setCookie('token', token);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Login error:', error);
    displayError('Network error. Please try again.');
  }
}

function initLoginPage() {
  const loginForm = document.getElementById('login-form');

  if (!loginForm) {
    return;
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    clearError();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (!emailInput || !passwordInput) {
      displayError('Form elements not found.');
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      displayError('Email and password are required.');
      return;
    }

    loginUser(email, password);
  });
}

/* ===== INDEX PAGE ===== */

let allPlaces = [];
let currentSearchTerm = '';
let currentPriceFilter = 'all';
let selectedAmenities = [];
let selectedTravelers = '1';
let currentCheckIn = '';
let currentCheckOut = '';

const CITY_DATA = {
  Paris: { country: 'France', lat: 48.8566, lng: 2.3522 },
  Annecy: { country: 'France', lat: 45.8992, lng: 6.1294 },
  Amsterdam: { country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  Barcelona: { country: 'Spain', lat: 41.3851, lng: 2.1734 },
  Brussels: { country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  Budapest: { country: 'Hungary', lat: 47.4979, lng: 19.0402 },
  Florence: { country: 'Italy', lat: 43.7696, lng: 11.2558 },
  Geneva: { country: 'Switzerland', lat: 46.2044, lng: 6.1432 },
  Lisbon: { country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  Lyon: { country: 'France', lat: 45.7640, lng: 4.8357 },
  Milan: { country: 'Italy', lat: 45.4642, lng: 9.1900 },
  Munich: { country: 'Germany', lat: 48.1351, lng: 11.5820 },
  Nice: { country: 'France', lat: 43.7102, lng: 7.2620 },
  Porto: { country: 'Portugal', lat: 41.1579, lng: -8.6291 },
  Prague: { country: 'Czech Republic', lat: 50.0755, lng: 14.4378 },
  Rome: { country: 'Italy', lat: 41.9028, lng: 12.4964 },
  Seville: { country: 'Spain', lat: 37.3891, lng: -5.9845 },
  Valencia: { country: 'Spain', lat: 39.4699, lng: -0.3763 },
  Vienna: { country: 'Austria', lat: 48.2082, lng: 16.3738 },
  Zurich: { country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  Madrid: { country: 'Spain', lat: 40.4168, lng: -3.7038 }
};

const EUROPEAN_CITIES = Object.keys(CITY_DATA);

const STREET_NAMES = [
  'Rue de la Paix', 'Via Roma', 'Calle Mayor', 'Hauptstrasse',
  'Koningsplein', 'Rua Augusta', 'Váci utca', 'Bahnhofstrasse',
  'Gran Via', 'Corso Vittorio', 'Rue du Faubourg', 'Passeig de Gràcia'
];

const PLACE_TITLES = [
  'Cozy Studio',
  'Modern Loft',
  'Lake View Apartment',
  'Sunny Apartment',
  'Elegant Duplex',
  'Urban Retreat',
  'Quiet Cabin',
  'Charming Flat',
  'Panoramic Penthouse',
  'Riverside Home',
  'Boutique Suite'
];

const PLACE_DESCRIPTIONS = [
  'A bright and comfortable stay close to local attractions and transport.',
  'Stylish interiors, natural light and a calm atmosphere for relaxing trips.',
  'Perfect for short stays with practical amenities and a warm design.',
  'An inviting space in a walkable neighborhood with everything nearby.',
  'A peaceful getaway with modern comforts and a polished finish.',
  'Freshly renovated space near cafes, museums and local markets.'
];

const AMENITY_OPTIONS = [
  'Wifi',
  'Pool',
  'Parking',
  'Balcony',
  'Air conditioning',
  'Kitchen',
  'Garden',
  'Mountain view',
  'City center',
  'Pets allowed',
  'Workspace',
  'Washer',
  'Self check-in'
];

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80'
];

const BADGES = [null, null, null, null, 'Guest favorite', 'Top rated', 'New'];

const REVIEWER_NAMES = [
  'Sarah', 'James', 'Amelia', 'Oliver', 'Isabella', 'Liam',
  'Emma', 'Noah', 'Charlotte', 'Ethan', 'Mia', 'Sophie', 'Lucas', 'Anna'
];

const REVIEW_COMMENTS = [
  'Absolutely loved this place. The location was perfect and the host was very responsive.',
  'Great value for money. Clean, well-equipped and exactly as described.',
  'A wonderful stay. Very comfortable and the neighborhood felt safe and vibrant.',
  'The apartment was spotless and the check-in process was seamless.',
  'Fantastic host, great communication throughout. Would definitely come back.',
  'Beautiful space with great natural light. Very close to transport links.',
  'Cozy and charming. Everything was well-maintained and the decor was lovely.',
  'Perfect for a short city break. Will definitely recommend to friends.',
  'We had a great time. The place was clean, stylish and in a brilliant location.',
  'Everything was as advertised. Simple, comfortable and great value.'
];

const STAY_DURATIONS = ['2 nights', '3 nights', '4 nights', '5 nights', '7 nights', '10 nights'];

const REVIEW_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function randomStat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

function generateReviewStats(overall) {
  const base = parseFloat(overall);
  return {
    overall: base,
    cleanliness: randomStat(Math.max(4.0, base - 0.3), Math.min(5.0, base + 0.2)),
    accuracy: randomStat(Math.max(4.0, base - 0.2), Math.min(5.0, base + 0.1)),
    checkin: randomStat(Math.max(4.0, base - 0.1), Math.min(5.0, base + 0.3)),
    communication: randomStat(Math.max(4.0, base - 0.2), Math.min(5.0, base + 0.3)),
    location: randomStat(Math.max(3.8, base - 0.5), Math.min(5.0, base + 0.1)),
    value: randomStat(Math.max(3.8, base - 0.4), Math.min(5.0, base + 0.1))
  };
}

function generateReviews(count) {
  const reviews = [];
  const shuffledNames = [...REVIEWER_NAMES].sort(() => Math.random() - 0.5).slice(0, count);
  const year = 2026;

  for (let i = 0; i < count; i += 1) {
    const name = shuffledNames[i];

    const month = Math.floor(Math.random() * 12);
    const reviewRating = Math.random() > 0.15 ? 5 : 4;

    reviews.push({
      username: name,
      date: `${REVIEW_MONTHS[month]} ${year}`,
      stayDuration: pickRandomItem(STAY_DURATIONS),
      rating: reviewRating,
      comment: pickRandomItem(REVIEW_COMMENTS)
    });
  }

  return reviews;
}

function pickFallbackImage() {
  return pickRandomItem(FALLBACK_IMAGES);
}

function generateRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `fallback-${Math.random().toString(36).slice(2, 11)}`;
}

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomAmenities() {
  const shuffled = [...AMENITY_OPTIONS].sort(() => Math.random() - 0.5);
  const count = 2 + Math.floor(Math.random() * 4);
  return shuffled.slice(0, count);
}

function createListingDetail(maxGuests) {
  const bedrooms = 1 + Math.floor(Math.random() * 3);
  const areaOptions = [
    'City center',
    'Near metro',
    'Quiet street',
    'Close to river',
    'Historic district'
  ];

  return `${maxGuests} guests · ${bedrooms} bedroom${bedrooms > 1 ? 's' : ''} · ${pickRandomItem(areaOptions)}`;
}

function randomDateOffset(baseDate, minDays, maxDays) {
  const result = new Date(baseDate);
  const offset = minDays + Math.floor(Math.random() * (maxDays - minDays + 1));
  result.setDate(result.getDate() + offset);
  return result.toISOString().slice(0, 10);
}

function generateRandomPlaces(count = 20) {
  const generatedPlaces = [];
  const today = new Date('2026-04-02');

  for (let index = 0; index < count; index += 1) {
    const title = pickRandomItem(PLACE_TITLES);
    const city = pickRandomItem(EUROPEAN_CITIES);
    const cityInfo = CITY_DATA[city];
    const description = pickRandomItem(PLACE_DESCRIPTIONS);
    const maxGuests = 1 + Math.floor(Math.random() * 6);
    const availableFrom = randomDateOffset(today, -15, 30);
    const availableTo = randomDateOffset(new Date(availableFrom), 45, 210);
    const streetNumber = 1 + Math.floor(Math.random() * 120);
    const street = pickRandomItem(STREET_NAMES);
    const latJitter = (Math.random() - 0.5) * 0.04;
    const lngJitter = (Math.random() - 0.5) * 0.04;

    generatedPlaces.push({
      id: generateRandomId(),
      name: `${title} in ${city}`,
      city,
      country: cityInfo.country,
      address: `${streetNumber} ${street}`,
      latitude: parseFloat((cityInfo.lat + latJitter).toFixed(5)),
      longitude: parseFloat((cityInfo.lng + lngJitter).toFixed(5)),
      price: Math.floor(Math.random() * (350 - 40 + 1)) + 40,
      description,
      details: createListingDetail(maxGuests),
      amenities: pickRandomAmenities(),
      image: pickFallbackImage(),
      rating: (Math.random() * (4.95 - 4.1) + 4.1).toFixed(2),
      host: pickRandomItem(['Emma', 'Lucas', 'Sofia', 'Noah', 'Chloe', 'Leo']),
      maxGuests,
      availableFrom,
      availableTo,
      badge: pickRandomItem(BADGES),
      reviewStats: generateReviewStats((Math.random() * (4.95 - 4.1) + 4.1).toFixed(2)),
      reviews: generateReviews(2 + Math.floor(Math.random() * 5))
    });
  }

  return generatedPlaces;
}

function normalizeAmenities(amenities) {
  if (!Array.isArray(amenities)) {
    return [];
  }

  return amenities
    .map((amenity) => {
      if (typeof amenity === 'string') {
        return amenity;
      }

      if (amenity && typeof amenity === 'object') {
        return amenity.name || amenity.label || amenity.title || '';
      }

      return '';
    })
    .filter(Boolean);
}

function normalizePlace(place) {
  return {
    id: place.id || generateRandomId(),
    name: place.name || 'Unnamed place',
    city: place.city || place.location || 'Unknown location',
    price: place.price_by_night ?? place.price ?? null,
    description: place.description || 'No description available',
    details: place.details || place.detail || place.short_detail || place.summary || null,
    amenities: normalizeAmenities(place.amenities),
    image: place.image || place.image_url || place.photo || pickFallbackImage(),
    rating: place.rating ?? null,
    host: place.host || place.host_name || place.owner || null,
    maxGuests: place.maxGuests || place.max_guests || null,
    availableFrom: place.availableFrom || place.available_from || null,
    availableTo: place.availableTo || place.available_to || null,
    badge: place.badge || null,
    country: place.country || null,
    address: place.address || null,
    latitude: place.latitude ?? place.lat ?? null,
    longitude: place.longitude ?? place.lng ?? place.lon ?? null
  };
}

function applyFilters() {
  let filtered = [...allPlaces];

  // Destination search: match city, name, or description
  if (currentSearchTerm) {
    const term = currentSearchTerm.toLowerCase();
    filtered = filtered.filter(function (place) {
      const text = [place.name, place.city, place.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(term);
    });
  }

  // Max price filter
  if (currentPriceFilter !== 'all') {
    const maxPrice = parseInt(currentPriceFilter, 10);
    filtered = filtered.filter(function (place) {
      const price = typeof place.price === 'string' ? parseInt(place.price, 10) : place.price;
      if (Number.isNaN(price) || price === undefined || price === null) {
        return false;
      }
      return price <= maxPrice;
    });
  }

  // Quick filter chips (amenities)
  if (selectedAmenities.length > 0) {
    const selectedLower = selectedAmenities.map(function (a) { return a.toLowerCase(); });
    filtered = filtered.filter(function (place) {
      const placeAmenities = normalizeAmenities(place.amenities).map(function (a) {
        return a.toLowerCase();
      });
      return selectedLower.every(function (a) { return placeAmenities.includes(a); });
    });
  }

  // Date availability filter
  if (currentCheckIn || currentCheckOut) {
    filtered = filtered.filter(function (place) {
      if (!place.availableFrom || !place.availableTo) {
        return true;
      }
      if (currentCheckIn && currentCheckIn < place.availableFrom) {
        return false;
      }
      if (currentCheckOut && currentCheckOut > place.availableTo) {
        return false;
      }
      return true;
    });
  }

  // Travelers filter
  const travelers = selectedTravelers === '5+' ? 5 : parseInt(selectedTravelers, 10);
  if (!Number.isNaN(travelers)) {
    filtered = filtered.filter(function (place) {
      if (!place.maxGuests) {
        return true;
      }
      return travelers <= place.maxGuests;
    });
  }

  displayPlaces(filtered);
}


function checkAuthentication() {
  const loginLink = document.getElementById('login-link');
  const token = getCookie('token');

  if (loginLink) {
    loginLink.style.display = token ? 'none' : 'inline-block';
  }

  return token;
}

async function fetchPlaces() {
  try {
    clearError();

    const token = getCookie('token');
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(PLACES_ENDPOINT, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      displayError(`Failed to load places: ${response.status}`);
      return;
    }

    let data = [];
    try {
      data = await response.json();
    } catch (error) {
      displayError('Invalid server response.');
      return;
    }

    let places = [];

    if (Array.isArray(data)) {
      places = data;
    } else if (Array.isArray(data.places)) {
      places = data.places;
    } else if (Array.isArray(data.results)) {
      places = data.results;
    } else if (Array.isArray(data.data)) {
      places = data.data;
    }

    const normalizedPlaces = places.map(normalizePlace);

    if (normalizedPlaces.length === 0) {
      allPlaces = generateRandomPlaces(20);
      try {
        localStorage.setItem('fallbackPlaces', JSON.stringify(allPlaces));
      } catch (storageError) {
        console.warn('localStorage unavailable:', storageError);
      }
    } else {
      allPlaces = normalizedPlaces;
    }

    applyFilters();
  } catch (error) {
    console.error('Error fetching places:', error);
    displayError('Network error. Unable to load places.');
  }
}

function displayPlaces(places) {
  const placesList = document.getElementById('places-list');

  if (!placesList) {
    return;
  }

  placesList.innerHTML = '';

  if (!places || places.length === 0) {
    placesList.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; padding:40px; color:#717171;">No places found.</p>';
    return;
  }

  places.forEach(function (place) {
    const card = document.createElement('article');
    card.className = 'place-card';

    const placeName = place.name || 'Unnamed place';
    const price = place.price_by_night ?? place.price ?? 'N/A';
    const location = place.city || place.location || 'Unknown location';
    const placeId = place.id || '';
    const rawAmenities = normalizeAmenities(place.amenities);
    const amenities = rawAmenities.slice(0, 3);
    const extraAmenities = Math.max(0, rawAmenities.length - amenities.length);
    const image = place.image || pickFallbackImage();
    const ratingValue = place.rating || '4.8';
    const detail = place.details || place.detail || place.description || '2 guests · 1 bedroom · City center';

    const amenitiesMarkup = amenities.length > 0
      ? `${amenities.map(function (amenity) { return `<span class="amenity-pill">${amenity}</span>`; }).join('')}${extraAmenities > 0 ? `<span class="amenity-more">+${extraAmenities} more</span>` : ''}`
      : '<span class="amenity-more">No amenities listed</span>';

    const availabilityLine = (place.availableFrom && place.availableTo)
      ? `<p class="availability-line">Available ${place.availableFrom} – ${place.availableTo}</p>`
      : '';

    const maxGuestsLine = place.maxGuests
      ? `<p class="max-guests-line">Up to ${place.maxGuests} guest${place.maxGuests > 1 ? 's' : ''}</p>`
      : '';

    const badgeHtml = place.badge
      ? `<span class="card-badge">${place.badge}</span>`
      : '';

    card.innerHTML = `
      <a class="card-link" href="place.html?id=${placeId}" aria-label="View details for ${placeName}">
        <div class="card-image-wrapper">
          <img class="place-image" src="${image}" alt="${placeName}" loading="lazy">
          ${badgeHtml}
        </div>
        <div class="place-card-content">
          <div class="city-row">
            <p class="city">${location}</p>
            <span class="rating">★ ${ratingValue}</span>
          </div>
          <h2>${placeName}</h2>
          <p class="listing-detail">${detail}</p>
          ${maxGuestsLine}
          <div class="price-row">
            <p class="price">$${price}<span class="price-unit"> / night</span></p>
          </div>
          <div class="amenities-preview">${amenitiesMarkup}</div>
          ${availabilityLine}
          <span class="details-button">View Details</span>
        </div>
      </a>
    `;

    placesList.appendChild(card);
  });
}

function setupSearchFilter() {
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('booking-search-btn');

  if (!searchInput) {
    return;
  }

  let searchDebounce = null;
  searchInput.addEventListener('input', function () {
    currentSearchTerm = this.value.trim();
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(applyFilters, 250);
  });

  if (searchButton) {
    searchButton.addEventListener('click', function () {
      currentSearchTerm = searchInput.value.trim();
      applyFilters();
    });
  }
}

function setupBookingDates() {
  const checkInInput = document.getElementById('check-in-date');
  const checkOutInput = document.getElementById('check-out-date');
  const nightsCount = document.getElementById('nights-count');

  if (!checkInInput || !checkOutInput) {
    return;
  }

  const updateDates = function () {
    const checkInDate = checkInInput.value ? new Date(checkInInput.value) : null;
    const checkOutDate = checkOutInput.value ? new Date(checkOutInput.value) : null;

    if (checkInInput.value) {
      checkOutInput.min = checkInInput.value;
    } else {
      checkOutInput.min = '';
    }

    if (checkInDate && checkOutDate && checkOutDate < checkInDate) {
      checkOutInput.value = checkInInput.value;
    }

    currentCheckIn = checkInInput.value || '';
    currentCheckOut = checkOutInput.value || '';

    if (checkInInput.value && checkOutInput.value && nightsCount) {
      const start = new Date(checkInInput.value);
      const end = new Date(checkOutInput.value);
      const oneDay = 24 * 60 * 60 * 1000;
      const nights = Math.round((end - start) / oneDay);

      nightsCount.textContent = nights > 0 ? `${nights} night${nights > 1 ? 's' : ''} selected` : '';
    } else if (nightsCount) {
      nightsCount.textContent = '';
    }

    applyFilters();
  };

  checkInInput.addEventListener('change', updateDates);
  checkOutInput.addEventListener('change', updateDates);
}

function setupTravelersSelector() {
  const travelersSelect = document.getElementById('travelers-select');

  if (!travelersSelect) {
    return;
  }

  selectedTravelers = travelersSelect.value;
  travelersSelect.addEventListener('change', function () {
    selectedTravelers = this.value;
    applyFilters();
  });
}

function setupQuickFilters() {
  const chips = document.querySelectorAll('.quick-filter-chip');

  if (!chips || chips.length === 0) {
    return;
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', function () {
      const amenity = this.dataset.amenity;

      if (!amenity) {
        return;
      }

      if (selectedAmenities.includes(amenity)) {
        selectedAmenities = selectedAmenities.filter((selectedAmenity) => selectedAmenity !== amenity);
        this.classList.remove('active');
      } else {
        selectedAmenities.push(amenity);
        this.classList.add('active');
      }

      applyFilters();
    });
  });
}

function setupPriceFilter() {
  const filterSelect = document.getElementById('price-filter');

  if (!filterSelect) {
    return;
  }

  filterSelect.addEventListener('change', function () {
    currentPriceFilter = this.value;
    applyFilters();
  });
}

/* ===== PLACE DETAILS PAGE ===== */

let _leafletMap = null;

function getPlaceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function checkAuthenticationPlace() {
  const addReviewSection = document.getElementById('add-review');
  const token = getCookie('token');

  if (addReviewSection) {
    addReviewSection.style.display = token ? 'block' : 'none';
  }

  return token;
}

function findFallbackPlace(placeId) {
  try {
    const raw = localStorage.getItem('fallbackPlaces');
    if (!raw) {
      return null;
    }
    const places = JSON.parse(raw);
    if (!Array.isArray(places)) {
      return null;
    }
    return places.find(function (p) {
      return String(p.id) === String(placeId);
    }) || null;
  } catch (error) {
    console.warn('Could not read fallbackPlaces from localStorage:', error);
    return null;
  }
}

function useFallbackOrError(placeId, message) {
  const fallback = findFallbackPlace(placeId);
  if (fallback) {
    displayPlaceDetails(fallback);
  } else {
    displayPlaceError(message);
  }
}

async function fetchPlaceDetails(token, placeId) {
  try {
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${PLACES_ENDPOINT}${placeId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      useFallbackOrError(placeId, `Place not found (${response.status}).`);
      return;
    }

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      useFallbackOrError(placeId, 'Invalid server response.');
      return;
    }

    let place = data;

    if (data.place && typeof data.place === 'object') {
      place = data.place;
    } else if (data.result && typeof data.result === 'object') {
      place = data.result;
    } else if (data.data && typeof data.data === 'object') {
      place = data.data;
    }

    displayPlaceDetails(place);
  } catch (error) {
    console.error('Error fetching place details:', error);
    useFallbackOrError(placeId, 'Network error. Unable to load place details.');
  }
}

function statBar(label, value) {
  const pct = Math.round((value / 5) * 100);
  return `
    <div class="review-stat-row">
      <span class="review-stat-label">${label}</span>
      <div class="review-stat-track"><div class="review-stat-fill" style="width:${pct}%"></div></div>
      <span class="review-stat-value">${value.toFixed(1)}</span>
    </div>`;
}

function displayPlaceDetails(place) {
  const container = document.getElementById('place-details');

  if (!container) {
    return;
  }

  const name = place.name || 'Unnamed place';
  const description = place.description || 'No description available';
  const price = place.price_by_night ?? place.price ?? 'N/A';
  const host = place.host || place.host_name || place.owner || 'Unknown host';
  const location = place.city || place.location || 'Unknown location';
  const rating = place.rating || null;
  const image = place.image || place.image_url || place.photo || pickFallbackImage();
  const details = place.details || place.detail || null;
  const maxGuests = place.maxGuests || place.max_guests || null;
  const availableFrom = place.availableFrom || place.available_from || null;
  const availableTo = place.availableTo || place.available_to || null;
  const amenities = normalizeAmenities(place.amenities);
  const reviewStats = place.reviewStats || null;
  const reviewList = Array.isArray(place.reviews) ? place.reviews : [];

  const amenitiesHtml = amenities.length > 0
    ? amenities.map(function (a) { return `<span class="amenity-pill detail-amenity">${a}</span>`; }).join('')
    : '<p class="no-data-note">No amenities listed.</p>';

  let reviewSummaryHtml = '';
  if (reviewStats) {
    const count = reviewList.length;
    const stars = Math.round(reviewStats.overall);
    const starsHtml = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    reviewSummaryHtml = `
      <div class="review-summary">
        <div class="review-summary-overall">
          <span class="review-overall-score">${reviewStats.overall.toFixed(2)}</span>
          <div class="review-overall-stars">${starsHtml}</div>
          <p class="review-overall-count">${count} review${count !== 1 ? 's' : ''}</p>
        </div>
        <div class="review-summary-stats">
          ${statBar('Cleanliness', reviewStats.cleanliness)}
          ${statBar('Accuracy', reviewStats.accuracy)}
          ${statBar('Check-in', reviewStats.checkin)}
          ${statBar('Communication', reviewStats.communication)}
          ${statBar('Location', reviewStats.location)}
          ${statBar('Value', reviewStats.value)}
        </div>
      </div>`;
  }

  let reviewCardsHtml = '';
  if (reviewList.length > 0) {
    reviewCardsHtml = reviewList.map(function (review) {
      const username = review.username || review.user_name || review.user || 'Anonymous';
      const comment = review.comment || review.text || 'No comment';
      const initial = username.charAt(0).toUpperCase();
      const date = review.date || '';
      const stay = review.stayDuration || '';
      const meta = [date, stay].filter(Boolean).join(' · ');
      const starCount = Math.min(5, Math.max(1, parseInt(review.rating, 10) || 5));
      const starsHtml = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);

      return `
        <article class="detail-review-card">
          <div class="review-card-header">
            <div class="reviewer-avatar">${initial}</div>
            <div class="reviewer-meta">
              <p class="reviewer-name">${username}</p>
              ${meta ? `<p class="reviewer-date">${meta}</p>` : ''}
            </div>
            <div class="reviewer-stars">${starsHtml}</div>
          </div>
          <p class="review-comment">${comment}</p>
        </article>`;
    }).join('');
  } else {
    reviewCardsHtml = '<p class="no-data-note">No reviews yet. Be the first to share your experience!</p>';
  }

  const reviewsHtml = reviewSummaryHtml + (reviewList.length > 0 ? `<div class="detail-reviews">${reviewCardsHtml}</div>` : reviewCardsHtml);

  const country = place.country || null;
  const address = place.address || null;

  const locationMeta = [address, location, country].filter(Boolean).join(', ');
  const mapBodyHtml = `
    <p class="detail-location-meta">${locationMeta}</p>
    <div id="map" class="detail-map"></div>
    <p id="map-unavailable-msg" class="no-data-note" style="display:none;">Location map unavailable.</p>`;

  const ratingBadge = rating
    ? `<span class="detail-rating-badge">★ ${rating}</span>`
    : '';

  const infoLine = details
    ? `<p class="detail-info-line">${details}</p>`
    : '';

  const guestsLine = maxGuests
    ? `<p class="detail-guests">Up to ${maxGuests} guest${maxGuests > 1 ? 's' : ''}</p>`
    : '';

  const availabilityHtml = (availableFrom && availableTo)
    ? `<p class="detail-availability">Available ${availableFrom} – ${availableTo}</p>`
    : '';

  container.innerHTML = `
    <div class="detail-hero">
      <img class="detail-hero-img" src="${image}" alt="${name}">
    </div>
    <div class="detail-main">
      <div class="detail-title-row">
        <h1 class="detail-title">${name}</h1>
        ${ratingBadge}
      </div>
      <p class="detail-location">${location}</p>
      ${infoLine}
      ${guestsLine}
      ${availabilityHtml}
      <div class="detail-price-host">
        <span class="detail-price">$${price}<span class="detail-price-unit"> / night</span></span>
        <span class="detail-host">Hosted by <strong>${host}</strong></span>
      </div>
      <div class="detail-section">
        <h2 class="detail-section-title">About this place</h2>
        <p class="detail-description">${description}</p>
      </div>
      <div class="detail-section">
        <h2 class="detail-section-title">What this place offers</h2>
        <div class="detail-amenities">${amenitiesHtml}</div>
      </div>
      <div class="detail-section">
        <h2 class="detail-section-title">Guest reviews</h2>
        ${reviewsHtml}
      </div>
      <div class="detail-section">
        <h2 class="detail-section-title">Where the property is located</h2>
        ${mapBodyHtml}
      </div>
    </div>
  `;

  setTimeout(function () { initMap(place); }, 120);
}

function initMap(place) {
  const mapEl = document.getElementById('map');
  const unavailableMsg = document.getElementById('map-unavailable-msg');

  if (!mapEl) {
    return;
  }

  if (typeof window.L === 'undefined') {
    console.error('Leaflet is not loaded.');
    mapEl.style.display = 'none';
    if (unavailableMsg) {
      unavailableMsg.style.display = 'block';
      unavailableMsg.textContent = 'Location map unavailable.';
    }
    return;
  }

  const rawLat = place.latitude != null ? place.latitude : place.lat;
  const rawLng = place.longitude != null ? place.longitude : (place.lng != null ? place.lng : place.lon);
  const lat = parseFloat(rawLat);
  const lng = parseFloat(rawLng);

  if (rawLat == null || rawLng == null || !isFinite(lat) || !isFinite(lng)) {
    mapEl.style.display = 'none';
    if (unavailableMsg) {
      unavailableMsg.style.display = 'block';
      unavailableMsg.textContent = 'Location map unavailable.';
    }
    return;
  }

  if (_leafletMap) {
    _leafletMap.remove();
    _leafletMap = null;
  }

  _leafletMap = L.map(mapEl).setView([lat, lng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(_leafletMap);

  L.marker([lat, lng])
    .addTo(_leafletMap)
    .bindPopup(place.name || 'This property')
    .openPopup();

  setTimeout(function () {
    if (_leafletMap) {
      _leafletMap.invalidateSize();
    }
  }, 250);
}

function displayPlaceError(message) {
  const errorContainer = document.getElementById('error-message');

  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

function initPlacePage() {
  const placeId = getPlaceIdFromURL();

  if (!placeId) {
    displayPlaceError('No place ID provided in URL.');
    return;
  }

  const token = checkAuthenticationPlace();
  fetchPlaceDetails(token, placeId);

  const addReviewLink = document.getElementById('add-review-link');
  if (addReviewLink) {
    addReviewLink.href = `add_review.html?id=${placeId}`;
  }
}

/* ===== ADD REVIEW PAGE ===== */

function checkAuthenticationReview() {
  const token = getCookie('token');

  if (!token) {
    window.location.href = 'index.html';
    return null;
  }

  return token;
}

function displayReviewError(message) {
  const errorContainer = document.getElementById('error-message');

  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

function clearReviewError() {
  const errorContainer = document.getElementById('error-message');

  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
  }
}

function displayReviewSuccess(message) {
  const successContainer = document.getElementById('success-message');

  if (successContainer) {
    successContainer.textContent = message;
    successContainer.style.display = 'block';
  }
}

function clearReviewSuccess() {
  const successContainer = document.getElementById('success-message');

  if (successContainer) {
    successContainer.textContent = '';
    successContainer.style.display = 'none';
  }
}

async function submitReview(token, placeId, reviewData) {
  try {
    const response = await fetch(`${PLACES_ENDPOINT}${placeId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(reviewData)
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      const errorMessage = data.message || 'Failed to submit review.';
      displayReviewError(errorMessage);
      return;
    }

    displayReviewSuccess('Review submitted successfully! Redirecting...');

    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
      reviewForm.reset();
    }

    setTimeout(() => {
      window.location.href = `place.html?id=${placeId}`;
    }, 1500);
  } catch (error) {
    console.error('Error submitting review:', error);
    displayReviewError('Network error. Unable to submit review.');
  }
}

function setupReviewForm(token, placeId) {
  const reviewForm = document.getElementById('review-form');

  if (!reviewForm) {
    return;
  }

  reviewForm.addEventListener('submit', function (event) {
    event.preventDefault();

    clearReviewError();
    clearReviewSuccess();

    const ratingInput = document.getElementById('rating');
    const commentInput = document.getElementById('comment');

    if (!ratingInput || !commentInput) {
      displayReviewError('Form elements not found.');
      return;
    }

    const ratingValue = ratingInput.value.trim();
    const commentValue = commentInput.value.trim();

    if (!ratingValue || !commentValue) {
      displayReviewError('All fields are required.');
      return;
    }

    const ratingNum = parseInt(ratingValue, 10);

    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      displayReviewError('Rating must be between 1 and 5.');
      return;
    }

    const reviewData = {
      rating: ratingNum,
      comment: commentValue
    };

    submitReview(token, placeId, reviewData);
  });
}

function initAddReviewPage() {
  const token = checkAuthenticationReview();

  if (!token) {
    return;
  }

  const placeId = getPlaceIdFromURL();

  if (!placeId) {
    displayReviewError('No place ID provided in URL.');
    return;
  }

  const cancelButton = document.getElementById('cancel-button');
  if (cancelButton) {
    cancelButton.href = `place.html?id=${placeId}`;
  }

  setupReviewForm(token, placeId);
}

/* ===== PAGE INITIALIZATION ===== */

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    initLoginPage();
  }

  const placesList = document.getElementById('places-list');
  if (placesList) {
    checkAuthentication();
    setupBookingDates();
    setupTravelersSelector();
    setupQuickFilters();
    setupSearchFilter();
    fetchPlaces();
    setupPriceFilter();
  }

  const placeDetails = document.getElementById('place-details');
  if (placeDetails) {
    initPlacePage();
  }

  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    initAddReviewPage();
  }
});
