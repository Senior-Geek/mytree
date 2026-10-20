/**
 * MyTree searchable lists (UI-002).
 *
 * Runs before webtrees initialises its tables (this script is in the page's
 * javascript stack, which follows webtrees.min.js; webtrees waits for
 * DOMContentLoaded). It only adjusts the options webtrees already gives
 * DataTables through the table's data-* attributes:
 *
 * 1. Layout: a full-width search box above the records; record count, paging
 *    and "Rows per page" (10, 20, 50, 100) below them.
 * 2. Stable table ids. DataTables saves a table's state (search, sort, page,
 *    page length, column filters) under its id and the page path - and every
 *    webtrees page is /index.php, while tables without an id all become
 *    "DataTables_Table_0". A stable id keeps each list's state separate, so
 *    it is restored on returning to that list.
 *
 * After initialisation it moves webtrees' filter buttons into the search box's
 * row (search on the left, filters beside it; CSS wraps them on narrow
 * screens) and ticks those matching a restored column filter (DataTables
 * restores the filter, not the button).
 */
(function () {
  'use strict';

  const root = document.querySelector('.mytree-all-list');

  if (root === null) {
    return;
  }

  const ids = {
    'wt-table-individual': 'mytree-individual-list',
    'wt-table-family': 'mytree-family-list',
  };

  const searchLabel = root.dataset.mytreeSearch || '';
  const rowsLabel = root.dataset.mytreeRows || '';

  function escapeHtml(text) {
    const span = document.createElement('span');
    span.textContent = text;
    return span.innerHTML;
  }

  for (const [tableClass, id] of Object.entries(ids)) {
    const table = root.querySelector('table.wt-datatables.' + tableClass);

    if (table === null) {
      continue;
    }

    if (table.id === '') {
      table.id = id;
    }

    table.dataset.layout = JSON.stringify({
      topStart: null,
      topEnd: null,
      top: 'search',
      bottomStart: null,
      bottomEnd: null,
      bottom: ['info', 'paging', 'pageLength'],
    });
    table.dataset.lengthMenu = JSON.stringify([10, 20, 50, 100]);

    const language = JSON.parse(table.dataset.language || '{}');
    // The label stays available to screen readers; the placeholder shows it.
    language.search = '<span class="visually-hidden">' + escapeHtml(searchLabel) + '</span>';
    language.searchPlaceholder = searchLabel;
    language.lengthMenu = escapeHtml(rowsLabel) + ' _MENU_';
    table.dataset.language = JSON.stringify(language);
  }

  // Registered after webtrees' own DOMContentLoaded handler, so it runs after the tables exist.
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.DataTable !== 'function') {
      return;
    }

    root.querySelectorAll('table.wt-datatables[id^="mytree-"]').forEach(function (table) {
      if (!window.DataTable.isDataTable(table)) {
        return;
      }

      const api = new window.DataTable(table, { retrieve: true });
      const container = table.closest('.dt-container');
      const toolbar = container === null ? null : container.previousElementSibling;
      // The first layout row holds the search box (Bootstrap 5 rows have no dt-layout-row class).
      const searchRow = container === null ? null : container.firstElementChild;

      // webtrees' filter buttons sit above the table's container: move them beside the search box.
      if (toolbar !== null && toolbar.classList.contains('wt-table-filters') && searchRow !== null) {
        searchRow.classList.add('mytree-search-row');
        searchRow.append(toolbar);
      }

      root.querySelectorAll('.wt-table-filters input[data-filter-column]').forEach(function (checkbox) {
        const search = api.column(parseInt(checkbox.dataset.filterColumn, 10)).search();
        checkbox.checked = search !== '' && search === checkbox.dataset.filterValue;
      });
    });
  });
}());
