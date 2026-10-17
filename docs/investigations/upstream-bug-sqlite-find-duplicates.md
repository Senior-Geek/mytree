# Draft upstream bug report — "Find duplicates" fails on SQLite

**Status:** DRAFT, held for review. **Not submitted.** (Project Director
decision, 2026-10-17: prepare but do not submit.)
**Target:** <https://github.com/fisharebest/webtrees/issues>
**Found during:** Milestone 3A investigation
([WT-001-WT-002-workflow-review.md](WT-001-WT-002-workflow-review.md) §8.1)
**MyTree impact:** affects only SQLite installs. MyTree dev uses SQLite; the
production database isn't chosen yet. No local fix has been made (no core
changes at this stage).

---

## Proposed issue text

**Title:** Control panel → "Find duplicates" throws SQL error on SQLite: `no such function: LEAST`

**Version:** webtrees 2.3.0-dev, `main` at `c5ddf7f816` (2026-10-15). Not
re-checked against later commits.
**Database:** SQLite 3.54.0 (PDO SQLite), PHP 8.5.11

**Steps to reproduce**

1. Install webtrees using the SQLite database driver.
2. Create a tree containing at least one family.
3. As an administrator, open Control panel → Manage family trees → *Find
   duplicates* (route `/tree/{tree}/duplicates`).

**Expected:** the duplicate report lists duplicate repositories, sources,
individuals, families and media objects, or reports none.

**Actual:** the page shows an exception:

```
SQLSTATE[HY000]: General error: 1 no such function: LEAST
(SQL: select GROUP_CONCAT(f_id) AS xrefs from "wt_families"
 where "f_file" = 1
 group by LEAST(f_husb, f_wife), GREATEST(f_husb, f_wife)
 having COUNT(f_id) > 1 order by "xrefs" asc)
```

**Cause**

`app/Services/AdminService.php`, `duplicateRecords()`, families query:

```php
->groupBy([new Expression('LEAST(f_husb, f_wife)')])
->groupBy([new Expression('GREATEST(f_husb, f_wife)')])
```

`LEAST()` and `GREATEST()` exist in MySQL/MariaDB and PostgreSQL, but SQLite
has no such functions. Its equivalents are the multi-argument scalar forms
of `MIN()` and `MAX()`. SQL Server supports `LEAST`/`GREATEST` only from SQL
Server 2022 (not verified in this report).

**Possible fix (for discussion)**

Add a driver-specific helper alongside `DB::groupConcat()`, for example
mapping SQLite to `MIN(a, b)` / `MAX(a, b)` and the others to
`LEAST(a, b)` / `GREATEST(a, b)`, and use it in `duplicateRecords()`. A
database-agnostic alternative is
`CASE WHEN f_husb < f_wife THEN f_husb ELSE f_wife END` (and the reverse).
Note that `f_husb`/`f_wife` may be empty strings for single-parent families;
the existing behaviour for those should be preserved.

A regression test running `duplicateRecords()` against the SQLite test
database would catch this; the existing test suite uses SQLite.

---

## Review checklist before submitting

- [ ] Re-check against the latest `upstream/main` (`git fetch upstream`) in
      case it has already been fixed.
- [ ] Search existing upstream issues for "LEAST" / "Find duplicates SQLite".
- [ ] Confirm the issue text contains no MyTree-specific or real genealogy
      data (the reproduction uses only a generic tree).
- [ ] Decide whether to submit an issue only, or an issue plus PR.
