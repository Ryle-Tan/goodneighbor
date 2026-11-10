# GoodNeighbor: Team Guide

## Who does what

| Member | Module | Backend file | Endpoints |
|---|---|---|---|
| **TAN** | Auth, users, admin verification | `server/src/routes/auth.js`, `users.js`, `applications.js` | Auth (3), Users (4), Organizer Applications (4) |
| **BARNEDO** | Groups (organizations) + events CRUD | `server/src/routes/organizations.js`, `events.js` | Organizations (5), Events (5) |
| **LIM** | Registrations + attendance | `server/src/routes/registrations.js` | Registrations (5) |
| **TAMPUS** | Frontend pages + map (Leaflet / Nominatim) | `client/` + `server/src/routes/geocode.js` | Geocode (1) |

The full API spec is `server/docs/ITCC14API_GoodNeighbor.yaml`. **Follow it exactly.** Open it in [editor.swagger.io](https://editor.swagger.io) to read it more easily.

## Setup (first time)

1. `cd server && npm install`
2. Copy `server/.env.example` to `server/.env` and fill in your own values
3. Create your local database and run `server/db/schema.sql` once
4. `npm run dev`, then open http://localhost:3000/api/health. You should see `"status": "ok"`

## Rules everyone follows

- **Errors** are always `{ "error": "message" }`
- **Lists** are `{ "data": [], "meta": { "page", "limit", "total" } }`
- **Login token** goes in the header: `Authorization: Bearer <token>`
- **Database:** use `const db = require('../db')` and always use `$1, $2` parameters, never paste user input into SQL
- **Never commit `.env`**
- Only edit your own files. If you need to change a shared file (`index.js`, `db.js`, `schema.sql`), tell the group first.

## Decisions already made

- An event with registrations can't be deleted. Set `status = cancelled` instead.
- Admin deleting an organization is a soft delete (`deleted_at`) and cancels its upcoming events.
- Approving an application makes the user an organizer and creates their organization automatically.
- One organization per organizer.
- Slots: `registered` + `attended` count toward slots. Slots can't be edited below that count.
- Cancelling a registration sets `status = cancelled` (history is kept). Re-registering creates a new row.
- Event `PUT` also accepts `status`.


