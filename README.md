# Ms. Varsha Badwar – Teacher Portfolio

This project uses GitHub Pages for the public website, Firebase Authentication for the admin login, Firestore for portfolio records, and a Cloudflare Worker as a secure GitHub image-upload gateway.

## Project files

- `index.html` – public portfolio page (existing Maharashtrian-inspired design retained)
- `admin.html` / `admin.js` – administrator dashboard for gallery and award records
- `firebase-config.js` – Firebase web app configuration (web API key is intended for client use; access is controlled by Authentication and Firestore rules)
- `portfolio-data.js` – loads only published gallery and award documents
- `cloudflare-worker/worker.js` – validates Firebase ID tokens and uploads image bytes to GitHub using a server-side token

## Firestore structure

### `gallery`

Fields: `title` (string), `year` (string or number), `category` (string), `date` (string), `description` (string), `imageUrl` (string), `published` (boolean), `createdAt` (timestamp), `updatedAt` (timestamp).

### `awards`

Fields: `title` (string), `year` (string or number), `detail` (string), `published` (boolean), `createdAt` (timestamp), `updatedAt` (timestamp).

Public queries always include `where('published', '==', true)`. Firestore rules must allow reads of published records and writes only by the authorized admin UID. Keep the admin UID in the rules aligned with `Iv50JJ7KrNeREMftM70eqGmOWYJ3`.

## Deploy the website

1. Copy the contents of this project folder into the root of the GitHub Pages repository.
2. Keep your existing `images/profile.jpeg` and any other real portfolio assets. The `images/gallery/` folder is where new uploads will be committed.
3. Push the website files to the branch configured for GitHub Pages (the Worker config defaults to `main`; change it if your repository uses another branch).
4. In Firebase Authentication, ensure the GitHub Pages domain is an authorized domain.
5. Keep the existing Firestore rules restrictive. Do not use public write access.

## Deploy the secure GitHub image upload Worker

The browser must never receive a GitHub Personal Access Token. Deploy `cloudflare-worker/worker.js` as a Cloudflare Worker.

1. Create a Cloudflare account and install Wrangler (`npm install -g wrangler`).
2. From the `cloudflare-worker` folder, run `wrangler login`.
3. Create a GitHub fine-grained personal access token scoped ONLY to the portfolio repository, with **Contents: Read and write** permission. Prefer an expiration and rotate it periodically.
4. Set Worker secrets (never put these values in `admin.js`):

   ```bash
   wrangler secret put GITHUB_TOKEN
   wrangler secret put FIREBASE_API_KEY
   ```

   `FIREBASE_API_KEY` is the web API key from `firebase-config.js`. It is used by the Worker to ask Firebase Identity Toolkit to validate the caller's ID token; it is not a service-account key.

5. Check `wrangler.toml` and update `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`, `ADMIN_UID`, and `ALLOWED_ORIGIN` if your actual repository/branch/domain differs.
6. Deploy with `wrangler deploy` and copy the Worker URL (for example `https://varsha-portfolio-image-uploader.<your-subdomain>.workers.dev`).
7. Open `admin.js` and replace `https://REPLACE-WITH-YOUR-WORKER.workers.dev` in `WORKER_URL` with your deployed Worker URL.
8. Commit and push the updated `admin.js`.

The Worker accepts only POST `/upload`, validates the Firebase ID token through Firebase Identity Toolkit, checks the exact administrator UID, enforces JPG/PNG/WebP and a 5 MB limit, and then commits the image to `images/gallery/<year>/` in the configured GitHub repository.

## Important security notes

- Never commit `GITHUB_TOKEN`, Firebase service-account JSON, or passwords.
- The GitHub repository and uploaded images are public when the repository is public. Visitors can view/download images, but cannot modify the repository merely because it is public.
- A GitHub token with Contents write access can modify repository contents if compromised. Keep it only as a Cloudflare Worker secret, scope it to this single repository, and rotate/revoke it if exposed.
- Restrict Firestore writes to the administrator UID. The dashboard checks the UID in the browser for usability, but Firestore rules remain the actual database security boundary.
- Deleting a gallery record currently deletes only the Firestore document. Its GitHub image is intentionally retained to avoid accidental image loss; remove unused image files from the repository separately after verifying they are no longer referenced.
- GitHub Pages and Cloudflare have usage limits. This design avoids Firebase Storage/Cloudinary billing but is not unlimited storage or bandwidth.

## Notes

The existing profile image path in the HTML is `images/profile.jpeg`. If that asset is not present in your repository, add the correct profile photo at that path or update the image path in `index.html`.
