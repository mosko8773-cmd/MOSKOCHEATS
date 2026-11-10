MOSKO WIRE - HTML FRONTEND + FIREBASE HOSTING BACKEND

Files:
- public/index.html : HTML + JavaScript login UI
- functions/index.js : server-side Firebase validation, raw config.json response, Happ link API
- firebase.json : Hosting rewrite rules
- functions/package.json : Cloud Functions dependencies

IMPORTANT: A static HTML-only site cannot securely serve a dynamic config.json endpoint or keep server-side verification. This package uses HTML for the UI and Firebase Cloud Functions for the dynamic endpoint.

INSTALL:
1. Install Node.js 20 and Firebase CLI.
2. In this project folder run:
   firebase login
   firebase use --add
   cd functions && npm install && cd ..
3. Set the public website base URL as the Functions environment variable PUBLIC_SITE_URL (for example https://YOUR-PROJECT.web.app).
   Use your Firebase Functions environment/secrets configuration appropriate to your CLI version.
4. Deploy:
   firebase deploy --only functions,hosting

DATABASE:
Assumed key path: /keys/{KEY}
Example record:
{
  "keyStatus": "ACTIVE",
  "status": "ACTIVE",
  "firstLogin": 1790000000000,
  "durationValue": 12,
  "durationUnit": "hours"
}
Accepted absolute expiry fields: expiresAt, expireAt, expiredAt, expiry, validUntil (seconds or milliseconds).
If your Firebase key path differs, change "keys/" in functions/index.js and index.html.

SECURITY:
- The Firebase Web API key is not a database secret.
- Do not make the entire database public. Cloud Function uses Admin SDK and validates the key server-side.
- The browser currently reads the key node to give immediate login feedback; set Firebase rules to allow only the required key lookup, or remove the browser read and rely solely on createHappLink server validation.
- Happ crypto endpoint response parsing is defensive; verify its current API contract if it changes.
- Dynamic config endpoint rechecks Firebase each request and returns expired config when the key is expired/inactive.
