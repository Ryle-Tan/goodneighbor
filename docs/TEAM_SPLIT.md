# GoodNeighbor: Team Split

Each person owns a **slice**: their screens, and where possible the backend endpoints and tables behind them. Stay in your own folders and you won't block anyone or cause merge conflicts.

The API contract is `server/docs/ITCC14API_GoodNeighbor.yaml`. **Follow it exactly.** To read it more easily, paste it into [editor.swagger.io](https://editor.swagger.io).

---

## 1. Who does what (summary)

| Member | Slice | Screens | Backend | Effort |
|---|---|---|---|---|
| **TAN** | Auth, Admin + login foundation | 4, 13, 14 (Users tab) + Apply-as-organizer form | Auth (3), Users (4), Organizer Applications (4) | 🔴 High |
| **BARNEDO** | Organizer | 10, 11, 12 (page + event status), 14 (Activities tab) | Organizations (5), Events (5) | 🔴 High |
| **LIM** | Volunteer | 5, 6, 7, 8, 12 (registrants/attendance table) | Registrations (5) | 🟡 Medium |
| **TAMPUS** | Public, Discover + shared UI | 1, 2, 3, 9 + all shared components + map | Geocode (1) | 🟡 Medium–High |

**The one exception to "own your whole slice":** TAMPUS's public pages read events and organizations, but BARNEDO owns that backend. This way only one person ever edits `events.js` and `organizations.js`. TAMPUS uses those endpoints and doesn't edit them.

---

## 2. Each member in detail

### TAN: Auth, Admin + login foundation

| | |
|---|---|
| **Screens** | 4 Sign up / Log in · Apply as organizer · 13 Admin Overview + verification queue · 14 Admin **Users** tab |
| **React routes** | `/login` · `/signup` · `/apply` · `/admin` · `/admin/manage` (Users tab) |
| **Pages folder** | `client/src/pages/auth/` · `client/src/pages/admin/` |
| **Components** | `AuthForm`, `RoleToggle` (Volunteer / Organization), `ApplicationForm`, `VerificationQueue`, `UsersTable` |
| **Shared things owned** | `client/src/api.js` · `client/src/context/AuthContext.jsx` · `ProtectedRoute.jsx` · `client/src/App.jsx` (routes) · `server/src/middleware/auth.js` · `server/src/index.js` · `server/db/schema.sql` |
| **Backend files** | `server/src/routes/auth.js` · `users.js` · `applications.js` |
| **DB tables** | Owns `users`, `organizer_applications`. When an application is approved, also **inserts** into `organizations`. |

| Endpoints | |
|---|---|
| `POST /api/auth/register` | `POST /api/auth/login` |
| `GET /api/auth/me` | `GET /api/users` |
| `PUT /api/users/me` | `GET /api/users/{id}` |
| `PATCH /api/users/{id}` (suspend / reinstate) | `POST /api/organizer-applications` |
| `GET /api/organizer-applications` | `GET /api/organizer-applications/{id}` |
| `PATCH /api/organizer-applications/{id}` (approve / reject) | |

> **Sign up as "Organization":** per the spec, everyone signs up as a volunteer first. Picking "Organization" creates the account and then sends the user to `/apply` to fill in the organizer application.

### BARNEDO: Organizer

| | |
|---|---|
| **Screens** | 10 Organizer Overview · 11 Create / Edit Activity · 12 Manage Activity (page, event info, status buttons) · 14 Admin **Activities** tab |
| **React routes** | `/organizer` · `/organizer/activities/new` · `/organizer/activities/:id/edit` · `/organizer/activities/:id` · `/admin/manage` (Activities tab) |
| **Pages folder** | `client/src/pages/organizer/` |
| **Components** | `OrganizerSidebar` content, `ActivityForm` (step 1 Basics → 2 Date & Place → 3 Requirements → 4 Slots), `OrgStatsRow`, `ActivitiesTable`, `EditOrgProfileForm` |
| **Backend files** | `server/src/routes/organizations.js` · `events.js` |
| **DB tables** | Owns `organizations`, `events` |

| Endpoints | |
|---|---|
| `GET /api/organizations` | `GET /api/organizations/{id}` |
| `PUT /api/organizations/{id}` | `DELETE /api/organizations/{id}` (admin, soft delete) |
| `GET /api/organizations/{id}/events` | `GET /api/events` (filters: `q`, `category`, `from_date`, `to_date`, `status`) |
| `POST /api/events` | `GET /api/events/{id}` |
| `PUT /api/events/{id}` (also accepts `status`) | `DELETE /api/events/{id}` |

> **Uses from others:** `LocationPicker` map (TAMPUS) and `/api/geocode` (TAMPUS) in step 2 of the form. `RegistrantsTable` (LIM) inside Manage Activity.
> `GET /api/events` must return `registered_count` and `available_slots`, because the cards and slot counts on every screen depend on them.

### LIM: Volunteer

| | |
|---|---|
| **Screens** | 5 Join flow (confirm modal + success) · 6 My Activities · 7 Impact · 8 Volunteer Profile · 12 the registrants / attendance table inside Manage Activity |
| **React routes** | `/my-activities` · `/impact` · `/profile` |
| **Pages folder** | `client/src/pages/volunteer/` |
| **Components** | `JoinModal`, `JoinSuccess`, `MyActivityRow`, `ImpactStats`, `ProfileCard`, `EditProfileForm`, `RegistrantsTable` (exported for BARNEDO's Manage page) |
| **Backend files** | `server/src/routes/registrations.js` |
| **DB tables** | Owns `registrations`. Reads `events` to check slots. |

| Endpoints | |
|---|---|
| `POST /api/events/{id}/registrations` (slot rule!) | `GET /api/events/{id}/registrations` |
| `GET /api/users/me/registrations` | `PATCH /api/registrations/{id}` (mark attended / absent) |
| `DELETE /api/registrations/{id}` (sets `cancelled`) | |

> **Uses from others:** `PUT /api/users/me` (TAN) for Edit Profile.
> **Impact page:** compute hours from your `attended` registrations (`ends_at − starts_at`) on the frontend. No new endpoint needed.

### TAMPUS: Public, Discover + shared UI

| | |
|---|---|
| **Screens** | 1 Landing · 2 Explore (search, filter chips, cards, List/Map toggle) · 3 Activity Details · 9 Organization public page |
| **React routes** | `/` · `/explore` · `/activities/:id` · `/organizations/:id` |
| **Pages folder** | `client/src/pages/public/` |
| **Shared components owned** | `client/src/components/`: `Navbar`, `Sidebar` (shell only), `Layout`, `Button`, `Tag` (cause), `StatusBadge`, `ActivityCard`, `Modal`, `EmptyState`, `Logo`, `StatCard`, `MapView`, `LocationPicker` |
| **Design tokens** | `client/src/index.css`: colors, fonts, radius, as CSS variables |
| **Backend files** | `server/src/routes/geocode.js` |
| **DB tables** | None |

| Endpoints | |
|---|---|
| `GET /api/geocode?q=` (calls Nominatim; send a `User-Agent`, max 1 request/sec) | Uses: `GET /api/events`, `GET /api/events/{id}`, `GET /api/organizations/{id}`, `GET /api/organizations/{id}/events` (BARNEDO) |

> The Activity Details "Join activity" button opens LIM's `JoinModal`.

---

## 3. Shared things: who owns them and what comes first

| Shared thing | Owner | Needed by | When |
|---|---|---|---|
| `server/src/index.js`, `db.js` | TAN | Everyone | ✅ Done |
| `server/db/schema.sql` | TAN | Everyone | ✅ Done (changes need group agreement) |
| `requireAuth` / `requireRole` middleware | TAN | Everyone's protected routes | **Phase 0** |
| `client/src/api.js` (axios + token header) | TAN | All pages | **Phase 0** |
| `AuthContext` (current user, login, logout) + `ProtectedRoute` | TAN | All logged-in pages | **Phase 0** |
| `App.jsx` routes skeleton (placeholder pages for every route) | TAN | Everyone | **Phase 0** |
| Install client packages (see ⚠️ below) | TAN | Everyone | **Phase 0** |
| Design tokens in `index.css` | TAMPUS | All pages | **Phase 0** |
| `Button`, `Tag`, `StatusBadge`, `ActivityCard`, `Modal`, `Layout`, `Navbar`, `Sidebar` | TAMPUS | All pages | **Phase 0** |
| `GET /api/events` + `GET /api/events/{id}` | BARNEDO | TAMPUS, LIM | **Phase 1, early** |
| `LocationPicker` + `/api/geocode` | TAMPUS | BARNEDO's form | Phase 1 |
| `RegistrantsTable` | LIM | BARNEDO's Manage page | Phase 2 |

> ⚠️ **Heads-up:** `client/package.json` does **not** list `react-router-dom`, `axios`, `leaflet` or `react-leaflet`, so they aren't actually installed. Run `cd client && npm install react-router-dom axios leaflet react-leaflet` in Phase 0.

---

## 4. Build order

| Phase | TAN | BARNEDO | LIM | TAMPUS |
|---|---|---|---|---|
| **0: Foundation** (first ~3 days) | Auth backend + middleware, `api.js`, `AuthContext`, routes skeleton, install packages | Start `events.js` (GET list + detail, POST). Test with Postman. | Start `registrations.js`. Insert test events with SQL. | Design tokens + shared components + `Layout` / `Navbar` |
| **1: Core flows** | Login / Sign up pages, Apply form + `POST` application | Rest of Events + Organizations endpoints | Join modal, My Activities, cancel | Explore (list view), Activity Details, Geocode endpoint + `LocationPicker` |
| **2: Dashboards** | Admin Overview + verification queue, Users tab, approve flow | Organizer Overview, Create / Edit form, Manage page, Admin Activities tab | `RegistrantsTable` (attendance), Impact, Profile | Explore map view, Organization page |
| **3: Polish** | Everyone: Landing page (TAMPUS), empty states, error messages, demo seed data, test the whole flow together | | | |

**Dependencies (who waits on whom):**
- Everyone's **protected pages** need TAN's `AuthContext` and middleware (Phase 0). Until then, build the page UI with fake data.
- TAMPUS and LIM need BARNEDO's `GET /api/events` → BARNEDO does this **first**.
- BARNEDO's form step 2 needs TAMPUS's `LocationPicker`. Until then, use plain lat/lng inputs.
- BARNEDO's Manage page needs LIM's `RegistrantsTable`. Until then, leave a placeholder box.

---

## 5. Folder structure

```
client/src/
  api.js                 TAN
  App.jsx                TAN (routes)
  index.css              TAMPUS (design tokens)
  context/               TAN
  components/            TAMPUS (shared UI)
  pages/public/          TAMPUS
  pages/auth/            TAN
  pages/admin/           TAN (Users tab) + BARNEDO (Activities tab file)
  pages/organizer/       BARNEDO
  pages/volunteer/       LIM

server/src/
  index.js, db.js        TAN
  middleware/auth.js     TAN
  routes/auth.js, users.js, applications.js    TAN
  routes/organizations.js, events.js           BARNEDO
  routes/registrations.js                      LIM
  routes/geocode.js                            TAMPUS
```

---

## 6. Branches and rules to avoid merge conflicts

**Branch names:** `name/what-you-did`, all lowercase, for example:
- `tan/auth-backend`
- `barnedo/events-crud`
- `lim/join-flow`
- `tampus/explore-map`

**Rules:**
1. **Only edit your own folders and files** (see section 5).
2. **Shared files** (`App.jsx`, `index.js`, `schema.sql`, `api.js`, `components/`) can only be changed by their owner. If you need something changed, message the owner.
   - `App.jsx` and `server/src/index.js` have one marked section per person (`// --- LIM ---`). You **may** add your own route lines inside your section only.
3. **Pull `main` before you start working each day.** Keep branches short (1–3 days), and make one pull request per feature.
4. **Someone else reviews** your pull request before it's merged to `main`.
5. **Never commit `.env`.** Copy `server/.env.example` instead.
6. **Changing the database:** agree with the group first. TAN updates `schema.sql`, and everyone resets their local database.

**Shared API rules:**
- Errors: `{ "error": "message" }`
- Lists: `{ "data": [], "meta": { "page", "limit", "total" } }`
- Token: `Authorization: Bearer <token>`
- SQL: always use `$1, $2` parameters, never paste user input into a query

**Decisions already made:**
- An event with registrations can't be deleted. Set `status = cancelled` instead.
- Admin deleting an organization is a soft delete (`deleted_at`) and cancels its upcoming events.
- Approving an application makes the user an organizer and creates their organization automatically.
- One organization per organizer.
- Slots: `registered` + `attended` count toward slots. Slots can't be edited below that count.
- Cancelling a registration sets `status = cancelled` (history is kept). Re-registering creates a new row.

---

## 7. Design vs API: what to drop or simplify

The design shows some things that are **not in the API spec or database**. Keeping it simple: **don't build these** unless everything else is done.

| In the design | Why it's a problem | Do this instead |
|---|---|---|
| "Pending approval", Approve / Decline join requests | Registrations have no "pending" status | Joining is instant. Statuses are registered / attended / absent / cancelled. |
| "Draft" activity status | Events can only be upcoming / cancelled / completed | Skip drafts |
| "Saved" tab, "Remind me 1 day before", Share | Not in the spec | Hide them |
| Barangay on users, "Near me", barangay filter | There's no barangay field | Use the `q` search (it matches the address) |
| Badges, milestones, certificate PDF | No data for them | Impact shows hours + activities joined only |
| Messages, Reports, Settings, "Message all participants" | No endpoints | Hide these menu items |
| Landing / admin stats, admin bar chart | No stats endpoint | Use `meta.total` from list endpoints, or hardcode the landing numbers |
| Volunteer interests and location | Not in the users table | Show name, email, phone |
| Featured activity | No field for it | Show the soonest upcoming event as featured |

---

## 8. Workload check

- **TAN and BARNEDO are the heaviest.** TAN has 11 endpoints plus the login foundation. BARNEDO has 10 endpoints plus the 4-step form.
- **LIM is the lightest** (5 endpoints).
- **If TAN falls behind:** LIM takes the **Admin Users tab** (frontend only, using TAN's endpoints).
- **If BARNEDO falls behind:** LIM builds the **whole Manage Activity page**, since most of it is the registrants table anyway.
- Check in every few days. If you're stuck for more than a day, say so in the group chat.
