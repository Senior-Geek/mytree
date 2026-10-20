<?php

declare(strict_types=1);

namespace MyTree\Identity;

use Fisharebest\Webtrees\Webtrees;

use function e;
use function preg_replace;
use function preg_replace_callback;
use function str_contains;
use function str_ends_with;
use function str_replace;
use function strlen;
use function strpos;
use function substr;
use function trim;

/**
 * Small, targeted edits to the HTML of the core layouts (UI-001).
 *
 * The core layouts are rendered unchanged and then edited here, instead of
 * being copied, so upstream changes to them keep flowing into MyTree. Each
 * edit matches one fragment of the core markup; if upstream changes that
 * fragment the edit does nothing, the page still works with the upstream
 * version of it, and the UI-001 e2e tests report what is missing.
 */
final class LayoutRewriter
{
    // The core header's user menu: the top-right row of text links.
    private const string USER_MENU = '#<ul class="nav wt-user-menu">.*?</ul>#s';

    // The core header's empty logo slot (themes draw a logo in CSS).
    private const string LOGO_SLOT = '<div class="col wt-site-logo"></div>';

    // Favicon links in layouts/default, by size: <link rel="..." sizes="32x32" href="...">
    private const string SIZED_ICON = '#(<link rel="(?:icon|apple-touch-icon)" sizes="(\d+)x\d+" href=")[^"]*(")#';

    // The favicon link in layouts/administration.
    private const string ADMIN_ICON = '#(<link rel="icon" href=")[^"]*(" type="image/x-icon">)#';

    private const string TITLE = '#<title>(.*?)</title>#s';

    public function replaceUserMenu(string $html, string $controls): string
    {
        // A callback, so "$" or "\" in the menu HTML is never read as a back-reference.
        return preg_replace_callback(self::USER_MENU, static fn (): string => $controls, $html, 1) ?? $html;
    }

    public function fillLogoSlot(string $html, string $logo): string
    {
        return str_replace(self::LOGO_SLOT, '<div class="col wt-site-logo">' . $logo . '</div>', $html);
    }

    /**
     * Replace "webtrees" as the whole title or as the "– site name" suffix, which
     * comes from the tree's META_TITLE setting (default: webtrees). A suffix
     * the site has configured to something else is kept.
     */
    public function rewriteTitle(string $html): string
    {
        return preg_replace_callback(self::TITLE, static function (array $match): string {
            $title  = trim(preg_replace('/\s+/', ' ', $match[1]) ?? $match[1]);
            $suffix = ' – ' . Webtrees::NAME;

            // Untitled pages fall back to "webtrees", with or without the suffix.
            if ($title === Webtrees::NAME || $title === Webtrees::NAME . $suffix) {
                $title = IdentityModule::NAME;
            } elseif (str_ends_with($title, $suffix)) {
                $title = substr($title, 0, -strlen($suffix)) . ' – ' . IdentityModule::NAME;
            }

            return '<title>' . $title . '</title>';
        }, $html, 1) ?? $html;
    }

    /**
     * @param array<int|string,string> $icons URLs keyed by size (32, 180, 192) and "ico"
     */
    public function replaceFavicons(string $html, array $icons): string
    {
        $html = preg_replace_callback(
            self::SIZED_ICON,
            static fn (array $match): string => isset($icons[$match[2]])
                ? $match[1] . e($icons[$match[2]]) . $match[3]
                : $match[0],
            $html
        ) ?? $html;

        return preg_replace_callback(
            self::ADMIN_ICON,
            static fn (array $match): string => $match[1] . e($icons['ico']) . $match[2],
            $html
        ) ?? $html;
    }

    /**
     * The Help menu opens help topics in the core AJAX modal, which only some
     * pages include. Add it after the main content on pages that lack it.
     */
    public function ensureAjaxModal(string $html, string $modal): string
    {
        if (str_contains($html, 'id="wt-ajax-modal"')) {
            return $html;
        }

        $position = strpos($html, '</main>');

        if ($position === false) {
            return $html;
        }

        return substr($html, 0, $position + 7) . $modal . substr($html, $position + 7);
    }
}
