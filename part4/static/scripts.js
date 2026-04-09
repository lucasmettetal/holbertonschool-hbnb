/* ===== CONFIGURATION ===== */

const API_BASE_URL = 'http://127.0.0.1:5000/api/v1';
const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`;
const REGISTER_ENDPOINT = `${API_BASE_URL}/auth/register`;
const PLACES_ENDPOINT = `${API_BASE_URL}/places/`;
const AMENITIES_ENDPOINT = `${API_BASE_URL}/amenities/`;

// Cache for amenity lookups (UUID -> name)
let amenityCache = {};

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
      const errorMessage = data.message || 'Erreur de connexion. Veuillez vérifier vos identifiants.';
      displayError(errorMessage);
      return;
    }

    const token = data.access_token || data.token;

    if (!token) {
      displayError('Aucun jeton reçu du serveur.');
      return;
    }

    setCookie('access_token', token);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Login error:', error);
    displayError('Erreur réseau. Veuillez réessayer.');
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
      displayError('Éléments du formulaire non trouvés.');
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      displayError('L\'email et le mot de passe sont obligatoires.');
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

const BADGES = [null, null, null, null, 'Favori des voyageurs', 'Très bien noté', 'Nouveau'];

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
    'Centre-ville',
    'Près du métro',
    'Rue calme',
    'Près de la rivière',
    'Quartier historique'
  ];

  return `${maxGuests} voyageur${maxGuests > 1 ? 's' : ''} · ${bedrooms} chambre${bedrooms > 1 ? 's' : ''} · ${pickRandomItem(areaOptions)}`;
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

function isUUID(str) {
  // UUID v4 pattern: 8-4-4-4-12 hexadecimal digits
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(str);
}

function getAmenityName(amenityId) {
  // Check if it's in the cache
  if (amenityCache[amenityId]) {
    return amenityCache[amenityId];
  }
  // Return generic label for unknown UUIDs
  return 'Équipement';
}

async function preloadAmenitiesCache() {
  try {
    const response = await fetch(AMENITIES_ENDPOINT);
    if (!response.ok) {
      console.warn('Could not preload amenities cache');
      return;
    }
    const amenities = await response.json();
    if (Array.isArray(amenities)) {
      amenities.forEach(amenity => {
        if (amenity.id && amenity.name) {
          amenityCache[amenity.id] = amenity.name;
        }
      });
    }
  } catch (err) {
    console.warn('Error preloading amenities:', err);
  }
}

function normalizeAmenities(amenities) {
  if (!Array.isArray(amenities)) {
    return [];
  }

  return amenities
    .map((amenity) => {
      // If it's an object with a name property, use that
      if (amenity && typeof amenity === 'object') {
        return amenity.name || amenity.label || amenity.title || '';
      }

      // If it's a string
      if (typeof amenity === 'string') {
        // If it's a UUID, look it up in cache
        if (isUUID(amenity)) {
          return getAmenityName(amenity);
        }
        // Otherwise return the string as-is (it's likely already a readable name)
        return amenity;
      }

      return '';
    })
    .filter(Boolean);
}

function normalizePlace(place) {
  return {
    id: place.id || generateRandomId(),
    name: place.name || place.title || 'Logement sans titre',
    city: place.city || place.location || 'Ville inconnue',
    price: place.price_by_night ?? place.price ?? null,
    description: place.description || 'Aucune description disponible',
    details: place.details || place.detail || place.short_detail || place.summary || null,
    amenities: normalizeAmenities(place.amenities),
    image: place.image_url || place.image || place.photo || pickFallbackImage(),
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
  const token = getCookie('access_token');

  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const createPlaceLink = document.getElementById('create-place-link');
  const logoutLink = document.getElementById('logout-link');

  if (token) {
    if (loginLink) loginLink.style.display = 'none';
    if (registerLink) registerLink.style.display = 'none';
    if (createPlaceLink) createPlaceLink.style.display = 'inline-block';
    if (logoutLink) logoutLink.style.display = 'inline-block';
  } else {
    if (loginLink) loginLink.style.display = 'inline-block';
    if (registerLink) registerLink.style.display = 'inline-block';
    if (createPlaceLink) createPlaceLink.style.display = 'none';
    if (logoutLink) logoutLink.style.display = 'none';
  }

  return token;
}

function logout() {
  document.cookie = 'access_token=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
  window.location.href = 'index.html';
}

async function fetchPlaces() {
  try {
    clearError();

    const token = getCookie('access_token');
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(PLACES_ENDPOINT, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      displayError(`Erreur au chargement des logements: ${response.status}`);
      return;
    }

    let data = [];
    try {
      data = await response.json();
    } catch (error) {
      displayError('Réponse du serveur invalide.');
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
    displayError('Erreur réseau. Impossible de charger les logements.');
  }
}

function displayPlaces(places) {
  const placesList = document.getElementById('places-list');

  if (!placesList) {
    return;
  }

  placesList.innerHTML = '';

  if (!places || places.length === 0) {
    placesList.innerHTML = '<p style="grid-column: 1 / -1; text-align:center; padding:40px; color:#717171;">Aucun logement trouvé.</p>';
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
    const image = place.image_url || place.image || pickFallbackImage();
    const ratingValue = place.rating || '4.8';
    const detail = place.details || place.detail || place.description || '2 voyageurs · 1 chambre · Centre-ville';

    const amenitiesMarkup = amenities.length > 0
      ? `${amenities.map(function (amenity) { return `<span class="amenity-pill">${amenity}</span>`; }).join('')}${extraAmenities > 0 ? `<span class="amenity-more">+${extraAmenities} autre${extraAmenities > 1 ? 's' : ''}</span>` : ''}`
      : '<span class="amenity-more">Aucun équipement renseigné</span>';

    const availabilityLine = (place.availableFrom && place.availableTo)
      ? `<p class="availability-line">Disponible ${place.availableFrom} – ${place.availableTo}</p>`
      : '';

    const maxGuestsLine = place.maxGuests
      ? `<p class="max-guests-line">Jusqu'à ${place.maxGuests} voyageur${place.maxGuests > 1 ? 's' : ''}</p>`
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
            <p class="price">$${price}<span class="price-unit"> / nuit</span></p>
          </div>
          <div class="amenities-preview">${amenitiesMarkup}</div>
          ${availabilityLine}
          <span class="details-button">Voir les détails</span>
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

      nightsCount.textContent = nights > 0 ? `${nights} nuit${nights > 1 ? 's' : ''} sélectionnée${nights > 1 ? 's' : ''}` : '';
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
  const token = getCookie('access_token');

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
      useFallbackOrError(placeId, `Logement non trouvé (${response.status}).`);
      return;
    }

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      useFallbackOrError(placeId, 'Réponse du serveur invalide.');
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
    useFallbackOrError(placeId, 'Erreur réseau. Impossible de charger les détails du logement.');
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

  const name = place.name || 'Logement sans titre';
  const description = place.description || 'Aucune description disponible';
  const price = place.price_by_night ?? place.price ?? 'Prix indisponible';
  const host = place.host || place.host_name || place.owner || 'Propriétaire inconnu';
  const location = place.city || place.location || 'Ville inconnue';
  const rating = place.rating || null;
  const image = place.image_url || place.image || place.photo || pickFallbackImage();
  const details = place.details || place.detail || null;
  const maxGuests = place.maxGuests || place.max_guests || null;
  const availableFrom = place.availableFrom || place.available_from || null;
  const availableTo = place.availableTo || place.available_to || null;
  const amenities = normalizeAmenities(place.amenities);
  const reviewStats = place.reviewStats || null;
  const reviewList = Array.isArray(place.reviews) ? place.reviews : [];

  const amenitiesHtml = amenities.length > 0
    ? amenities.map(function (a) { return `<span class="amenity-pill detail-amenity">${a}</span>`; }).join('')
    : '<p class="no-data-note">Aucun équipement renseigné.</p>';

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
          <p class="review-overall-count">${count} avis${count !== 1 ? '' : ''}</p>
        </div>
        <div class="review-summary-stats">
          ${statBar('Propreté', reviewStats.cleanliness)}
          ${statBar('Exactitude', reviewStats.accuracy)}
          ${statBar('Arrivée', reviewStats.checkin)}
          ${statBar('Communication', reviewStats.communication)}
          ${statBar('Localisation', reviewStats.location)}
          ${statBar('Rapport qualité/prix', reviewStats.value)}
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
    reviewCardsHtml = '<p class="no-data-note">Aucun avis pour le moment. Soyez le premier à partager votre expérience !</p>';
  }

  const reviewsHtml = reviewSummaryHtml + (reviewList.length > 0 ? `<div class="detail-reviews">${reviewCardsHtml}</div>` : reviewCardsHtml);

  const country = place.country || null;
  const address = place.address || null;

  const locationMeta = [address, location, country].filter(Boolean).join(', ');
  const mapBodyHtml = `
    <p class="detail-location-meta">${locationMeta}</p>
    <div id="map" class="detail-map"></div>
    <p id="map-unavailable-msg" class="no-data-note" style="display:none;">Carte de localisation indisponible.</p>`;

  const ratingBadge = rating
    ? `<span class="detail-rating-badge">★ ${rating}</span>`
    : '';

  const infoLine = details
    ? `<p class="detail-info-line">${details}</p>`
    : '';

  const guestsLine = maxGuests
    ? `<p class="detail-guests">Jusqu'à ${maxGuests} voyageur${maxGuests > 1 ? 's' : ''}</p>`
    : '';

  const availabilityHtml = (availableFrom && availableTo)
    ? `<p class="detail-availability">Disponible ${availableFrom} – ${availableTo}</p>`
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
        <span class="detail-price">$${price}<span class="detail-price-unit"> / nuit</span></span>
        <span class="detail-host">Hébergé par <strong>${host}</strong></span>
      </div>
      <div class="detail-section">
        <h2 class="detail-section-title">À propos de ce logement</h2>
        <p class="detail-description">${description}</p>
      </div>
      <div class="detail-section">
        <h2 class="detail-section-title">Équipements</h2>
        <div class="detail-amenities">${amenitiesHtml}</div>
      </div>
      <div class="detail-section">
        <h2 class="detail-section-title">Avis des voyageurs</h2>
        ${reviewsHtml}
      </div>
      <div class="detail-section">
        <h2 class="detail-section-title">Localisation du logement</h2>
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
      unavailableMsg.textContent = 'Carte de localisation indisponible.';
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
      unavailableMsg.textContent = 'Carte de localisation indisponible.';
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
    displayPlaceError('Aucun ID de logement fourni dans l\'URL.');
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
  const token = getCookie('access_token');

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

