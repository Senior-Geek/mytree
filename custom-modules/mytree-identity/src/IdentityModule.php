<?php

declare(strict_types=1);

namespace MyTree\Identity;

use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\Http\Controllers\HomePage;
use Fisharebest\Webtrees\Http\Controllers\TreePage;
use Fisharebest\Webtrees\Http\Controllers\TreePrivacy;
use Fisharebest\Webtrees\Http\Controllers\UserListPage;
use Fisharebest\Webtrees\Registry;
use Fisharebest\Webtrees\Services\TreeService;
use Fisharebest\Webtrees\Http\RequestHandlers\ModuleAction;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Module\ModuleCustomInterface;
use Fisharebest\Webtrees\Module\ModuleCustomTrait;
use Fisharebest\Webtrees\Module\ModuleFooterInterface;
use Fisharebest\Webtrees\Module\ModuleFooterTrait;
use Fisharebest\Webtrees\Module\ModuleGlobalInterface;
use Fisharebest\Webtrees\Module\ModuleGlobalTrait;
use Fisharebest\Webtrees\Tree;
use Fisharebest\Webtrees\Validator;
use Fisharebest\Webtrees\View;
use Fisharebest\Webtrees\Webtrees;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

use function e;
use function route;
use function str_starts_with;
use function view;

/**
 * MyTree application identity (UI-001).
 *
 * Applies to every theme:
 *  - wraps (does not copy) the core page layouts, replacing only the header's
 *    user menu (with Help, Settings and Account dropdowns), the empty logo
 *    slot, the browser-title suffix and the favicons - see LayoutRewriter;
 *  - adds the "based on webtrees" footer and an About MyTree page;
 *  - rewords user-facing English text that names webtrees as the site.
 *
 * Adds no data and changes no permissions: every menu entry links to an
 * existing route, which keeps its own server-side access checks.
 */
class IdentityModule extends AbstractModule implements ModuleCustomInterface, ModuleGlobalInterface, ModuleFooterInterface
{
    use ModuleCustomTrait;
    use ModuleFooterTrait;
    use ModuleGlobalTrait;

    // Fixed (not derived from the install directory) so views can refer to it.
    public const string VIEW_NAMESPACE = 'mytree-identity';

    // The application's name. A product name, so never translated.
    public const string NAME = 'MyTree';

    public function title(): string
    {
        return I18N::translate('MyTree identity');
    }

    public function description(): string
    {
        return I18N::translate('MyTree header, logo, favicons, page titles and footer attribution, for every theme.');
    }

    public function customModuleAuthorName(): string
    {
        return self::NAME;
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

        View::registerCustomView('::layouts/default', self::VIEW_NAMESPACE . '::layouts/default');
        View::registerCustomView('::layouts/administration', self::VIEW_NAMESPACE . '::layouts/administration');
        View::registerCustomView('::admin/users-edit', self::VIEW_NAMESPACE . '::admin/users-edit');
    }

    /**
     * Header styles: loaded for every theme, as the header markup is the same in all of them.
     */
    public function headContent(): string
    {
        return '<link rel="stylesheet" href="' . e($this->assetUrl('css/mytree-identity.css')) . '">';
    }

    public function defaultFooterOrder(): int
    {
        // After the core footers (contact, hit counter, privacy policy).
        return 99;
    }

    public function getFooter(ServerRequestInterface $request): string
    {
        return view(self::VIEW_NAMESPACE . '::footer', [
            'about_url' => $this->aboutUrl(Validator::attributes($request)->treeOptional()),
        ]);
    }

    public function aboutUrl(Tree|null $tree): string
    {
        return route(ModuleAction::class, [
            'module' => $this->name(),
            'action' => 'About',
            'tree'   => $tree?->name(),
        ]);
    }

    public function rolesUrl(Tree|null $tree): string
    {
        return route(ModuleAction::class, [
            'module' => $this->name(),
            'action' => 'Roles',
            'tree'   => $tree?->name(),
        ]);
    }

