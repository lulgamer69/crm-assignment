# LeadFlow CRM

LeadFlow CRM is a full-stack lead management application built for the Meru Technosoft Full Stack Developer screening assignment. It gives each registered user a private lead pipeline, with a dashboard for tracking status, recent activity, trends, and lead sources.

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Technology](#technology)
- [Architecture](#architecture)
- [Security and error handling](#security-and-error-handling)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Tests](#tests)
- [Deployment](#deployment)
- [Limitations and next steps](#limitations-and-next-steps)
- [Project reflection](#project-reflection)

<a id="features"></a>
## Features

- Register and sign in with email and password.
- Manage leads: create, list, search, filter, view, edit, and delete.
- Keep lead records scoped to their authenticated owner.
- Search leads by name, email, or company; filter by status and source; paginate and sort the results.
- View status totals, a status distribution chart, UTC lead-creation trends, recent leads, and lead-source counts on the dashboard.
- Choose a trend period of 24 hours, 7 days, 30 days, or 12 months.
- View and update the signed-in user's name on the profile page.
- Receive field validation and clear success or failure feedback in the UI.

Lead statuses are `New`, `Contacted`, `Qualified`, and `Lost`. Supported sources are `Website`, `Referral`, `LinkedIn`, `Social Media`, `Cold Call`, `Email`, and `Other`.

<a id="screenshots"></a>
## Screenshots

The supplied archive contains dashboard, lead-management, and profile screenshots. It did not include a login or signup screenshot, so none is fabricated here.

### Authentication

No authentication screenshot was included in the supplied archive.

### Dashboard and analytics

![LeadFlow CRM dashboard](docs/screenshots/dashboard.png)

### Lead management

**Leads list**

![Leads list with search, filters, and pagination](docs/screenshots/leads-list.png)

**Add a lead**

![Add lead form](docs/screenshots/add-lead.png)

**Edit a lead**

![Edit lead form](docs/screenshots/edit-lead.png)

**Delete confirmation**

![Delete lead confirmation dialog](docs/screenshots/delete-confirmation.png)

### User profile

![User profile page](docs/screenshots/profile.png)

<a id="technology"></a>
## Technology

| Area | Technologies used |
|---|---|
| Frontend | React `^19.2.6`, Vite `^8.0.12`, React Router `^7.16.0`, Axios `^1.17.0` |
| UI | Tailwind CSS `^4.3.0`, Framer Motion `^12.40.0`, Lucide React `^1.17.0`, React Hot Toast `^2.6.0` |
| Backend | Node.js, Express `^5.2.1`, Mongoose `^9.6.3`, CORS `^2.8.6`, dotenv `^17.4.2` |
| Authentication | bcryptjs `^3.0.3`, jsonwebtoken `^9.0.3` |
| Database | MongoDB, accessed through Mongoose |
| Testing | Node.js built-in test runner, Supertest `^7.3.2`, mongodb-memory-server `^11.2.0` |
| Deployment | Vercel for the frontend, Render for the API; MongoDB Atlas for the hosted database |

The client uses React for interactive forms and views, while Express provides a small JSON API. Mongoose models and queries keep validation and ownership rules close to the data. The dashboard charts are drawn with CSS and SVG; the project does not depend on a charting package.

<a id="architecture"></a>
## Architecture

The React single-page application calls the Express API through a shared Axios client. That client adds the stored JWT to protected requests. In production, it calls the same-origin `/api` path; Vercel forwards that path to the Render API. Local development can point the client directly at the local backend with `VITE_API_URL`.

The backend validates requests, verifies JWTs, scopes lead queries to the authenticated user, and reads or writes documents through Mongoose. Dashboard status counts and trend buckets are calculated by the API; source counts are derived from the user's lead records in the client.

```text
crm/
├── backend/
│   ├── config/          # MongoDB and JWT configuration
│   ├── controllers/     # HTTP request/response handling
│   ├── middleware/      # Authentication, 404, and error handling
│   ├── models/          # User and Lead schemas
│   ├── routes/          # Authentication and lead routes
│   ├── services/        # Business rules and database operations
│   ├── test/            # API, service, and startup tests
│   ├── .env.example
│   └── package.json
├── frontend/
│   └── crm/
│       ├── src/
│       │   ├── api/     # Shared API client and API functions
│       │   ├── components/
│       │   └── pages/   # Login, signup, dashboard, leads, and profile
│       ├── vercel.json # API proxy and SPA route fallback
│       └── package.json
└── docs/
    └── screenshots/
```

<a id="security-and-error-handling"></a>
## Security and error handling

- **Passwords:** Signup hashes passwords with bcryptjs using 12 rounds. The user schema excludes `passwordHash` from normal queries, and API responses are built from an explicit public user shape containing only the ID, name, and email.
- **Authentication:** The API signs HS256 JWTs with a one-hour expiry and the user ID in the `sub` claim. Protected routes verify the signature, algorithm, expiry, ObjectId subject, and that the user still exists.
- **Authorization:** Lead ownership is assigned by the server from the authenticated request. List, search, statistics, trends, update, delete, and single-lead queries are owner-scoped. A lead belonging to another user is returned as not found. Existing ownerless leads are not assigned to a user and are inaccessible through authenticated lead queries.
- **Input validation:** The backend validates signup credentials, lead fields, query parameters, IDs, and update allowlists. Search input is escaped before it is used as a regular expression. Pagination values must be positive integers, and the page size is capped at 100.
- **Secrets:** `JWT_SECRET` and `MONGO_URI` are read from the backend environment. Startup rejects a missing or too-short JWT secret and a missing MongoDB URI. Keep real environment files out of source control.
- **Login responses:** Invalid login attempts use a generic message; unknown-user attempts also perform a dummy bcrypt comparison. Duplicate normalized email registration returns a conflict response.
- **Errors:** Expected validation, authentication, conflict, and missing-resource errors use appropriate HTTP statuses and JSON shaped as `{ "success": false, "message": "..." }`. Unexpected server errors return a generic message; the central handler logs only safe diagnostic information.
- **Browser storage:** The frontend stores the JWT in `localStorage` and sends it as a Bearer token. Logout clears it client-side; there is no server-side token revocation or refresh-token flow.
- **Production API routing:** Vercel rewrites `/api/*` requests to the fixed Render API origin. This keeps browser API calls same-origin across changing Vercel preview URLs and avoids relying on a wildcard CORS policy.

This is a practical project-level security implementation, not an enterprise identity platform. For example, it does not include refresh-token rotation, server-side logout/revocation, MFA, or role-based access control.

<a id="run-locally"></a>
## Run locally

### Prerequisites

- Node.js and npm.
- MongoDB running locally, or a MongoDB Atlas database you are authorized to use.
- Git.

### 1. Get the repository

```bash
git clone https://github.com/lulgamer69/crm-assignment.git
cd crm-assignment
```

### 2. Install and configure the backend

```bash
cd backend
npm install
```

Create a local `.env` from the example:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

Edit `backend/.env` with your own local/development database URI and a private JWT secret of at least 32 UTF-8 bytes. Do not use production credentials in local development.

Start the API:

```bash
npm run dev
```

The backend listens on `http://localhost:5000` by default. Its health endpoint is `http://localhost:5000/health`.

### 3. Install and configure the frontend

Open a second terminal from the repository root:

```bash
cd frontend/crm
npm install
```

Create `frontend/crm/.env` for local development:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Start Vite:

```bash
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Register an account, then sign in. The backend's CORS configuration allows this local origin.

### Frontend scripts

Run from `frontend/crm/`:

```bash
npm run dev      # Start the Vite development server
npm run lint     # Run ESLint
npm run build    # Create the production build in dist/
npm run preview  # Preview a previously built dist/ bundle
```

### Backend scripts

Run from `backend/`:

```bash
npm start        # Start the API with node server.js
npm run dev      # Start the API with nodemon
npm test         # Run the Node.js test suite
```

<a id="environment-variables"></a>
## Environment variables

The backend example file is `backend/.env.example`. There is no committed frontend `.env.example`; for local development, create the frontend `.env` shown above. Frontend `VITE_*` values are public build-time configuration and must never contain secrets.

### Backend (`backend/.env`)

| Variable | Required | Purpose | Example placeholder |
|---|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection URI for the environment | `mongodb://127.0.0.1:27017/leadflow_crm` |
| `JWT_SECRET` | Yes | Signs and verifies API access tokens; minimum 32 UTF-8 bytes | `replace-with-a-private-random-secret-of-at-least-32-bytes` |
| `PORT` | No | HTTP listener port; defaults to `5000` | `5000` |

### Frontend (`frontend/crm/.env`)

| Variable | Purpose | Local example |
|---|---|---|
| `VITE_API_URL` | API base URL used by the Vite development build | `http://localhost:5000/api` |

Production uses `/api` on the frontend origin and Vercel's external rewrite; it does not need a browser-visible Render URL in `VITE_API_URL`.

<a id="api-reference"></a>
## API reference

All endpoints are prefixed with `/api`. Protected endpoints require:

```http
Authorization: Bearer <JWT>
```

Successful responses use `success: true`; errors use `{ "success": false, "message": "..." }`.

### Authentication and profile

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Create an account; returns a public user and JWT | No |
| `POST` | `/api/auth/login` | Verify credentials; returns a public user and JWT | No |
| `GET` | `/api/auth/me` | Get the authenticated user's public profile | Yes |
| `PATCH` | `/api/auth/me` | Update the authenticated user's name | Yes |

Signup body:

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "password": "a-private-password"
}
```

An account is created with HTTP `201`; malformed input returns `400`, and a duplicate normalized email returns `409`. Login returns `200` on success and the same generic `401` message for invalid credentials.

### Leads

All lead endpoints require authentication. The server derives the owner from the verified token; clients cannot assign or override it.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/leads` | Create a lead |
| `GET` | `/api/leads` | List/search/filter/paginate the user's leads |
| `GET` | `/api/leads/:id` | Get one owned lead |
| `PUT` | `/api/leads/:id` | Update an owned lead |
| `DELETE` | `/api/leads/:id` | Delete an owned lead |
| `GET` | `/api/leads/stats` | Get counts for the four supported statuses |
| `GET` | `/api/leads/trends?period=30d` | Get UTC lead-creation buckets |

`GET /api/leads` accepts `search`, `status`, `page`, and `limit`. Search checks name, email, and company as literal text. Status may be `New`, `Contacted`, `Qualified`, or `Lost`. Page defaults to `1`; limit defaults to `10` and cannot exceed `100`. Results are ordered by creation time descending, with `_id` descending as a tie-breaker. The response includes `count`, `totalLeads`, `totalPages`, `currentPage`, and `data`.

The list API does **not** accept a source query parameter. The current leads page applies its source filter client-side after collecting the matching paginated records; search and status are sent to the backend.

The statistics response includes `total`, `new`, `contacted`, `qualified`, and `lost`. Trend periods are `24h`, `7d`, `30d`, and `12m`; returned buckets use UTC. Unsupported periods return a validation error.

Lead creation body fields are `name`, `email`, `phone`, `company`, `source`, `status`, and optional `notes`. The server accepts only these fields and sets `owner` from the authenticated user. If status is omitted, it defaults to `New`.

<a id="data-model"></a>
## Data model

- **User:** `name`, normalized unique `email`, `passwordHash`, and timestamps. The password hash is excluded from ordinary query results.
- **Lead:** owner reference to a User, `name`, `email`, `phone`, `company`, `source`, `status`, optional `notes`, and timestamps. The owner reference is required for newly created leads.

Existing leads without an owner are preserved as-is. Since authenticated queries always filter by owner, these legacy documents remain inaccessible through user lead endpoints.

<a id="tests"></a>
## Tests

The backend uses `node --test`. `authService.test.js` covers schema and credential rules; `authApi.test.js` exercises HTTP authentication, ownership isolation, CRUD, validation, analytics, and safe errors; `serverStartup.test.js` covers startup configuration and database failures.

API and startup tests use `mongodb-memory-server` and Supertest. They create an isolated loopback MongoDB instance and restore environment variables after tests; they do not use the configured Atlas database. The frontend currently has lint/build scripts but no automated frontend test script.

Run the backend suite from `backend/`:

```bash
npm test
```

<a id="deployment"></a>
## Deployment

- **Frontend:** Vercel. The Vite project is under `frontend/crm/`; set that as the Vercel Root Directory. Its `vercel.json` forwards `/api/:path*` to the Render backend and falls back to `index.html` for SPA routes.
- **Backend:** Render, started with `npm start` from `backend/`.
- **Database:** MongoDB Atlas for the hosted environment; the connection URI is supplied through `MONGO_URI`.

Known application URLs supplied for this project:

- Frontend: [https://crm-assignment-w6gy.vercel.app](https://crm-assignment-w6gy.vercel.app)
- Backend API: [https://crm-assignment-j0bd.onrender.com](https://crm-assignment-j0bd.onrender.com)
- Backend health check: [https://crm-assignment-j0bd.onrender.com/health](https://crm-assignment-j0bd.onrender.com/health)

Set `MONGO_URI` and a private `JWT_SECRET` of at least 32 UTF-8 bytes in Render's environment settings. Vercel production requests use the same-origin `/api` proxy, so `VITE_API_URL` is only needed for local development. Never put the JWT secret or database URI in frontend environment variables.

<a id="limitations-and-next-steps"></a>
## Limitations and next steps

- JWTs expire after one hour; there is no refresh-token or server-side revocation flow.
- There is no role-based access control, MFA, lead export, or audit-log interface.
- Automated tests cover the backend; frontend behavior is currently checked with linting and production builds rather than a browser test suite.

<a id="project-reflection"></a>
## Project reflection

I am particularly proud of the security and error-handling practices I implemented in this project. A college teacher helped me understand why security matters in software development, and applying concepts like authentication, ownership checks and controlled error responses has been a valuable learning experience. I know this is a foundation, but it has given me a much better understanding of building applications responsibly.
