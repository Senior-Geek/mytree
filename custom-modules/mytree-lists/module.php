<?php

/**
 * MyTree searchable lists (UI-002 - Replace A-Z navigation with searchable lists).
 *
 * The Individuals and Families lists open on the complete, searchable
 * DataTables list instead of the A-Z surname selector.
 * Source lives in custom-modules/; deploy into modules_v4/ (see README.md).
 */

declare(strict_types=1);

namespace MyTree\Lists;

require_once __DIR__ . '/src/ListsModule.php';

return new ListsModule();
