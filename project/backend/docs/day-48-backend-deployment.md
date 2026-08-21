# Day 48 — Deploying the Backend

## Deployment platform used

*(Render or Railway — fill in which one you used.)*

## Pre-deployment prep (already done in this repo)

- `requirements.txt` updated with everything the backend actually
  imports now, including the ML stack, pinned to the versions the
  `.pkl` was trained with so unpickling can't silently break on a
  different library version:
  ```
  flask
  flask-cors
  mysql-connector-python
  werkzeug
  python-dotenv
  gunicorn
  scikit-learn==1.8.0
  pandas==3.0.2
  numpy==2.4.4
  ```
- `Procfile` added: `web: gunicorn app:app --bind 0.0.0.0:$PORT` — this
  is the actual command Render/Railway will run, not `python app.py`.
- `app.py`'s `if __name__ == "__main__":` block now reads `PORT` from
  the environment and binds `0.0.0.0` instead of the Flask default
  `127.0.0.1` — matters if you ever run it directly rather than through
  gunicorn.
- `.env` is git-ignored (`.gitignore` already had this); `.env.example`
  documents which variables are needed without real values.
- No secrets are hardcoded anywhere in `app.py`/`db.py` — DB credentials
  come from `.env` via `python-dotenv`.

## Build command

```
pip install -r requirements.txt
```

## Start command

```
gunicorn app:app --bind 0.0.0.0:$PORT
```

*(Render/Railway both auto-detect the `Procfile` — you shouldn't need to
type this manually, but it's here in case the platform asks.)*

## Environment variables to set on the platform

*(Copy the keys from `.env.example`, filled with your actual production
values — set as secrets in Render/Railway's dashboard, never committed.)*

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PORT` — usually auto-set by the platform, don't set manually unless required

## MySQL for production

Your local MySQL isn't reachable from Render/Railway. Either:
- use a managed MySQL add-on the platform offers, or
- use a separate hosted MySQL (PlanetScale, Railway's own MySQL, etc.)

Update `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` to point there instead
of `localhost`.

## Live backend URL

*(Fill in after deploying, e.g. `https://your-service.onrender.com`.)*

## API endpoints tested (live)

| Endpoint | Method | Result | Status |
|---|---|---|---|
| `/api/students` | GET | | |
| `/api/predict` | POST (valid input) | | |

*(Test both against the live URL in Postman — same requests as the Day
45/46 collection, just with `base_url` changed to the live URL instead
of `http://127.0.0.1:5000`. Screenshot both.)*

## Problems encountered / solutions

*(Fill in as you go — common ones: CORS errors if the frontend origin
isn't allowed, model file not found if `ml/dropout_model.pkl` wasn't
committed, build failing if a dependency version isn't available on the
platform's Python version.)*

## Connecting the frontend

`frontend/innolift/src/apiBase.js` reads `VITE_API_BASE_URL` — set this
to your live backend URL (e.g. in a `.env.production` file in
`innolift/`, or as a build-time env var on whatever platform hosts the
frontend) and rebuild (`npm run build`). No code changes needed —
`StudentForm.jsx`, `StudentDirectory.jsx`, and `PredictionForm.jsx` all
already read from this shared constant instead of a hardcoded URL.
