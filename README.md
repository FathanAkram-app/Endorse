# Endorse

A responsive React 19 marketplace for brand–creator partnerships, with JWT accounts, editable profiles, company-owned brands, public discovery, and collaboration workspaces. Product components use JavaScript/JSX, with TypeScript server routes and database access. The existing React framework provides routing, server rendering, and a Cloudflare-compatible build.

## Run locally

Requires Node.js 22.13+.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Run `npm run build` for production and `npm test` for discovery logic checks.

## Authentication setup

Endorse supports email/password accounts with an immutable `creator` or `company` role selected at signup. `/register` creates an account, `/login` signs in, and `/account` opens the appropriate protected account page. Passwords use salted scrypt (N=16384, r=8, p=5). Signed HS256 JWTs expire after eight hours and are held in HTTP-only, SameSite=Lax cookies (Secure over HTTPS), never browser storage. Every protected request validates both the JWT and its persistent D1 session. Logout revokes that session immediately.

For a fresh checkout:

1. Copy `.dev.vars.example` to `.dev.vars` and generate a random `JWT_SECRET` using the command in that file. The secret must be at least 32 bytes; no default or fallback is accepted. Keep `.dev.vars` private and out of Git.
2. Run `npm run build` to generate the local Worker configuration.
3. Apply each pending migration once, in order (skip migrations already applied):

   ```sh
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_cold_supernaut.sql
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_stormy_nemesis.sql
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_peaceful_imperial_guard.sql
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_simple_shinobi_shaw.sql
   ```

4. Start or restart `npm run dev` so the database binding and secret load.

The current checkout has its local secret and all migrations initialized. For hosting, configure a separate random `JWT_SECRET` in the server environment and apply the checked-in migrations to the production D1 `DB` binding. Rotating the secret invalidates existing JWTs. The Sites access policy remains a separate hosting-level restriction; these accounts do not bypass it. These changes do not deploy the app.

Authentication API:

| Endpoint | Behavior |
| --- | --- |
| `POST /api/auth/register` | JSON `{ name, email, password, role }`; creates account and session |
| `POST /api/auth/login` | JSON `{ email, password }`; uses the stored account role |
| `POST /api/auth/logout` | Revokes the current session and clears its cookie |
| `GET /api/auth/me` | Returns the current user, or 401 |
| `GET /api/account/creator` | Creator-only account details; 403 for company accounts |
| `GET /api/account/company` | Company-only account details; 403 for creator accounts |

Mutating requests require an `Origin` header matching the application origin. Authentication responses are not cached. Signup/login are limited to 10 attempts per email and 50 per IP in a 15-minute window, shared across instances through D1; expired counters are removed on subsequent attempts. Behind an additional proxy, preserve Cloudflare's trusted `CF-Connecting-IP` header. Without it, requests share one fallback IP bucket. Passwords require 12–128 characters; emails are trimmed, lowercased, and uniquely indexed. Account roles are read from the database on every authorized request. Email verification and password recovery are not implemented.

`npm test` runs password/JWT security checks and existing discovery tests. To include the HTTP authentication tests against the running local app, run `$env:AUTH_TEST_URL='http://localhost:5173'; npm test` in PowerShell. These tests create clearly named test accounts in the local database and exercise signup, login, cookie flags, role enforcement, logout revocation, CSRF rejection, and rate limiting. Repeated runs within 15 minutes may hit the intentional IP limit. Browser interaction testing is separate from these HTTP tests.

## Structure

- `app/page.jsx`: route entry.
- `components/endorse/`: reusable branding, creator cards, landing page, and optional browser agent integration.
- `components/ui/`: accessible dialog, tabs, select, and table primitives.
- `lib/endorse/data.js`: clearly labeled demonstration records.
- `lib/endorse/discovery.js`: framework-independent filtering and sorting.
- `app/globals.css`: shared design tokens, layout, and responsive styles.
- `tests/discovery.test.mjs`: price ordering, combined search/category filters, rating sort, and data immutability.

## Profiles, brands, and Explore

