<?php

/**
 * MyTree identity (UI-001 - MyTree Identity & Navigation).
 *
 * The MyTree header (Help, Settings and Account menus), logo, favicons, page
 * titles, footer attribution and About page, for every theme.
 * Source lives in custom-modules/; deploy into modules_v4/ (see README.md).
 */

declare(strict_types=1);

namespace MyTree\Identity;

require_once __DIR__ . '/src/RoleNames.php';
require_once __DIR__ . '/src/HeaderMenus.php';
require_once __DIR__ . '/src/LayoutRewriter.php';
require_once __DIR__ . '/src/IdentityModule.php';

return new IdentityModule();
