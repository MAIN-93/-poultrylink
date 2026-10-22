# PoultryLink — complete frontend starter

This folder contains the complete first frontend build for a mobile-first Nigerian poultry P2P marketplace.

## Files
- `index.html` — page structure, marketplace sections and dialogs
- `style.css` — responsive visual design
- `app.js` — sample listings, search/filter/sort, listing form, browser preview storage, details and WhatsApp contact flow

## Current status: frontend preview, not production marketplace
This is a complete frontend starter, not a secure multi-user marketplace yet. It intentionally marks sample listings as illustrative. A listing created in this version is saved only in the browser that created it. Other buyers will not see it.

Before a public launch, connect:
1. A backend API and shared database (for users, listings, status, timestamps and moderation).
2. Secure authentication and authorization so sellers can only edit their own listings.
3. Server-side validation, rate limits, spam prevention and safe image uploads.
4. Seller verification / report-listing / admin moderation workflow.
5. Privacy policy, terms, contact/support and clear scam reporting guidance.
6. Hosting and environment configuration for the backend. Do not put database passwords or private API keys in frontend JavaScript.

## Run locally
Keep all three files in the same folder and open `index.html` in a modern browser. For the intended public site, upload the files to your chosen repository and host the frontend. The current preview can be hosted as a static site, but real shared listings require the backend above.

## Important
The displayed sample prices and sellers are fictional examples used to demonstrate layout and interactions. Do not treat them as current Nigerian market prices or real seller offers.