- `/account/profile` edits the signed-in creator or company profile. Creator fields include display name, bio, category, location, photo upload, portfolio/social URL, handle, and starting rate in USD. Rates are stored as integer cents; a blank rate displays “Rate on request.” Company profiles hold company name, industry, bio, location, logo URL, and website.
- Creators can add, edit, or remove up to 50 social accounts, including multiple accounts on the same platform. Each has a platform, optional handle/channel name, and required HTTPS profile URL. Supported choices include Instagram, TikTok, YouTube, Facebook, X, LinkedIn, Twitch, Pinterest, Snapchat, Threads, Bluesky, and Other. These are self-provided links, not OAuth connections or verified accounts. Published profiles show each link and Explore cards show platform labels; Explore search includes social handles and platform names. Existing website/display-handle fields remain intact. The `socialAccounts` array persists with the profile; sending `[]` clears it, while omitting it preserves saved links for older clients. Company profiles do not accept creator social accounts.
- `/account/company` lists all brands owned by that company. `/account/brands/new` creates a brand; `/account/brands/:id/edit` edits it. Each brand has its own name, tagline, description, category, location, logo URL, website, and publication status. Companies can manage multiple brands. These are brand profiles, not campaign or job postings.
- Creators and brands start as drafts. Turn on **Show on Explore** and save to publish. Publishing requires a category and at least 20 characters of descriptive text. Turn it off and save to unpublish immediately. Drafts are visible only in their owner's management pages. Company details do not automatically create a public brand.
- `/explore` lists published creators and brands with tabs, search, category filtering, sorting, and 12 results per page. Creator prices can be sorted low to high, with unlisted rates last. The URL preserves filters and page selection. Public details live at `/creators/:id` and `/brands/:id`; drafts return 404.
- Creator photos use a file input with a local preview. **Save changes** uploads JPEG, PNG, or WebP files (up to 5 MB) into the R2 `BUCKET` binding, then saves the photo reference on the profile. Creators can replace or remove their photo; initials are the default/fallback. Existing photo URLs remain supported for compatibility. Company and brand logos still use optional HTTPS image URLs. Public pages expose profile content, portfolio/website links, and the managing company name for brands, but never account emails or authentication records.
- Uploaded photos are served through an app route: only the current photo on a published creator profile is public. Staged, draft, removed, and replaced photos are accessible only to their uploader. The server verifies ownership before attaching an uploaded photo, checks size and supported raster signatures, and serves a fixed image content type with `nosniff`. Unused uploads remain private in R2. The current photo is referenced in D1; no new database migration is needed for uploads. Restart the dev server after enabling the `BUCKET` binding. Production hosting must provide that R2 binding too.

All profile and brand writes check the JWT session and same-origin request server-side. Profile ownership comes from the session, and brand edits require both the company role and a matching owner ID. Client-supplied owner IDs, roles, and account emails cannot change ownership or authentication. Existing accounts receive a blank profile until they save one.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/profile` | Current user's profile (or editable defaults) |
| `PUT /api/profile` | Save the current user's profile |
| `POST /api/profile/photo` | Upload raw image bytes as a creator; returns a private staged photo URL |
| `GET /api/profile/photo/:id` | Serve a published profile photo, or an uploader's private photo |
| `GET /api/brands` | List the current company's brands, including drafts |
| `POST /api/brands` | Create a brand owned by the current company |
| `PUT /api/brands/:id` | Edit or publish/unpublish an owned brand |
| `GET /api/explore` | Public listings; accepts `kind`, `q`, `category`, `sort`, `page` |

Run marketplace HTTP tests in PowerShell with `$env:MARKETPLACE_TEST_URL='http://localhost:5173'; node --test tests/marketplace*.test.mjs`. Tests cover draft privacy, publishing, unpublishing, profile persistence, protected pages, ownership/role enforcement, input validation, search, and pagination. Test listings are returned to private drafts and sessions are revoked at the end. For the built Worker, run `npm start -- --port 8787` and use `http://127.0.0.1:8787` as the test URL.

Run photo upload checks with `$env:PHOTO_TEST_URL='http://127.0.0.1:8787'; node --test tests/profile-photo*.test.mjs` against the built preview. They cover upload and byte retrieval, invalid/oversized files, ownership, draft privacy, public visibility, replacement, and removal.

## Current scope

Includes creator/category search, affordable-to-premium sorting, profile details, side-by-side comparisons of equivalent packages, searchable sample brand opportunities, keyboard-accessible dialogs, and responsive navigation. Photos, names, metrics, rates, reviews, and opportunities are demonstration content. See ASSETS.md for photo sources.

Accounts, creator/company profiles, brand listings, private messages, contracts, and collaboration reviews persist in D1. Explore shows actual published records only; the landing page retains clearly labeled sample profiles and sample comparisons. There is no live identity verification or payment processing. Verification marks on sample cards are illustrative. Selected sample comparisons stay in memory for the current page session.

## Collaboration workflow

Open a published creator or brand profile and choose **Start a conversation**. Companies choose one of their own brands when contacting a creator; creators contact a published brand. `/collaborations` is the protected inbox, also linked from each account dashboard. Each room contains the conversation, activity history, contract, milestones, delivery, and reviews.

1. **Discuss:** exchange private messages over an authenticated WebSocket. Messages, offers, accepted contracts, milestone submissions/approvals, revision requests, cancellations, and reviews update live for both participants. Reconnection catches up from the last received message; older history uses cursor pagination. Messages and conversation creation use retry IDs to prevent duplicates.
2. **Offer:** the company specifies deliverables, usage rights/exclusivity, revision rounds, and 1–12 milestones with USD amounts and due dates. The creator accepts or declines; the company can withdraw an unaccepted offer. Declining/withdrawing returns to discussion. Accepted terms cannot be changed silently.
3. **Create and submit:** the creator delivers each milestone using an HTTPS link and a note. Sharing a message alone does not submit work. Submission links should point to accessible shared files or published content; delivery file uploads are not included.
4. **Review work:** the company requests changes or approves the submitted milestone. Approval advances to the next milestone; final approval completes the contract. Revision counts are recorded terms, not an automatic restriction on requests. Additional work can be discussed in chat.
5. **Review each other:** completed collaborations allow one immutable 1–5 rating and written review from each participant within 14 days. Reviews remain hidden from the other participant and public profiles until both submit or the window ends. Company feedback appears on the creator profile; creator feedback appears on the specific brand profile. These reviews reflect completed app workflows, not verified payments.

