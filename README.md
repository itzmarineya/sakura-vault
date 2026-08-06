# Sakura VM Loader on Netlify

The VM browser needs a server-side function to load sites that do not permit normal iframe embedding. This project now includes it at:

- `netlify/functions/vm-proxy.js`
- `netlify.toml`

## Important
A plain drag-and-drop/static HTML deploy does **not** deploy Netlify Functions. Deploy the whole project with Netlify CLI or connect the folder to a Git repository.

## CLI deployment

1. Install Node.js 18+.
2. In this folder, run:

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

When asked for the publish directory, use `.` (the current folder). The included `netlify.toml` already sets this up.

## Verify it is live

After deployment, open this URL, replacing `YOUR-SITE`:

```text
https://YOUR-SITE.netlify.app/.netlify/functions/vm-proxy?ping=1
```

It should return JSON similar to:

```json
{"ok":true,"service":"sakura-vm-netlify-loader"}
```

Once that URL works, open the Vault from the same Netlify site. The VM detects the loader automatically and uses it for pages that reject iframes.

## Notes

- This loader handles public HTTP/HTTPS sites and blocks local/private network URLs for safety.
- Some sites (especially account portals such as ChatGPT, banking sites, and streaming services) intentionally block proxy or embedded sign-in. Use their normal browser flow for those sites.
- The function has a response size/time limit appropriate for Netlify Functions; very large or script-heavy web apps may not fully render.
