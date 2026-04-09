# HBnB - Part 4: Frontend Integration

## Overview

Part 4 of the HBnB project adds a complete static frontend to the existing Flask API.

The frontend is served directly by Flask and communicates with the backend API using the Fetch API and JWT authentication stored in cookies.

This part covers:

- Semantic HTML5 pages served via Flask `render_template`
- Shared CSS3 stylesheet using Flexbox for responsive layout
- Vanilla JavaScript (ES6) for dynamic data fetching and rendering
- JWT token stored in a cookie after login
- Client-side price filtering on the index page
- Protected pages that redirect unauthenticated users

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | Python 3 |
| Web framework | Flask |
| API layer | Flask-RESTX |
| Authentication | Flask-JWT-Extended |
| Password hashing | Flask-Bcrypt |
| ORM | Flask-SQLAlchemy |
| Database | SQLite |
| Frontend | HTML5, CSS3, JavaScript ES6 |
| HTTP client | Fetch API (browser-native) |

---

## Project Structure

```
part4/
├── app/
│   ├── __init__.py
│   ├── extensions.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── amenities.py
│   │       ├── auth.py
│   │       ├── places.py
│   │       ├── reviews.py
│   │       └── users.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── amenity.py
│   │   ├── base.py
│   │   ├── place.py
│   │   ├── review.py
│   │   └── user.py
│   ├── persistence/
│   │   ├── __init__.py
│   │   └── repository.py
│   └── services/
│       ├── __init__.py
│       ├── facade.py
│       └── repositories/
│           └── user_repository.py
├── templates/
│   ├── index.html
│   ├── login.html
│   ├── place.html
│   └── add_review.html
├── static/
│   ├── styles.css
│   ├── scripts.js
│   ├── logo.png
│   └── icon.png
├── instance/
│   └── development.db
├── sql/
│   ├── schema.sql
│   └── seed.sql
├── test/
│   ├── test_amenity.py
│   ├── test_place.py
│   ├── test_review.py
│   └── test_user.py
├── config.py
├── run.py
├── requirements.txt
├── test_flow.sh
└── test_admin_flow.sh
```

---

## Installation and Startup

```bash
cd part4
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 run.py
```

Then open:

```
http://127.0.0.1:5000/
```

Swagger UI is available at:

```
http://127.0.0.1:5000/api/v1/
```

On startup, a test admin user is automatically created if it does not already exist:

| Field | Value |
|-------|-------|
| Email | `admin@test.com` |
| Password | `123456` |

---

## Frontend Pages

| URL | Template | Description |
|-----|----------|-------------|
| `/` | `index.html` | Home page with place list and price filter |
| `/index.html` | `index.html` | Same as above |
| `/login.html` | `login.html` | Login form |
| `/place.html` | `place.html` | Place detail view with reviews |
| `/add_review.html` | `add_review.html` | Review submission form |

All pages are rendered server-side by Flask using `render_template`. Static assets (CSS, JS, images) are served by Flask from the `static/` folder using `url_for('static', filename=...)`.

---

## JavaScript Behavior

All frontend logic lives in `static/scripts.js`. The file is shared across all pages and detects which page is loaded by checking for known DOM element IDs.

### index.html

- On load: checks for `access_token` cookie to show or hide the login link
- Fetches all places from `GET /api/v1/places`
- If a token exists, includes `Authorization: Bearer <token>` header
- Renders one card per place with name, price, description, and location
- Each card links to `place.html?id=<place_id>`
- Price filter (`#price-filter`) filters the list client-side without a new API request

### login.html

- Submits email and password via `POST /api/v1/auth/login`
- On success: stores the JWT in a cookie named `access_token` (7-day expiry, `path=/`)
- Redirects to `index.html`
- On failure: displays an error message in `#error-message`

### place.html

- Reads `?id=<place_id>` from the URL
- Fetches place details from `GET /api/v1/places/<id>`
- Renders name, price, host, location, description, amenities, and reviews
- Shows the `#add-review` section only if the user is authenticated
- The "Add Your Review" link points to `add_review.html?id=<place_id>`

### add_review.html

- Redirects to `index.html` immediately if no `access_token` cookie is found
- Reads `?id=<place_id>` from the URL
- Submits username, rating, and comment via `POST /api/v1/places/<id>/reviews`
- On success: shows a success message and redirects to `place.html?id=<id>` after 2 seconds
- On failure: shows an error message in `#error-message`

---

## Cookie Strategy

| Cookie name | Content | Expiry | Path |
|-------------|---------|--------|------|
| `access_token` | JWT string | 7 days | `/` |

The cookie is set by JavaScript after a successful login response. It is read on every page load to determine authentication state and to build the `Authorization` header for API requests.

---

## API Endpoints

### Auth

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `POST` | `/api/v1/auth/login` | Public | Authenticate and return a JWT |

### Users

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/v1/users/` | Public | List all users |
| `POST` | `/api/v1/users/` | Admin only | Create a user |
| `GET` | `/api/v1/users/<id>` | Public | Get one user |
| `PUT` | `/api/v1/users/<id>` | Self or admin | Update a user |

### Amenities

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/v1/amenities/` | Public | List all amenities |
| `POST` | `/api/v1/amenities/` | Admin only | Create an amenity |
| `GET` | `/api/v1/amenities/<id>` | Public | Get one amenity |
| `PUT` | `/api/v1/amenities/<id>` | Admin only | Update an amenity |

### Places

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `GET` | `/api/v1/places/` | Public | List all places |
| `POST` | `/api/v1/places/` | Authenticated | Create a place |
| `GET` | `/api/v1/places/<id>` | Public | Get one place |
| `PUT` | `/api/v1/places/<id>` | Owner or admin | Update a place |

### Reviews

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| `POST` | `/api/v1/reviews/` | Authenticated | Create a review |
| `GET` | `/api/v1/reviews/<id>` | Public | Get one review |
| `PUT` | `/api/v1/reviews/<id>` | Author or admin | Update a review |
| `DELETE` | `/api/v1/reviews/<id>` | Author or admin | Delete a review |

---

## Testing

### Unit Tests

```bash
python3 -m unittest discover -s test -p "test_*.py" -v
```

### Integration Scripts

```bash
bash test_flow.sh
bash test_admin_flow.sh
```

`test_flow.sh` covers login, place creation, review creation, ownership rules, and forbidden updates.

`test_admin_flow.sh` covers admin login, admin-only user/amenity creation, and admin override on places and reviews.

---

## Authors

- Lorenzo Anselme
- Lucas Mettetal

Holberton School
