# Teacher Portfolio Website

A responsive teacher portfolio website for awards, classroom activities, student projects, cultural events, trips, and memories.

## Project files

- `index.html` — public portfolio website.
- `firebase-config.js` — Firebase web app initialization (Authentication + Firestore).
- `portfolio-data.js` — loads published gallery and award records from Firestore.
- `firebase-test.js` — optional Firestore connectivity diagnostic; it is not loaded by the public page.
- `images/` — website images.

## Publish on GitHub Pages

1. Upload the project files and folders to the root of your GitHub repository.
2. Open **Settings → Pages**.
3. Set Source to **Deploy from a branch**, choose `main` and `/(root)`.
4. Save and wait for GitHub Pages to publish the site.
5. In Firebase Authentication settings, ensure your GitHub Pages domain is listed under **Authorized domains** if you use Firebase Authentication on the site.

## Firestore collections

The public website reads only documents where `published` is `true`.

### `gallery`

Create one document per activity or memory. Suggested fields:

```json
{
  "title": "Science Exhibition",
  "year": "2025",
  "category": "Student Project",
  "date": "14 August 2025",
  "imageUrl": "https://your-image-host/image.jpg",
  "description": "Description shown when a visitor opens the photo.",
  "published": true
}
```

`imageUrl` should be a publicly accessible HTTPS image URL. Image upload/storage is not configured in this version.

### `awards`

Create one document per award. Suggested fields:

```json
{
  "year": "2025",
  "title": "Best Teacher Award",
  "detail": "Award details and recognition.",
  "published": true
}
```

The website sorts records by year (newest first). A record with `published: false` is not shown publicly.

## Security notes

- Keep Firestore rules enabled. Public reads should be restricted to documents with `published == true`; writes should remain admin-only.
- Never put Firebase service-account JSON, private keys, or passwords in this repository.
- Firebase web configuration is used by the browser; Firestore Security Rules and Authentication must protect the data.
- Do not enable broad public write permissions.

## Language

The current English/Marathi language controls retain the existing site's language helper behavior. Full manually authored Marathi translations can be added separately.

## Administrator dashboard

Open `https://varshabbadwar.github.io/admin.html` after publishing the files. Sign in using the Firebase Authentication Email/Password account whose UID is `Iv50JJ7KrNeREMftM70eqGmOWYJ3` (the same UID used by the Firestore rules). The dashboard supports adding, editing, publishing/unpublishing, and deleting records in `gallery`, `awards`, and `activities`.

### Required Firestore security rules

Keep administrator writes protected by the authenticated UID. The following rules are compatible with the dashboard and the public portfolio queries:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.uid == "Iv50JJ7KrNeREMftM70eqGmOWYJ3";
    }

    match /gallery/{documentId} {
      allow read: if isAdmin() || resource.data.published == true;
      allow write: if isAdmin();
    }
    match /awards/{documentId} {
      allow read: if isAdmin() || resource.data.published == true;
      allow write: if isAdmin();
    }
    match /activities/{documentId} {
      allow read: if isAdmin() || resource.data.published == true;
      allow write: if isAdmin();
    }
    match /profile/{documentId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Firestore rules are the actual security boundary. The UID check in `admin.js` only controls the user interface; it does not replace Firestore rules. Do not change the rules to allow public writes.

### Publish the update

Upload `admin.html` and `admin.js` alongside `index.html` and `firebase-config.js` in the repository root. Keep the `images` folder. Commit/push the files and wait for GitHub Pages to finish deployment. Then visit `/admin.html`.

### First admin test

1. Sign in with the authorized admin account.
2. Add a gallery record with a real HTTPS image URL and leave “Publish on public website” checked.
3. Save, then open the public homepage in another tab and confirm the item appears.
4. Edit the record and test unpublishing it. It should disappear from the public page but remain visible in the admin dashboard.

If sign-in fails, verify Email/Password is enabled in Firebase Authentication and that `varshabbadwar.github.io` is listed under Authentication → Settings → Authorized domains. If the dashboard can sign in but cannot read/write, verify the Firestore rules UID matches the signed-in account UID exactly.

**Image storage note:** this dashboard stores image URLs, not image files. It does not initialize Firebase Storage or require enabling billing. Choose and configure an image-hosting solution separately before adding direct uploads.