function checkAuthenticationCreatePlace() {
  const token = getCookie('access_token');

  if (!token) {
    window.location.href = 'login.html';
    return null;
  }

  return token;
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
    const response = await fetch(`${API_BASE_URL}/reviews/`, {
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
      const errorMessage = data.error || data.message || 'Failed to submit review.';
      displayReviewError(errorMessage);
      return;
    }

    displayReviewSuccess('Avis envoyé avec succès ! Redirection en cours...');

    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
      reviewForm.reset();
    }

    setTimeout(() => {
      window.location.href = `place.html?id=${placeId}`;
    }, 1500);
  } catch (error) {
    console.error('Error submitting review:', error);
    displayReviewError('Erreur réseau. Impossible d\'envoyer l\'avis.');
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
      displayReviewError('Tous les champs sont obligatoires.');
      return;
    }

    const ratingNum = parseInt(ratingValue, 10);

    if (Number.isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      displayReviewError('La note doit être entre 1 et 5.');
      return;
    }

    const reviewData = {
      place_id: placeId,
      rating: ratingNum,
      text: commentValue
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
    displayReviewError('Aucun ID de logement fourni dans l\'URL.');
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
  // Preload amenities cache for UUID-to-name mapping
  preloadAmenitiesCache();

  // Apply auth state (show/hide Login & Logout) on every page
  checkAuthentication();

  // Wire logout button present on any page
  const logoutBtn = document.getElementById('logout-link');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      logout();
    });
  }

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    initLoginPage();
  }

  const placesList = document.getElementById('places-list');
  if (placesList) {
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

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    initRegisterPage();
  }

  const createPlaceForm = document.getElementById('create-place-form');
  if (createPlaceForm) {
    initCreatePlacePage();
  }
});