Before acceptance, either participant can close the conversation. After acceptance, cancellation requires the other participant to agree; a pending cancellation pauses milestone actions and may be rejected. Cancelled collaborations cannot be reviewed. History remains available to participants.

**Payments are outside Endorse.** Amounts are agreed contract terms only: the app does not collect funds, hold escrow, verify payment, issue refunds, automatically release payment, or resolve disputes. Work approval does not transfer money. Campaign/job postings, applications, attachments, email/push alerts, hourly tracking, and contract amendments are not part of this version. See [the Upwork comparison](docs/collaboration-flow.md) for the researched process and differences.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/collaborations?page=1` | Participant inbox, 20 rooms per page |
| `POST /api/collaborations` | Start a private room with `{ brandId, creatorId?, message, clientId }` |
| `GET /api/collaborations/:id` | Participant-only contract, activity, and visible reviews; optional `before` or `after` message cursor |
| `PATCH /api/collaborations/:id` | Version-checked workflow action; roles and valid transitions enforced server-side |
| `POST /api/collaborations/:id/messages` | Private message with `{ message, clientId }` |
| `POST /api/collaborations/:id/reviews` | Post-completion `{ rating, comment }` within the review window |
| `GET /api/collaborations/:id/socket` | Same-origin, participant-only WebSocket upgrade using the existing HTTP-only session cookie |

Run `$env:COLLABORATION_TEST_URL='http://127.0.0.1:8788'; node --test tests/collaborations.integration.test.mjs` against a local built preview. Tests cover participants/outsiders, protected pages, CSRF, duplicate retries, concurrent acceptance, milestone approval/revision loops, immutable accepted terms, public/private feedback, history pagination, and cancellation. Test accounts and private collaboration histories remain in local D1; their listings are unpublished and sessions revoked during cleanup.

### Live connections

`worker/index.ts` forwards WebSocket upgrades to one Cloudflare Durable Object per collaboration and delegates regular application requests to Vinext. `vite.config.ts` declares the `COLLABORATION_ROOMS` binding and its `collaboration-rooms-v1` SQLite Durable Object migration; the production build preserves these in `dist/server/wrangler.json`. Keep the named `CollaborationRoom` Worker export, binding, and migration when deploying. No additional D1 migration or service secret is needed for this change. Hosting must provision this Durable Object binding in addition to the existing D1/R2 bindings; this has been tested locally, not deployed.

Each command is authorized and committed to D1 before acknowledgement. The room serializes socket commands, then sends each connected participant their own current state, available actions, and new messages. Blind reviews are filtered server-side before any socket packet is sent. Existing HTTP mutation endpoints also notify connected clients. Socket identity comes from the verified JWT session, never from a supplied user ID; session revocation is checked on commands, heartbeats, and broadcasts. Hibernation attachments retain only session IDs, expiry, room/user IDs, cursors, and request counters, not JWTs or message bodies. Session expiry and the review deadline use Durable Object alarms.

The client uses WebSockets for both writes and incoming state. There is no periodic conversation fetch. Heartbeats detect broken connections, and reconnects use bounded exponential backoff and recover missed messages in pages. Tab resume requests a fresh snapshot. The interface shows connection status and keeps unsent input during disconnection. Commands interrupted before acknowledgement are not automatically replayed; a message retry keeps its ID if its text is unchanged, and workflow versions prevent duplicate transitions. One-time HTTP access checks diagnose failed WebSocket handshakes. The inbox and public profile pages load on navigation; their contents are not live subscriptions.

Run `$env:COLLABORATION_TEST_URL='http://127.0.0.1:8788'; node --test tests/collaboration-socket.integration.test.mjs` against `npm start -- --port 8788`. The test drives the same client transport used by the UI with two real WebSocket connections, verifies live workflow changes and blind reviews, room isolation, rejected handshakes, message retry IDs, recovery of more than 50 missed messages, automatic reconnection, and logout revocation. The Node WebSocket test adapter comes from the locked development toolchain.

## Growing into a marketplace

Explore uses server-side filtering and bounded offset pagination, and mutations enforce roles and ownership. Future campaign and package records can build on the account/profile/brand model. At larger scale, add full-text search, messaging notifications and abuse controls, and dedicated payment integration. Verification should derive from an actual review process. This is not a claim of tested production-scale capacity.

## Validation

Production build, TypeScript checks, discovery tests, password/JWT tests, profile validation tests, and local HTTP authentication/marketplace integration tests pass. Marketplace checks also pass against the built Worker. Browser visual/interaction testing was not performed. Optional WebMCP support is feature-detected; its runtime contract has not been verified in a supported browser context.
