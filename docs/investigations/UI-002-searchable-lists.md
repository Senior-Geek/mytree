# UI-002 investigation — searchable Individuals and Families lists

**Date:** 2026-10-20 · **Data:** fictional dev tree only ·
**Baseline:** `e2e/investigations/ui-002-lists-baseline.spec.js` (6/6 passed
against upstream behaviour before any UI-002 change).

## What webtrees already does

Both lists are one core class, `Module/AbstractIndividualListModule`
(`IndividualListModule`, `FamilyListModule`), with the page view
`modules/individual-list/page`.

* **Without parameters** the page shows only the A–Z surname initials and no
  records (`show = 'none'`: "Don't show lists until something is chosen").
* **The complete list already exists:** `show_all=yes&show=indi` renders
  `lists/individuals-table` / `lists/families-table` for every surname. With
  more records than the tree setting `SUBLIST_TRIGGER_I` (default 200) it
  first asks for a given-name initial, unless `show_all_firstnames=yes`.
  "All" is offered only to browser sessions (`Session::has('initiated')`),
  not to search robots.
* **The tables are DataTables 3.0.4** (`lists/datatables-attributes`):
  instant filtering ("Filter" box), sortable columns, paging with a
  page-size menu (10 … All), and filter buttons (individuals: sex,
  alive/dead, birth, roots/leaves; families: alive/dead, marriage, divorce,
  multiple marriages). `data-state-save="true"` is set.
* **Saved state doesn't work as intended:** DataTables keys the saved state
  by table id and page path. The list tables have no id (they become
  `DataTables_Table_0`) and every webtrees page is `/index.php`, so all
  pages' first tables share one key: state is lost or applied to the wrong
  table. Restored column filters also don't re-tick their filter buttons.
* **No tree setting** makes the list pages open on the complete list.
  `SURNAME_LIST_STYLE` and `SUBLIST_TRIGGER_I` only change the surname list's
  style and the given-name threshold.
* On a phone the tables are wider than the screen and the whole page scrolls
  sideways.

## Complication: "All" leaves out people with no or unknown surname

The "All" query excludes surnames `''` and `@N.N.`
(`AbstractIndividualListModule::individuals()`: `whereNotIn('n_surn', ['',
'@N.N.'])`; families likewise). Those individuals are listed only under the
A–Z selector's "," (no surname) and "…" (unknown surname) entries, which
stay available under *Browse by surname*. The dev tree has none, but real
trees usually do (e.g. a wife whose maiden name is unknown). Including them
in the complete list needs a small core change, so it was **not** done
without approval.

## Classification and delivery

| Requirement | Finding | Delivery |
|---|---|---|
| Open on a complete list | Exists as the "All" view; not the default | Module middleware redirects a bare list URL to it |
| DataTables search, sort, paging | Exists | Unchanged |
| Simple filtering | Exists (filter buttons) | Unchanged |
| Restore search/sort/page on return | `stateSave` on, but keyed wrongly | Module script gives the two list tables stable ids; re-ticks restored filter buttons |
| Layout: search / records / count, paging, rows per page | DataTables `layout` and `lengthMenu` options, set by webtrees in `data-*` attributes | Module script adjusts those attributes before initialisation |
| Compact, mobile | Wide tables scroll the page | Module CSS: table scrolls in its own box; controls wrap; 44 px targets |
| Keep A–Z | Exists | Kept working by URL; removed from the list view (refinement: its "All" and surname links lead to the surname-count table) |
| Complete list incl. no/unknown surname | Excluded by the core query | Approved 2026-10-20: isolated core change in `individuals()` (complete list only; one row per individual) |
| Headings without "— All" | Title built in core `get()`, also used for the browser title | Module: page wrapper (heading) and middleware (browser title) |

One core change (above); everything else is in the module.
