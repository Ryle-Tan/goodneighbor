# GoodNeighbor

**A community volunteering platform for Cagayan de Oro.** 

GoodNeighbor connects volunteers with verified local organizations (NGOs, barangays, LGUs and school orgs) running cleanups, tree plantings, feeding programs and other community activities around CDO.

> Final project for **ITCC 14**, Xavier University – Ateneo de Cagayan

---

## Features

| Role | What they can do |
|---|---|
| **Volunteer** | Browse activities on a list or map, join and cancel, track their activity history and volunteer hours |
| **Organizer** (verified organization) | Post and edit activities, see who registered, mark attendance |
| **Admin** | Review organizer applications, verify organizations, manage user accounts |

## Tech stack

| Part | Tools |
|---|---|
| Frontend | React + Vite, React Router, Axios, Leaflet (maps) |
| Backend | Node.js + Express, JWT auth, Zod validation |
| Database | PostgreSQL |
| Third-party API | Nominatim / OpenStreetMap (address → map coordinates) |

## Team

| Member | Role |
|---|---|
| **Tan, Frances Ryle** | Auth, users, admin verification |
| **Barnedo, Mhark Vincent** | Organizations + events |
| **Lim, Louiza Beatrice** | Registrations + attendance |
| **Tampus, Levi Nathaniel** | Frontend pages + map |

The detailed work split is in [docs/TEAM_SPLIT.md](docs/TEAM_SPLIT.md).

---

## Getting started

**You need:** Node.js 20+ and PostgreSQL 15+.

### 1. Database
```bash
createdb goodneighbor
psql -d goodneighbor -f server/db/schema.sql
```

### 2. Backend (port 3000)
```bash
cd server
npm install
cp .env.example .env    # then fill in your own values
npm run dev
```
Check it works: http://localhost:3000/api/health should show `"status": "ok"`.

### 3. Frontend (port 5173)
In a second terminal:
```bash
cd client
npm install
npm run dev
```
Open http://localhost:5173

---

## Project structure

```
goodneighbor/
├── client/              React frontend
│   └── src/
│       ├── pages/       one folder per area (public, auth, volunteer, organizer, admin)
│       ├── components/  shared UI
│       ├── context/     login state (AuthContext)
│       └── api.js       API client
├── server/              Express backend
│   ├── src/
│   │   ├── routes/      one file per module
│   │   └── middleware/  auth checks
│   ├── db/schema.sql    database tables
│   └── docs/            API spec (OpenAPI)
└── docs/                team docs
```

## API documentation

The full API spec (27 endpoints) is in [server/docs/ITCC14API_GoodNeighbor.yaml](server/docs/ITCC14API_GoodNeighbor.yaml). To browse it more easily, paste it into [editor.swagger.io](https://editor.swagger.io).

## Progress

- [x] Express server + database connection
- [x] Auth (register, login, current user)
- [x] Login / Sign up page
- [ ] Organizer applications + admin verification
- [ ] Events + organizations
- [ ] Registrations + attendance
- [ ] Explore page + map
- [ ] Organizer and admin dashboards
- [ ] Landing page