/* ===== REGISTER PAGE ===== */

function initRegisterPage() {
  const form = document.getElementById('register-form');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const errorBox = document.getElementById('error-message');
    const successBox = document.getElementById('success-message');

    if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }
    if (successBox) { successBox.style.display = 'none'; successBox.textContent = ''; }

    const firstName = document.getElementById('first_name').value.trim();
    const lastName = document.getElementById('last_name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!firstName || !lastName || !email || !password) {
      showBox(errorBox, 'Tous les champs sont obligatoires.');
      return;
    }

    try {
      const response = await fetch(REGISTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showBox(errorBox, data.error || data.message || 'Erreur lors de l\'inscription.');
        return;
      }

      // Auto-login: store JWT and redirect
      const token = data.access_token || data.token;
      if (token) {
        setCookie('access_token', token);
      }

      showBox(successBox, 'Compte créé ! Redirection en cours...');
      setTimeout(() => { window.location.href = 'index.html'; }, 1500);

    } catch (err) {
      console.error('Register error:', err);
      showBox(errorBox, 'Erreur réseau. Veuillez réessayer.');
    }
  });
}

function showBox(el, message) {
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
}

/* ===== CREATE PLACE PAGE ===== */

// Handle image upload preview
function initImageUpload() {
  const imageInput = document.getElementById('image-upload');
  const previewDiv = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const removeBtn = document.getElementById('remove-image-btn');
  const uploadStatus = document.getElementById('upload-status');

  if (!imageInput) return;

  imageInput.addEventListener('change', function (e) {
    const file = e.target.files[0];

    if (!file) {
      previewDiv.style.display = 'none';
      uploadStatus.textContent = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      uploadStatus.textContent = 'Veuillez sélectionner une image valide.';
      uploadStatus.style.color = '#ef4444';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      uploadStatus.textContent = 'L\'image est trop volumineux (max 5MB).';
      uploadStatus.style.color = '#ef4444';
      imageInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      previewImg.src = event.target.result;
      previewDiv.style.display = 'block';
      uploadStatus.textContent = 'Image sélectionnée - elle sera uploadée avec l\'annonce';
      uploadStatus.style.color = '#16A34A';
    };
    reader.readAsDataURL(file);
  });

  if (removeBtn) {
    removeBtn.addEventListener('click', function () {
      imageInput.value = '';
      previewDiv.style.display = 'none';
      uploadStatus.textContent = '';
    });
  }
}

