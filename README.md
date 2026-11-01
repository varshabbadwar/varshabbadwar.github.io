# Teacher Portfolio Website

A responsive teacher portfolio website for awards, classroom activities, student projects, cultural events, trips, and memories.

## Publish on GitHub Pages

1. Create a new public GitHub repository named `teacher-portfolio`.
2. Upload `index.html` from this folder.
3. Go to Settings → Pages.
4. Set Source to **Deploy from a branch**, Branch to **main**, Folder to **/ (root)**.
5. Click Save and wait 1–3 minutes.
6. Open the GitHub Pages link shown by GitHub.

## Add photos

Create or use the included `images` folder. Upload photos there and update the `items` array in `index.html`:

```js
{
  title: "Science Exhibition 2026",
  year: "2026",
  category: "Student Project",
  date: "14 August 2026",
  image: "images/science-exhibition.jpg",
  description: "Write the description shown when a visitor clicks the photo."
}
```

## Language

The English and Marathi buttons use Google Translate after the website is hosted publicly. For local testing in Chrome, right-click the page and choose Translate to Marathi.
