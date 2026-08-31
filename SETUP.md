# Keyholder public status page — setup

## 1. Create the repo
- New GitHub repo (public — required for free-plan Pages; see note below on why this is fine).
- Upload the 7 files in this folder to the repo root: `index.html`, `style.css`, `app.js`,
  `robots.txt`, `status.json`, `profile.json`, `history.json`.

## 2. Enable GitHub Pages
- Repo → **Settings → Pages**.
- Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
- Save. Your URL will be `https://<username>.github.io/<repo-name>/`.

## 3. Create a fine-grained Personal Access Token
- GitHub → Settings (your account, not the repo) → **Developer settings → Personal access
  tokens → Fine-grained tokens → Generate new token**.
- **Repository access**: "Only select repositories" → pick this one repo.
- **Permissions**: Repository permissions → **Contents: Read and write**. Leave everything
  else at "No access."
- Generate, copy the token immediately (GitHub only shows it once).

## 4. Configure the app
- Keyholder app → Settings → Public status page → Configure.
- Enter your GitHub username, the repo name, and the token. Save.
- Toggle "Automatically publish" if you want it to update on every start/end plus once a day
  (piggybacked on the 8am reminder) — or leave it off and use the "Publish now" button whenever
  you want.

## On privacy
GitHub's free plan requires the *repository* to be public in order to use Pages at all — but
this doesn't actually matter for privacy here, because **the published page's content is public
either way**, even on a paid plan with a private repo (that's the entire point of publishing
it). Paying for a private repo would only hide the repo's file browser and commit history — not
the status/history data itself, which is what you'd actually care about keeping unlisted.

What this setup *does* do to keep it low-key:
- `robots.txt` disallows all crawlers, and the page has a `noindex` meta tag — so it won't show
  up in Google/Bing search results. It's reachable only by someone with the direct link.
- Nothing links to it from anywhere public unless you share the link yourself.

If you'd rather make the repo name/URL itself non-obvious (so even a browse of your GitHub
profile doesn't hint at it), pick a repo name that doesn't reference the app or topic.
