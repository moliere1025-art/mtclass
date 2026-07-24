# MT WYCKOFF · Cloudflare deployment

This bundle contains the complete Astro source and the Cloudflare configuration.

## Cloudflare Pages

- Build command: `npm run build`
- Build output directory: `dist/client`
- Node.js: `22`

## Local build

```bash
npm install
npm run build
```

The generated static site is in `dist/client/`. The generated Cloudflare-compatible
worker artifact is in `dist/server/index.js`.

## Direct static upload

If you do not need a build pipeline, use the separate static bundle. Its root
already contains the contents of `dist/client/`.

## Important

The current `/login/` route is a public course entry page. It does not provide
account authentication or content protection. Add a server-side auth boundary
before using this as a private paid course.
