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

    allPlaces = places;
    displayPlaces(allPlaces);
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
    placesList.innerHTML = '<p style="text-align:center; padding:40px;">No places found.</p>';
    return;
  }

  places.forEach((place) => {
    const card = document.createElement('article');
    card.className = 'place-card';

    const placeName = place.name || 'Unnamed place';
    const price = place.price_by_night ?? place.price ?? 'N/A';
    const description = place.description || 'No description available';
    const location = place.city || place.location || 'Unknown location';
    const placeId = place.id || '';

    card.innerHTML = `
      <h2>${placeName}</h2>
      <p><strong>Price per night:</strong> $${price}</p>
      <p>${description}</p>
      <p><strong>Location:</strong> ${location}</p>
      <a class="details-button" href="place.html?id=${placeId}">View Details</a>
    `;

    placesList.appendChild(card);
  });
}

function setupPriceFilter() {
  const filterSelect = document.getElementById('price-filter');

  if (!filterSelect) {
    return;
  }

  filterSelect.addEventListener('change', function () {
    const filterValue = this.value;

    if (filterValue === 'all') {
      displayPlaces(allPlaces);
      return;
    }

    const maxPrice = parseInt(filterValue, 10);

    const filteredPlaces = allPlaces.filter((place) => {
      const rawPrice = place.price_by_night ?? place.price;
      const placePrice = typeof rawPrice === 'string' ? parseInt(rawPrice, 10) : rawPrice;

      if (Number.isNaN(placePrice) || placePrice === undefined || placePrice === null) {
        return false;
      }

      return placePrice <= maxPrice;
    });

    displayPlaces(filteredPlaces);
  });
}

/* ===== PLACE DETAILS PAGE ===== */

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

async function fetchPlaceDetails(token, placeId) {
  try {
    const headers = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${PLACES_ENDPOINT}/${placeId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      displayPlaceError(`Failed to load place details: ${response.status}`);
      return;
    }

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      displayPlaceError('Invalid server response.');
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
    displayPlaceError('Network error. Unable to load place details.');
  }
}

function displayPlaceDetails(place) {
  const placeDetailsContainer = document.getElementById('place-details');

  if (!placeDetailsContainer) {
    return;
  }

  placeDetailsContainer.innerHTML = '';

  const name = place.name || 'Unnamed place';
  const description = place.description || 'No description available';
  const price = place.price_by_night ?? place.price ?? 'N/A';
  const host = place.host || place.host_name || place.owner || 'Unknown host';
  const location = place.city || place.location || 'Unknown location';

  const title = document.createElement('h1');
  title.textContent = name;
  placeDetailsContainer.appendChild(title);

  const info = document.createElement('div');
  info.className = 'place-info';
  info.innerHTML = `
    <p><strong>Host:</strong> ${host}</p>
    <p><strong>Price per night:</strong> $${price}</p>
    <p><strong>Location:</strong> ${location}</p>
    <p><strong>Description:</strong> ${description}</p>
  `;
  placeDetailsContainer.appendChild(info);

  const amenitiesTitle = document.createElement('h2');
  amenitiesTitle.textContent = 'Amenities';
  placeDetailsContainer.appendChild(amenitiesTitle);

  if (Array.isArray(place.amenities) && place.amenities.length > 0) {
    const amenitiesList = document.createElement('ul');

    place.amenities.forEach((amenity) => {
      const li = document.createElement('li');
      li.textContent = typeof amenity === 'string' ? amenity : amenity.name || 'Unnamed amenity';
      amenitiesList.appendChild(li);
    });

    placeDetailsContainer.appendChild(amenitiesList);
  } else {
    const noAmenities = document.createElement('p');
    noAmenities.textContent = 'No amenities available';
    placeDetailsContainer.appendChild(noAmenities);
  }

  const reviewsTitle = document.createElement('h2');
  reviewsTitle.textContent = 'Reviews';
  placeDetailsContainer.appendChild(reviewsTitle);

  if (Array.isArray(place.reviews) && place.reviews.length > 0) {
    place.reviews.forEach((review) => {
      const reviewCard = document.createElement('article');
      reviewCard.className = 'review-card';

      const username = review.username || review.user_name || review.user || 'Anonymous';
      const rating = review.rating ?? 'No rating';
      const comment = review.comment || review.text || 'No comment';

      reviewCard.innerHTML = `
        <p><strong>User:</strong> ${username}</p>
        <p><strong>Rating:</strong> ${rating}</p>
        <p><strong>Comment:</strong> ${comment}</p>
      `;

      placeDetailsContainer.appendChild(reviewCard);
    });
  } else {
    const noReviews = document.createElement('p');
    noReviews.textContent = 'No reviews yet.';
    placeDetailsContainer.appendChild(noReviews);
  }
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
    const response = await fetch(`${PLACES_ENDPOINT}/${placeId}/reviews`, {
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
