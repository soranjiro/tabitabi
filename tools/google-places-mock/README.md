# Google Places Mock Server

This standalone mock implements the subset of the Places API (New) used by the web app:

- `POST /v1/places:autocomplete`
- `GET /v1/places/:placeId`

## Run

```sh
pnpm dev:google-places-mock
```

Then point the web app at the mock server:

```sh
GOOGLE_PLACES_API_BASE_URL=http://localhost:8789/v1 pnpm --filter web dev
```

No API key is required when `GOOGLE_PLACES_API_BASE_URL` is set. To use real Google Places without the mock, remove `GOOGLE_PLACES_API_BASE_URL` and configure `GOOGLE_PLACES_API_KEY` (or the existing `GOOGLE_MAPS_API_KEY`).
