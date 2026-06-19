# Classkick ISTE

A collection of small, self-contained static pages for conference activities — leaderboards, raffle-picker, schedules, info screens, and other one-off bits.

No build step, no backend, no frameworks. Each activity is just plain HTML/CSS/JS.

## How it works

Each activity lives in its own folder. GitHub Pages serves the repo at
`https://<username>.github.io/<repo>/`, so a folder maps directly to a URL path:

```
<repo>/
├── leaderboard/        →  /<repo>/leaderboard/
│   ├── index.html
│   ├── styles.css
│   ├── config.js
│   └── app.js
├── <next-activity>/    →  /<repo>/<next-activity>/
│   └── index.html
├── README.md
└── .gitignore
```

Every folder needs an `index.html`; GitHub serves it automatically (so the
trailing `index.html` never appears in the URL). Keep links within a page
relative (`styles.css`, not `/styles.css`) so each activity stays portable.

## Adding a new page

1. Create a folder named after the URL path you want, e.g. `mkdir signup`.
2. Drop an `index.html` (plus any CSS/JS) inside it.
3. Commit and push — it goes live at `…/<repo>/signup/`.

## Deploy

Enable once, under **Settings → Pages → Deploy from a branch → `main` / `/ (root)`**.
Pushes to that branch publish automatically.
