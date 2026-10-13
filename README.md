# Book Inventory

A full-stack web app for managing a personal book collection. Browse and search your library, then add, edit and delete books with cover images behind a JWT login.

**Live demo:** <https://book-inventory-wheat.vercel.app>

| | |
|---|---|
| Username | `demo` |
| Password | `Library-Demo-2026` |

> The demo runs on free hosting tiers. If nobody has used it for a while, the first sign-in can take up to a minute while the server wakes up. The demo data is shared and publicly editable, so it may be reset at any time.

## Screenshots

| | Mobile (390 px) | Desktop |
|---|---|---|
| **Sign in** | <img src="docs/screenshots/login-mobile.png" width="220" alt="Sign-in page on a phone, with the demo account box"> | <img src="docs/screenshots/login-desktop.png" width="520" alt="Sign-in page on desktop"> |
| **Library** | <img src="docs/screenshots/books-mobile.jpg" width="220" alt="Book list on a phone"> | <img src="docs/screenshots/books-desktop.jpg" width="520" alt="Book list on desktop"> |
| **Book detail** | <img src="docs/screenshots/detail-mobile.jpg" width="220" alt="Book details on a phone"> | <img src="docs/screenshots/detail-desktop.jpg" width="520" alt="Book details on desktop, with Edit and Delete"> |

## Features

- **Search, filter, sort and page** through the collection: search by title or author, filter by genre, and sort by title, author, year or date added. All of it runs on the server, which returns the books 8 per page, so the list stays fast as the collection grows.
- **Book details** in a modal: cover, author, genre, release year and description.
- **Add, edit and delete** books, including cover image upload and a delete confirmation step.
- **JWT authentication** with a 60-minute access token. Reading books is public; creating, editing and deleting require a valid token and are enforced by the API, not just the UI. Signed-out visitors don't see the Add, Edit or Delete controls, and an expired session sends you back to the sign-in page.
- **Upload and login limits**: cover images are capped at 5 MB (checked in the browser and again on the server), and sign-in attempts are limited to 5 per minute and 30 per hour per IP address.
- **Light and dark themes**, remembered between visits.
- **Responsive layout** that works down to phone width.
- **Cloud image storage**: covers are uploaded to Cloudinary, so the app server stays stateless.
- **Resized covers**: the grid loads 400 px thumbnails and the details view 800 px versions, made on demand by Cloudinary and sent as WebP or AVIF where the browser supports it. For the 10 sample books the first page of covers is about 0.3 MB instead of 3.7 MB. The original upload is kept and still returned as `image`.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router, Tailwind CSS 4, Axios, Lucide icons |
| Backend | Django 4.2, Django REST Framework, Simple JWT, WhiteNoise, Gunicorn |
| Database | PostgreSQL (hosted on Neon); SQLite for local development |
| Media | Cloudinary |
| Hosting | Vercel (frontend), Render (backend) |