    /**
     * Roles and permissions: MyTree's names for the webtrees roles, and the
     * current user's own role in each family tree they can access.
     * Read-only; roles are assigned in the control panel by site administrators.
     */
    public function getRolesAction(ServerRequestInterface $request): ResponseInterface
    {
        $tree       = Validator::attributes($request)->treeOptional();
        $user       = Auth::user();
        $role_names = new RoleNames();
        $my_roles   = [];

        if (Auth::check()) {
            $trees = Registry::container()->get(TreeService::class)->all()
                ->filter(static fn (Tree $tree): bool => Auth::isMember($tree, $user));

            foreach ($trees as $each_tree) {
                $my_roles[] = [
                    'tree'     => $each_tree->title(),
                    'role'     => $role_names->label($role_names->key($each_tree, $user)),
                    'webtrees' => $role_names->webtreesLabel($each_tree, $user),
                ];
            }
        }

        return $this->viewResponse(self::VIEW_NAMESPACE . '::roles', [
            'title'          => I18N::translate('Roles and permissions'),
            'tree'           => $tree,
            'roles'          => $role_names->all(),
            'my_roles'       => $my_roles,
            'signed_in'      => Auth::check(),
            'is_admin'       => Auth::isAdmin(),
            'users_url'      => route(UserListPage::class),
            'privacy_url'    => $tree instanceof Tree && Auth::isManager($tree) ? route(TreePrivacy::class, ['tree' => $tree->name()]) : '',
        ]);
    }

    public function getAboutAction(ServerRequestInterface $request): ResponseInterface
    {
        return $this->viewResponse(self::VIEW_NAMESPACE . '::about', [
            'title'            => I18N::translate('About %s', self::NAME),
            'tree'             => Validator::attributes($request)->treeOptional(),
            'webtrees_version' => Webtrees::VERSION,
        ]);
    }

    /**
     * Apply MyTree's header, logo, title and favicons to the rendered core layouts/default.
     */
    public function rewriteDefaultLayout(string $html, Tree|null $tree): string
    {
        $menus    = new HeaderMenus($this->aboutUrl($tree), $this->rolesUrl($tree));
        $rewriter = new LayoutRewriter();

        $controls = view(self::VIEW_NAMESPACE . '::header/controls', [
            'help'      => $menus->help(),
            'settings'  => $menus->settings($tree),
            'account'   => $menus->account($tree),
            'pending'   => $menus->hasPendingChanges($tree),
            'signed_in' => Auth::check(),
        ]);

        $logo = view(self::VIEW_NAMESPACE . '::header/brand', [
            'url' => $tree instanceof Tree ? route(TreePage::class, ['tree' => $tree->name()]) : route(HomePage::class),
        ]);

        $html = $rewriter->replaceUserMenu($html, $controls);
        $html = $rewriter->fillLogoSlot($html, $logo);
        $html = $rewriter->rewriteTitle($html);
        $html = $rewriter->replaceFavicons($html, $this->faviconUrls());

        return $rewriter->ensureAjaxModal($html, view('modals/ajax'));
    }

    /**
     * Apply MyTree's title and favicon to the rendered core layouts/administration.
     */
    public function rewriteAdministrationLayout(string $html): string
    {
        $rewriter = new LayoutRewriter();
        $html     = $rewriter->rewriteTitle($html);

        return $rewriter->replaceFavicons($html, $this->faviconUrls());
    }

    /**
     * Favicon URLs, keyed by the size used in the core layout's <link> tags
     * (PHP stores those numeric keys as integers), and "ico".
     *
     * @return array<int|string,string>
     */
    public function faviconUrls(): array
    {
        return [
            '32'  => $this->assetUrl('img/favicon-32.png'),
            '180' => $this->assetUrl('img/apple-touch-icon.png'),
            '192' => $this->assetUrl('img/favicon-192.png'),
            'ico' => $this->assetUrl('img/favicon.ico'),
        ];
    }

    /**
     * English text that presents the site as "webtrees". Other languages keep
     * the core wording (see the UI-001 deferred exceptions).
     *
     * @return array<string,string>
     */
    public function customTranslations(string $language): array
    {
        if (!str_starts_with($language, 'en')) {
            return [];
        }

        return [
            'Support and documentation can be found at %s.'
                => 'MyTree is based on webtrees. Upstream support and documentation can be found at %s.',
            'No upgrade information is available.'
                => 'Online upgrades are disabled. MyTree is updated through its development workflow.',
            'webtrees message'
                => 'MyTree message',
            'The administrator at the webtrees site %s has approved your application for an account. You may now sign in by accessing the following link: %s'
                => 'The administrator at the MyTree site %s has approved your application for an account. You may now sign in by accessing the following link: %s',
            'You sent the following message to a webtrees user:'
                => 'You sent the following message to a MyTree user:',
            'A prospective user has registered with webtrees at %s.'
                => 'A prospective user has registered with MyTree at %s.',
            'The webtrees developers would be very interested to learn about this error. If you contact them, they will help you resolve the problem.'
                => 'Please report this error to the MyTree maintainer, including the details below.',
        ];
    }
}
