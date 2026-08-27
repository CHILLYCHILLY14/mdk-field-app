# MDK Field App

A mobile-first web version of the MDK Electric field app. It creates and manages work orders, weekly timesheets, and quotes in any modern browser.

## What it includes

- Work orders with materials, labour, expenses, totals, HST, authorization, and notes
- Weekly timesheets with regular, 1.5×, and 2× hours plus expenses
- Quotes with billing/shipping addresses, line items, discounts, tax, and CAD/USD totals
- Branded PDF download and mobile share-sheet support
- Automatic document numbering and editable company defaults
- Search, edit, status tracking, and confirmed deletion
- Full JSON backup export and restore
- Mobile-first layout, desktop sidebar, installable PWA, and offline app shell
- Automatic GitHub Pages deployment

## Important data note

Documents are stored in the current browser using `localStorage`. There is no server, account, database, or analytics service. Data does not automatically sync between devices or browsers. Export a full backup regularly from **More → Files & backups**.

Clearing browser/site data removes locally stored records. GitHub and Wix host only the app files; they do not receive the documents entered in the app.

## Run locally

No build is required.

```bash
npm test
npm run serve
```

Then open `http://localhost:4173`.

## Publish with GitHub Pages

1. Create a GitHub repository named `mdk-field-app` and place these files on its `main` branch.
2. Push to `main` or run **Deploy to GitHub Pages** from the Actions tab.
3. The workflow enables GitHub Pages and publishes the site automatically.
4. The expected address is `https://CHILLYCHILLY14.github.io/mdk-field-app/`.

The included workflow validates the JavaScript and publishes the static app.

## Add it to Wix

See [WIX_SETUP.md](WIX_SETUP.md) for embed and mobile linking instructions.

## Browser support and native-app differences

- PDF download works in current Safari, Chrome, Edge, and Firefox.
- Sharing a PDF file uses the Web Share API where the browser supports file sharing. Otherwise the app downloads the PDF so it can be attached manually.
- The app can be added to a phone's home screen from the browser's Share or Install menu.
- A static website cannot reproduce the iOS app's native Face ID/passcode lock. Use device security and keep the GitHub repository private if the source itself should not be public. The saved customer data remains only in each user's browser.

## Project structure

```text
index.html                 App entry point
app.js                     Interface and document workflows
data.js                    Models, calculations, storage, backups
pdf.js                     Branded PDF generation and sharing
styles.css                 Mobile-first responsive design
assets/                    MDK logo and app icons
vendor/jspdf.umd.min.js    Local PDF library (jsPDF)
.github/workflows/         GitHub Pages deployment
```

## License notice

The MDK name, logo, and company content belong to MDK Electric Ltd. The bundled jsPDF library retains its upstream MIT license header.
