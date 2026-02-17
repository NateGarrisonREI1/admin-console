# Dead Code Candidates — Phase 2+ Removal

> Generated: 2026-02-16
> These items were identified during the Phase 1 audit.
> Each group requires a decision before removal.

---

## 1. HES PDF Parsing Pipeline

**Lines:** ~1,002
**Packages to remove:** `pdf-parse`, `pdfjs-dist`

| File | Lines | Role |
|------|------:|------|
| `src/lib/hes/generateHesSnapshot.ts` | 940 | PDF ingestion, regex parsing, recommendation extraction |
| `src/app/api/generate-snapshot/route.ts` | 62 | API endpoint calling generateHesSnapshot |

**Consumers:**
- `src/app/admin/jobs/[id]/_components/HesParseCard.tsx` (imports `generateAndSaveHesSnapshot`)
- `src/app/api/generate-snapshot/route.ts` (API wrapper)

**Decision needed:** Is HES PDF import still planned? If not, delete all above + remove HesParseCard from the job detail page.

---

## 2. Incentive Mapping / ENERGY STAR Scraper

**Lines:** ~404
**Package to remove:** `cheerio`

| File | Lines | Role |
|------|------:|------|
| `src/lib/incentives/index.ts` | 9 | Re-export barrel |
| `src/lib/incentives/normalize.ts` | 60 | Normalize incentive names/amounts |
| `src/lib/incentives/types.ts` | 31 | Shared types |
| `src/lib/incentives/energystarRebateFinder.ts` | 179 | cheerio-based ENERGY STAR web scraper |
| `src/lib/incentives/v0_dbCached/resolveIncentivesV0.ts` | 97 | V0 DB-cached incentive resolver |
| `src/lib/incentives/v0_dbCached/mapUpgradeToTypeKey.ts` | 28 | Map upgrade -> lookup key |

**Consumers:**
- `src/lib/snapshot/buildSnapshotUpgradeCards.ts` (imports resolveIncentives + mapUpgradeToTypeKey)
- `src/app/admin/incentives/page.tsx` (imports fetchEnergyStarOffersByZip)

**Decision needed:** The admin incentives page has its own DB-based CRUD (`_actions.ts`). The scraper is only used for a "preview" feature. Safe to remove if admin incentives are managed entirely via DB.

---

## 3. Snapshot System (localStorage Prototype)

**Lines:** ~770

| File | Lines | Role |
|------|------:|------|
| `src/app/admin/_data/localSnapshots.ts` | 142 | localStorage CRUD for snapshot drafts |
| `src/app/admin/snapshots/page.tsx` | 121 | Snapshot list page |
| `src/app/admin/snapshots/new/page.tsx` | 10 | New snapshot page shell |
| `src/app/admin/snapshots/new/NewSnapshotClient.tsx` | 148 | New snapshot client form |
| `src/app/admin/snapshots/[snapshotId]/page.tsx` | 15 | Snapshot editor page shell |
| `src/app/admin/snapshots/[snapshotId]/SnapshotEditorClient.tsx` | 334 | Snapshot editor client |

**Consumers:** Self-contained; only the sidebar links to `/admin/snapshots`.

**Decision needed:** This is a localStorage-only prototype with no DB persistence. If the snapshot feature has been superseded by the admin jobs pipeline, delete entirely.

---

## 4. Snapshot Upgrade Cards Builder

**Lines:** ~418

| File | Lines | Role |
|------|------:|------|
| `src/lib/snapshot/buildSnapshotUpgradeCards.ts` | 418 | Builds upgrade cards from snapshot data + incentive lookups |

**Consumers:**
- `src/lib/hes/generateHesSnapshot.ts` (called during HES pipeline)

**Decision needed:** Depends on decisions for items #1 and #2 above. If both HES and incentives are removed, this file has no consumers.

---

## 5. Legacy Jobs & Snapshots Tables

**Migration:** `supabase/migrations/20251229184501_040_jobs_and_snapshots.sql`

| Table | Status |
|-------|--------|
| `jobs` | Superseded by `admin_jobs` (phase4 migration) |
| `snapshots` | Only used by localStorage prototype |

**Decision needed:** These tables exist in the DB but the admin console now uses `admin_jobs`. Confirm no other consumers before dropping.

---

## Summary

| Group | Files | Lines | Packages |
|-------|------:|------:|----------|
| HES PDF parsing | 2 | ~1,002 | pdf-parse, pdfjs-dist |
| Incentive mapping | 6 | ~404 | cheerio |
| Snapshot prototype | 6 | ~770 | — |
| Upgrade cards builder | 1 | ~418 | — |
| Legacy DB tables | 1 migration | — | — |
| **Total** | **16** | **~2,594** | **3 packages** |

### Removal order (recommended)

1. Snapshot prototype (self-contained, no external deps)
2. HES pipeline + upgrade cards (removes pdf-parse, pdfjs-dist)
3. Incentive scraper (removes cheerio)
4. Legacy DB tables (migration/manual SQL drop)