async function uploadPlaceImage(file, token) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const uploadUrl = `${API_BASE_URL.split('/api/v1')[0]}/api/v1/upload`;
    console.log('Uploading to:', uploadUrl);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const data = await response.json();
      console.error('Upload error response:', data);
      throw new Error(data.error || 'Upload failed');
    }

    const data = await response.json();
    console.log('Upload successful, image_url:', data.image_url);
    return data.image_url;
  } catch (err) {
    console.error('Image upload error:', err);
    throw err;
  }
}

async function fetchAndRenderAmenities() {
  const container = document.getElementById('amenities-list');
  if (!container) return;

  try {
    const response = await fetch(`${API_BASE_URL}/amenities/`);
    if (!response.ok) {
      container.innerHTML = '<p style="color:#717171;font-size:14px;">Impossible de charger les équipements.</p>';
      return;
    }
    const amenities = await response.json();
    if (!amenities || amenities.length === 0) {
      container.innerHTML = '<p style="color:#717171;font-size:14px;">Aucun équipement disponible.</p>';
      return;
    }
    container.innerHTML = amenities.map(function (a) {
      return `<label style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #ddd;border-radius:999px;font-size:13px;cursor:pointer;user-select:none;">
        <input type="checkbox" name="amenity" value="${a.id}" style="accent-color:#008489;"> ${a.name}
      </label>`;
    }).join('');
  } catch (err) {
    console.warn('Could not load amenities:', err);
    container.innerHTML = '<p style="color:#717171;font-size:14px;">Impossible de charger les équipements.</p>';
  }
}