```
Browser ── React SPA (Vercel) ──HTTPS/JSON──> Django REST API (Render) ──> PostgreSQL (Neon)
                                                        └──────────────> Cloudinary (cover images)
```

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/books/` | public | One page of books, with optional `search`, `genre`, `ordering`, `page` and `page_size` (see below) |
| `GET` | `/api/books/genres/` | public | Genres in use, each with its number of books |
| `POST` | `/api/books/create/` | JWT | Create a book (multipart form, optional `image` up to 5 MB) |
| `PUT` | `/api/books/<id>/` | JWT | Update a book (partial updates allowed) |
| `DELETE` | `/api/books/<id>/` | JWT | Delete a book |
| `POST` | `/api/auth/login/` | public | Exchange `username` and `password` for `access` and `refresh` tokens (rate limited: `429` once the limit is hit) |
| `POST` | `/api/auth/token/refresh/` | public | Get a new access token from a refresh token |
| `GET` | `/api/auth/me/` | JWT | Current user |
| `GET` | `/health/` | public | Liveness check (used by an uptime monitor to keep the free server warm) |

Send the token as `Authorization: Bearer <access>`. There is no public sign-up: accounts are created by the owner (see [Managing users](#managing-users)).

`GET /api/books/` takes these query parameters, all optional:

| Parameter | Meaning |
|---|---|
| `search` | Words to find in the title or author, ignoring case. Every word must match. |
| `genre` | Only books of this genre, ignoring case. |
| `ordering` | `title`, `author`, `release_year` or `created_at`; prefix with `-` to reverse. Titles and authors sort ignoring case, and ties are broken by id so a book never appears on two pages. |
| `page`, `page_size` | Page number (from 1) and page length (default 8, at most 50). A page past the end returns `404`. |

The response is `{"count", "page", "page_size", "total_pages", "results": [...]}`. Each book carries its cover three times: `image` (the original upload), `image_medium` (800 px wide) and `image_thumb` (400 px wide), all `null` when the book has no cover.

## Run it locally

**Prerequisites:** Python 3.12, Node.js 20.19+ or 22.12+, and Git. A free [Cloudinary](https://cloudinary.com) account is only needed to upload new covers.

### 1. Backend

```bash
cd server
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env               # Windows: copy .env.example .env
```

Edit `server/.env` (every variable is explained inside the file):

| Variable | Needed | Notes |
|---|---|---|
| `DJANGO_SECRET_KEY` | yes | The app will not start without it. Generate one with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DJANGO_DEBUG` | no | `True` for local development |
| `DATABASE_URL` | no | **Leave blank locally** to use a SQLite file. If you point it at a hosted database, `migrate`, `seed_demo` and the tests act on that database |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | yes, all three | Must be non-empty or any request that returns a cover image fails. To only browse locally, use `dn2kyvutt` as the cloud name (it serves the sample covers publicly) and any placeholder for the key and secret. To upload covers, use your own credentials |
| `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `DJANGO_ALLOWED_HOSTS` | no | Defaults work for local development |

Then set up the database and start the server:

```bash
python manage.py migrate
python manage.py seed_demo         # creates the demo user and the 10 sample books
python manage.py runserver         # http://localhost:8000
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env               # Windows: copy .env.example .env
npm run dev                        # http://localhost:5173
```

`client/.env` points at `http://localhost:8000` by default. Open <http://localhost:5173> and sign in with the demo account above.

### Tests and lint

```bash
cd server && python manage.py test        # keep DATABASE_URL blank so tests use a throwaway SQLite database
cd client && npm run lint && npm run build
```

## Managing users

Run these from `server/` with the virtual environment active. They act on whichever database `DATABASE_URL` points at.

```bash
python manage.py createsuperuser           # create an admin (can also use /admin/)
python manage.py changepassword <username> # reset a forgotten password
python manage.py seed_demo                 # create or repair the demo user, restore any missing sample books
python manage.py seed_demo --reset-books   # also revert edited sample books to their original values
```

`seed_demo` is safe to run repeatedly and never deletes anything. It matches sample books by title and author, so a sample book that was *renamed* looks like a missing one and is restored alongside it. Delete the extra copy by hand. The demo user is a normal, non-admin account with the same create, edit and delete rights as any other user.

## Deployment

- **Backend (Render):** [`render.yaml`](render.yaml) defines the web service (root `server/`). The build installs `requirements.txt`, runs `migrate` and `collectstatic`, and the service starts with Gunicorn. Set the environment variables from `server/.env.example` in the Render dashboard, with `DATABASE_URL` pointing at the Neon database and `CORS_ALLOWED_ORIGINS` set to the Vercel URL.
- **Frontend (Vercel):** import the repo with `client/` as the root directory. Set `VITE_API_URL`, `VITE_API_BOOKS_URL` and `VITE_API_AUTH_URL` (see `client/.env.example`) before building, because Vite inlines them at build time. [`client/vercel.json`](client/vercel.json) rewrites every path to `index.html` for client-side routing.
- **Free-tier note:** Render's free web service sleeps when idle. The frontend sends a background request on load to wake it, and `/health/` is available for an uptime monitor.

## Project structure

```
client/                      React single-page app
  src/pages/                 Login, book list, add-book
  src/components/books/      Book card, details, edit modal, form, search
  src/context/               Auth context and provider (JWT in localStorage)
server/                      Django project
  book_inventory/api/        Book model, REST views, demo_books.json fixture
  book_inventory/accounts/   Login/me endpoints, seed_demo command
  book_inventory/config/     Settings, URLs, WSGI
docs/screenshots/            Images used in this README
render.yaml                  Render service definition
```
