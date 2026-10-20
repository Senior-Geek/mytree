# UI-002 — Replace A–Z navigation with searchable lists

**Priority:** Medium
**Status:** Done (accepted 2026-10-20)
**Category:** Usability
**Investigation:** [docs/investigations/UI-002-searchable-lists.md](../investigations/UI-002-searchable-lists.md)

## Problem

The Individuals and Families list pages open on an A–Z surname selector with
no records; finding someone takes several clicks, and the list's search and
position are lost after opening a record.

## Required Behavior

1. Lists → Individuals / Families show the records immediately, with no
   intermediate step; no A–Z selector or surname-count table in this view.
2. Layout (refined twice on 2026-10-20), the same for both lists:
   * **top:** the search box, placeholder "Search individuals…" / "Search
     families…", about a third of the width, with the existing filter
     buttons beside it (wrapping on narrower screens; on phones the search
     box is full width with the filters underneath);
   * **middle:** the records, one row each, with sortable columns;
   * **bottom:** record count, paging, and "Rows per page" (10, 20, 50, 100)
     — never beside the search box.
   Existing DataTables functionality throughout (instant search, sorting,
   paging, the existing filter buttons).
3. The list's search, sort, page and filters are kept when returning from a
   record, where practical.
4. Compact and usable on desktop and phone.
5. A–Z is kept internally (its pages still work when linked to with their
   parameters), but is not shown in the list view.
6. Headings "Individuals" and "Families" (no "— All").
7. The complete Individuals list includes people with a blank or unknown
   surname, once each.

Limited to the Individuals and Families lists; no inline or bulk editing.

## Acceptance Criteria

* Lists → Individuals / Families opens the full table (no A–Z step).
* Search filters as you type; columns sort; paging and page size work.
* After opening a record and going back (or reopening the list), the same
  search, sort, page and filters are shown. Each list keeps its own state.
* Search box (about a third of the width) with the filter buttons beside it
  on desktop; count, paging and rows per page (10, 20, 50, 100) below the
  records.
* People with a blank or unknown surname are listed, once each, and found
  by searching.
* A–Z pages still work when linked to directly (e.g. `&alpha=P`).
* Phone: no horizontal page scrolling; controls are at least 44 px.

## Implementation Notes

Custom module `custom-modules/mytree-lists/`, plus one isolated core change
for item 7 (see DEVELOPMENT.md → "MyTree core changes"):

* **Middleware:** a GET of a list page with none of the list parameters
  (`alpha`, `falpha`, `surname`, `show`, `show_all`, `show_all_firstnames`)
  redirects to `show_all=yes&show=indi&show_all_firstnames=yes` (keeping
  `show_marnm`), for browser sessions only, as webtrees offers "All" only to
  them. Links with parameters (A–Z letters, surname links) are untouched.
* **Page wrapper** (`modules/individual-list/page`): in the "All" view, the
  core options block (A–Z selector, "All", married-name and surname-list
  links — the route to the surname-count table) is removed; the redundant
  given-name initials are hidden. Passes the translated labels to the script.
* **Script** (runs before webtrees initialises the table, changing only the
  options webtrees already passes to DataTables in `data-*` attributes):
  layout `top: search` / `bottom: info, paging, pageLength`, length menu
  10/20/50/100, the search placeholder and a visually hidden label, "Rows
  per page"; stable ids `mytree-individual-list` / `mytree-family-list`, so
  DataTables' existing saved state (2 hours, browser storage) is per list.
  After initialisation it moves webtrees' filter buttons into the search
  box's row and re-ticks restored filters.
* **Headings:** the page wrapper shows "Individuals" / "Families"; the module
  middleware removes "— All" from the browser title of the "All" response
  (the core sets the title before modules can change it).
* **CSS:** search about a third of the width, filters beside it, wrapping;
  bottom row on one line where there's room, stacked on phones; table scrolls
  inside its box; 44 px controls.
* **Core (item 7):** `AbstractIndividualListModule::individuals()` — the
  complete list no longer excludes surnames `''` and `@N.N.`, and lists each
  individual once.

### As built (2026-10-20)

Tests: `e2e/tests/ui-002-lists.spec.js` (15 tests, including a person with
an unknown surname and one with no surname, each listed once and found by
searching), `tests/Unit/MyTree/CompleteIndividualListTest.php` (4 tests),
baseline in `e2e/investigations/ui-002-lists-baseline.spec.js`. Verified
visually on the dev instance at 1280, 900 and 390 px (screenshots in the
review folder): 172 rows for 172 individuals.
The filter buttons (sex, alive/dead, birth, roots/leaves; families: alive,
marriage, divorce...) are webtrees' existing ones, kept between the search
box and the records.

### Open decisions

* **Large trees:** the list is rendered in full and paged in the browser
  (webtrees' own "All" behaviour). Fine for the dev tree (148 individuals,
  under a second); a tree of many thousands would load noticeably slower.
  Server-side paging would be a larger change.