function initCreatePlacePage() {
  const token = checkAuthenticationCreatePlace();
  if (!token) {
    return;
  }

  fetchAndRenderAmenities();
  initImageUpload();

  // Geocode button — converts address to lat/lng via Nominatim (OpenStreetMap)
  const geocodeBtn = document.getElementById('geocode-btn');
  if (geocodeBtn) {
    geocodeBtn.addEventListener('click', async function () {
      const address = document.getElementById('address').value.trim();
      const feedback = document.getElementById('location-feedback');
      const errorBox = document.getElementById('error-message');

      if (!address) {
        showBox(errorBox, 'Veuillez d\'abord entrer une adresse.');
        return;
      }

      geocodeBtn.textContent = '...';
      geocodeBtn.disabled = true;

      try {
        const nominatimUrl = 'https://nominatim.openstreetmap.org/search'
          + `?q=${encodeURIComponent(address)}`
          + '&format=json&limit=1&addressdetails=1';

        const response = await fetch(nominatimUrl, {
          headers: { 'Accept-Language': 'en' }
        });
        const results = await response.json();

        if (!results || results.length === 0) {
          showBox(errorBox, 'Adresse non trouvée. Essayez une adresse plus précise.');
          geocodeBtn.textContent = 'Localiser';
          geocodeBtn.disabled = false;
          return;
        }

        const result = results[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const addrObj = result.address || {};
        const city = addrObj.city || addrObj.town || addrObj.village
          || addrObj.municipality || '';
        const country = addrObj.country || '';

        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lon;

        const cityEl = document.getElementById('city');
        const countryEl = document.getElementById('country');
        if (cityEl) cityEl.value = city;
        if (countryEl) countryEl.value = country;

        if (feedback) {
          feedback.textContent = `Localisation confirmée : ${result.display_name}`;
          feedback.style.display = 'block';
        }
        if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }

      } catch (err) {
        console.error('Geocoding error:', err);
        showBox(document.getElementById('error-message'),
          'Impossible de contacter le service de localisation. Vérifiez votre connexion.');
      }

      geocodeBtn.textContent = 'Localiser';
      geocodeBtn.disabled = false;
    });
  }

  // Form submission
  const form = document.getElementById('create-place-form');

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const errorBox = document.getElementById('error-message');
    const successBox = document.getElementById('success-message');

    if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }
    if (successBox) { successBox.style.display = 'none'; successBox.textContent = ''; }

    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    const latitude = parseFloat(document.getElementById('latitude').value);
    const longitude = parseFloat(document.getElementById('longitude').value);

    const selectedAmenityIds = Array.from(
      document.querySelectorAll('input[name="amenity"]:checked')
    ).map(function (cb) { return cb.value; });

    if (!title) {
      showBox(errorBox, 'Veuillez entrer un titre.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      showBox(errorBox, 'Veuillez entrer un prix valide.');
      return;
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      showBox(errorBox, 'Veuillez d\'abord utiliser le bouton "Localiser" pour valider votre adresse.');
      return;
    }

    try {
      const imageInput = document.getElementById('image-upload');
      let imageUrl = null;

      // Upload image if selected
      if (imageInput && imageInput.files.length > 0) {
        try {
          imageUrl = await uploadPlaceImage(imageInput.files[0], token);
          if (imageUrl) {
            document.getElementById('image-url').value = imageUrl;
            console.log('Image URL set in hidden field:', imageUrl);
          }
        } catch (uploadErr) {
          showBox(errorBox, 'Erreur lors de l\'upload de l\'image. Veuillez réessayer.');
          return;
        }
      }

      const placePayload = {
        title,
        description,
        price,
        latitude,
        longitude,
        amenities: selectedAmenityIds,
        image_url: imageUrl
      };

      console.log('Creating place with payload:', placePayload);

      const response = await fetch(PLACES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(placePayload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Create place error response:', data);
        showBox(errorBox, data.error || data.message || 'Erreur lors de la création de l\'annonce.');
        return;
      }

      console.log('Place created successfully:', data);
      showBox(successBox, 'Annonce créée ! Redirection en cours...');
      setTimeout(function () {
        window.location.href = `place.html?id=${data.id}`;
      }, 1500);

    } catch (err) {
      console.error('Create place error:', err);
      showBox(errorBox, 'Erreur réseau. Veuillez réessayer.');
    }
  });
}
