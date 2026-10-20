<?php

declare(strict_types=1);

namespace MyTree\Lists;

use Fisharebest\Webtrees\Http\Routing\Route;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Module\AbstractIndividualListModule;
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Module\FamilyListModule;
use Fisharebest\Webtrees\Module\ModuleCustomInterface;
use Fisharebest\Webtrees\Module\ModuleCustomTrait;
use Fisharebest\Webtrees\Registry;
use Fisharebest\Webtrees\Session;
use Fisharebest\Webtrees\Tree;
use Fisharebest\Webtrees\View;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\StreamFactoryInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

use function array_intersect_key;
use function array_flip;
use function is_a;
use function preg_replace_callback;
use function redirect;
use function route;
use function str_replace;
use function strip_tags;
use function strlen;
use function strpos;
use function substr;

/**
 * Searchable Individuals and Families lists (UI-002).
 *
 * webtrees already has the list we want: its "All" view renders every record
 * in a DataTables table with instant filtering, sortable columns, paging,
 * filter buttons and saved state. It just isn't the default - the list pages
 * open on an A-Z surname selector with no table. This module:
 *
 *  - redirects a list page requested without any list parameters to the
 *    "All" view (only for browser sessions, as webtrees itself only offers
 *    "All" to them);
 *  - in the "All" view, removes the A-Z selector and its links (which lead to
 *    the surname-count table), leaving just the records; A-Z pages still
 *    work when linked to with their parameters (e.g. from a surname link);
 *  - lays the table out as search box / records / count, paging and rows
 *    per page (resources/js/mytree-lists.js sets the table's own DataTables
 *    options before webtrees initialises it);
 *  - gives the two list tables stable ids, so DataTables keeps each list's
 *    search, sort, page and filters separately and restores them on return;
 *  - lets the table scroll inside its own box on narrow screens.
 *
 * No core changes, no new data, no change to which records anyone can see:
 * the lists, queries and privacy checks are webtrees' own.
 */
class ListsModule extends AbstractModule implements ModuleCustomInterface, MiddlewareInterface
{
    use ModuleCustomTrait;

    // Fixed (not derived from the install directory) so views can refer to it.
    public const string VIEW_NAMESPACE = 'mytree-lists';

    // Query parameters of the core list pages. Without any of these, the page
    // would show only the A-Z selector.
    private const array LIST_PARAMETERS = ['alpha', 'falpha', 'surname', 'show', 'show_all', 'show_all_firstnames'];

    // The core options block (A-Z selector, married names, surname list) and the content that follows it.
    private const string OPTIONS_START = '<div class="d-flex flex-column wt-page-options wt-page-options-individual-list d-print-none">';
    private const string CONTENT_START = '<div class="wt-page-content">';

    public function title(): string
    {
        return I18N::translate('Searchable lists');
    }

    public function description(): string
    {
        return I18N::translate('The individual and family lists open on the complete, searchable list instead of the A–Z surname selector.');
    }

    public function customModuleAuthorName(): string
    {
        return 'MyTree';
    }

    public function customModuleVersion(): string
    {
        return '0.1.0';
    }

    public function resourcesFolder(): string
    {
        return __DIR__ . '/../resources/';
    }

    public function boot(): void
    {
        View::registerNamespace(self::VIEW_NAMESPACE, $this->resourcesFolder() . 'views/');

        // The page view of both the individual and family lists.
        View::registerCustomView('::modules/individual-list/page', self::VIEW_NAMESPACE . '::modules/individual-list/page');
    }

    /**
     * Send a bare list request to the complete list.
     */
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $route = $request->getAttribute('route');
        $tree  = $request->getAttribute('tree');

        if (
            $request->getMethod() === 'GET' &&
            $route instanceof Route &&
            $tree instanceof Tree &&
            is_a($route->controller, AbstractIndividualListModule::class, true) &&
            array_intersect_key($request->getQueryParams(), array_flip(self::LIST_PARAMETERS)) === [] &&
            Session::has('initiated')
        ) {
            $show_marnm = $request->getQueryParams()['show_marnm'] ?? '';

            return redirect(route($route->controller, [
                'tree'                => $tree->name(),
                'show_all'            => 'yes',
                'show'                => 'indi',
                'show_all_firstnames' => 'yes',
                'show_marnm'          => $show_marnm === 'yes' ? 'yes' : null,
            ]));
        }

        $response = $handler->handle($request);

        // The complete list's browser title: "Individuals", not "Individuals — All".
        // (The page heading is changed in the page view; the title is set by the
        // core before any module sees it, so it is adjusted in the response.)
        if (
            $route instanceof Route &&
            is_a($route->controller, AbstractIndividualListModule::class, true) &&
            ($request->getQueryParams()['show_all'] ?? '') === 'yes' &&
            $response->getStatusCode() === 200
        ) {
            $families = is_a($route->controller, FamilyListModule::class, true);
            $core     = strip_tags(($families ? I18N::translate('Families') : I18N::translate('Individuals')) . ' — ' . I18N::translate('All'));
            $heading  = strip_tags($this->heading($families));
            $html     = (string) $response->getBody();
            $titled   = preg_replace_callback(
                '#<title>(.*?)</title>#s',
                static fn (array $match): string => '<title>' . str_replace($core, $heading, $match[1]) . '</title>',
                $html,
                1
            );

            if ($titled !== null && $titled !== $html) {
                $response = $response->withBody(Registry::container()->get(StreamFactoryInterface::class)->createStream($titled));
            }
        }

        return $response;
    }

    /**
     * The heading of the complete list.
     */
    public function heading(bool $families): string
    {
        return $families ? I18N::translate('Families') : I18N::translate('Individuals');
    }

    /**
     * In the "All" view, remove the core options block (A-Z selector, "All",
     * married names and surname-list links). Unchanged if the markup isn't found.
     */
    public function removeOptions(string $content): string
    {
        $start = strpos($content, self::OPTIONS_START);
        $end   = $start === false ? false : strpos($content, self::CONTENT_START, $start + strlen(self::OPTIONS_START));

        if ($start === false || $end === false) {
            return $content;
        }

        return substr($content, 0, $start) . substr($content, $end);
    }

    /**
     * Labels for the table layout, by list.
     *
     * @return array<string,string>
     */
    public function labels(bool $families): array
    {
        return [
            'search' => $families ? I18N::translate('Search families…') : I18N::translate('Search individuals…'),
            'rows'   => I18N::translate('Rows per page'),
        ];
    }
}
