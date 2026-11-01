# moviehawk-domains

The current domain of each site whose domain rotates, by its hostname label, for the MovieHawk API:

```
https://raw.githubusercontent.com/ElonMuskOfficial/moviehawk-domains/main/domains.json
```

```json
{ "hdhub4u": "https://new10.hdhub4u.cl", "hubcloud": "https://hubcloud.ist" }
```

## How it heals

Twice a day (05:17 and 17:17 UTC), [`heal.yml`](.github/workflows/heal.yml) runs [`heal.mjs`](heal.mjs), which opens
each domain at its root:

- **It redirects to another domain of the same site** (`new9.hdhub4u.cl` → `new10.hdhub4u.cl`):
  that is the new domain. `domains.json` is updated and committed.
- **It answers**: nothing changes.
- **It does not answer, or redirects elsewhere**: no new domain can be known. The issue
  "Domains that do not answer" is opened (or updated), and closed when every domain answers
  again. Edit `domains.json` by hand.

Run it by hand: `node heal.mjs` (Node 22 or later), or "Run workflow" on the Actions tab.

GitHub serves the raw file with `Cache-Control: max-age=300`, so a change reaches its readers
within 5 minutes.
