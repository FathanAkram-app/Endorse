# Endorse

A responsive React 19 landing page and interactive marketplace preview for brand–creator partnerships. Product components are JavaScript/JSX. The existing React framework provides routing, server rendering, and a Cloudflare-compatible build.

## Run locally

Requires Node.js 22.13+.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Run `npm run build` for production and `npm test` for discovery logic checks.

## Structure

- `app/page.jsx`: route entry.
- `components/endorse/`: reusable branding, creator cards, landing page, and optional browser agent integration.
- `components/ui/`: accessible dialog, tabs, select, and table primitives.
- `lib/endorse/data.js`: clearly labeled demonstration records.
- `lib/endorse/discovery.js`: framework-independent filtering and sorting.
- `app/globals.css`: shared design tokens, layout, and responsive styles.
- `tests/discovery.test.mjs`: price ordering, combined search/category filters, rating sort, and data immutability.

## Current scope

Includes creator/category search, affordable-to-premium sorting, profile details, side-by-side comparisons of equivalent packages, searchable sample brand opportunities, keyboard-accessible dialogs, and responsive navigation. Photos, names, metrics, rates, reviews, and opportunities are demonstration content. See ASSETS.md for photo sources.

There is no live registration, verification, booking, messaging, payment processing, or persistent marketplace database. The displayed verification marks are illustrative. Selected comparisons stay in memory for the current page session.

## Growing into a marketplace

The UI and discovery model are separate so the sample data can be replaced with a service adapter. A production marketplace should use server-side filtering, indexed queries, cursor pagination, and authenticated endpoints for profile and campaign mutations. Add distinct creator, company, campaign, package, and collaboration records; store media in object storage; enforce roles and ownership on the server; and derive verification from an actual review process. Keep payment and messaging work in dedicated services. This architecture is prepared for extension; it is not a claim of tested production-scale capacity.

## Validation

Production build, TypeScript infrastructure checks, and discovery tests pass. The root route and local photo assets were checked over HTTP. Browser visual/interaction testing was not performed because this environment had no available browser. Optional WebMCP support is feature-detected; its runtime contract could not be verified without a supported browser context.
