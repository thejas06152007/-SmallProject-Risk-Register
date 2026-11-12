# SmallProject Risk Register

A project risk tracker for student and small business projects, backed by MongoDB. Each risk has a likelihood, impact, mitigation, owner and review date, and is ranked by a transparent score.

**Stack:** HTML, CSS and JavaScript frontend, Node.js + Express API, MongoDB (Mongoose).

## Scoring

Score = Likelihood x Impact (both rated 1 to 5, so scores run 1 to 25).

| Score | Rating   |
|-------|----------|
| 15-25 | Critical |
| 10-14 | High     |
| 5-9   | Medium   |
| 1-4   | Low      |

Equal scores rank by higher impact first, then by the earlier review date. Closed risks are not ranked.

## Run it locally

1. Install Node.js 18 or newer from nodejs.org.
2. Open this folder in VS Code and open the terminal (Ctrl+`).
3. Install packages: `npm install`
4. Open the `.env` file and set `MONGODB_URI` (see below).
5. Start the app: `npm start`
6. Open http://localhost:3000

The first time it connects to an empty database it loads 8 example risks. Use "Clear examples" to remove them.

## Connect MongoDB

**Option A: MongoDB Atlas (cloud, free tier)**
1. Create a free cluster at mongodb.com/atlas.
2. Database Access > Add Database User. Note the username and password.
3. Network Access > Add IP Address > Allow Access From Anywhere (0.0.0.0/0).
4. Database > Connect > Drivers. Copy the connection string.
5. Paste it in `.env` as `MONGODB_URI`, replacing the user and password. If the password has special characters, URL-encode them.

**Option B: MongoDB on your computer**
Install MongoDB Community Server and keep it running. The default `.env` value already points to it: `mongodb://127.0.0.1:27017/riskregister`

## Deploy on Vercel

1. Push this project to GitHub. The `.env` file is ignored by git on purpose, so your password is never uploaded.
2. On vercel.com, import the repository. Set Framework Preset to **Other** and leave build settings empty.
3. Before deploying, open Environment Variables and add `MONGODB_URI` with your Atlas connection string.
4. Deploy. The page is served from `public/` and the API runs from `api/index.js`.
5. In Atlas, make sure Network Access allows 0.0.0.0/0, because Vercel does not use a fixed IP.

## Project layout

- `public/`  frontend (index.html, style.css, app.js)
- `src/`     API routes, Mongoose models, database connection, example data
- `api/`     Vercel entry point
- `server.js` local server
- `.env`     your settings (not committed). `.env.example` shows the format.

## API

| Method | Path | What it does |
|--------|------|--------------|
| GET | /api/risks | List all risks |
| POST | /api/risks | Add a risk |
| PUT | /api/risks/:id | Update a risk (for example R-03) |
| DELETE | /api/risks/:id | Delete a risk |
| DELETE | /api/risks?examples=true | Remove example risks |
| POST | /api/seed | Load the example risks again |
| GET | /api/health | Check the database connection |
