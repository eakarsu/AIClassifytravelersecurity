# Governed traveler screening

The supported `/api/governed-screening` workflow registers a checksummed authoritative import and its legal authority, pseudonymizes document identifiers, calculates a transparent signal score, creates a reviewable alert, requires supervisor adjudication, and accepts redress. Scores never automatically permit, deny, detain, or otherwise decide a travel outcome. Every sensitive operation writes append-only access history with a reason and request identifier.

Run `scripts/bootstrap.sh`, configure `.env`, run `scripts/migrate.sh`, then `start.sh`. Startup is non-destructive. Demo seeding is separately guarded. Generated `gap-*` routes are no longer mounted.

Border/watchlist/document-verification connections, authoritative data, demographic fairness validation, legal approval, retention operations, and production security review require the responsible organizations and are not represented as complete here.
