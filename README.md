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
