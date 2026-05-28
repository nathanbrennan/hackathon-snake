# Hackathon Snake

A browser-based version of the classic Snake game, built as a static site so it can be hosted on GitHub Pages.

## Features

- Classic Snake gameplay on a 20x20 board
- Keyboard controls (Arrow keys or WASD)
- Touch controls for mobile
- Score, best score (saved in local storage), and dynamic speed display
- Pause/resume with Space or the Pause button

## Run Locally

Because this project is plain HTML/CSS/JS, you can open `index.html` directly in your browser.

If you prefer a local server, run this from the repo root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy To GitHub Pages

1. Commit and push this repository to GitHub.
2. In your GitHub repo, go to **Settings** -> **Pages**.
3. Under **Build and deployment**, set:
	- **Source**: `Deploy from a branch`
	- **Branch**: `main` (or your default branch)
	- **Folder**: `/ (root)`
4. Click **Save**.
5. Wait about 1-2 minutes for deployment.

Your site URL will be:

`https://<your-github-username>.github.io/hackathon-snake/`

## Controls

- Move: Arrow keys / WASD
- Pause/Resume: Space or Pause button
- Restart: Restart button
