# mytree-lists

Searchable Individuals and Families lists. Implements
[UI-002 — Replace A–Z navigation with searchable lists](../../docs/enhancements/UI-002-searchable-lists.md).

* **Lists → Individuals / Families** show the records at once (webtrees'
  own "All" view), headed "Individuals" / "Families": the search box
  ("Search individuals…" / "Search families…", about a third of the width)
  with the existing filter buttons beside it, the records with sortable
  columns, then the record count, paging and **Rows per page** (10, 20, 50,
  100). On phones the search box is full width with the filters underneath.
* People with a blank or unknown surname are included, once each (a small
  core change; DEVELOPMENT.md → "MyTree core changes").
* No A–Z selector or surname-count table in the list view. A–Z pages still
  work when linked to with their parameters (e.g. from a surname link).
* **Search, sort, page and filters are kept** for 2 hours (DataTables' saved
  state, in the browser) when you open a record and come back, or reopen the
  list. Each list keeps its own.
* On phones the table scrolls inside its own box, and the controls wrap.

No data and no change to who can see which records.

## Installation

```bash
ln -s "$(pwd)/custom-modules/mytree-lists" modules_v4/mytree-lists
```

The Docker dev environment mounts it instead (`docker/docker-compose.yml`).
Enabled automatically ("Searchable lists" in *Control panel → Modules*).
Disable it to get the A–Z pages back.

## Architecture

```
module.php                                     bootstrap
src/ListsModule.php                            middleware (bare list URL → "All"; browser title), removes the A–Z block, labels
resources/views/modules/individual-list/page.phtml  wrapper for the core list page
resources/js/mytree-lists.js                   table layout, rows per page, labels, stable ids; filter buttons
resources/css/mytree-lists.css                 full-width search, bottom row, phone layout
```

## Known limitation

The list is rendered in full and paged in the browser (webtrees' "All"
behaviour); a very large tree loads more slowly. See the UI-002 spec.
