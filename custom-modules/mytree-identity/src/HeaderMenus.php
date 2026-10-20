<?php

declare(strict_types=1);

namespace MyTree\Identity;

use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\Http\Controllers\ControlPanel;
use Fisharebest\Webtrees\Http\Controllers\HelpText;
use Fisharebest\Webtrees\Http\Controllers\Register;
use Fisharebest\Webtrees\Http\Controllers\SiteRegistration;
use Fisharebest\Webtrees\Http\Controllers\TreePrivacy;
use Fisharebest\Webtrees\Http\Controllers\UserListPage;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Menu;
use Fisharebest\Webtrees\Module\ModuleThemeTrait;
use Fisharebest\Webtrees\Site;
use Fisharebest\Webtrees\Tree;

use function array_filter;
use function route;
use function str_contains;

/**
 * Builds the entries of the header's Help, Settings and Account dropdowns.
 *
 * Links come from the core theme menu builders (ModuleThemeTrait) or point to
 * existing webtrees pages, and whether an item is offered uses the same
 * checks as the route behind it (Auth::isAdmin(), Auth::isManager(), the
 * registration setting). The routes keep their own server-side permission
 * checks; this class only decides what to show, and explains what isn't
 * available.
 *
 * An entry is one of:
 *   ['type' => 'header',   'label' => string]
 *   ['type' => 'identity', 'name' => string, 'detail' => string]
 *   ['type' => 'divider']
 *   ['type' => 'link',     'label' => string, 'url' => string, 'class' => string, 'attrs' => array<string,string>]
 *   ['type' => 'disabled', 'label' => string, 'hint' => string, 'id' => string]
 *   ['type' => 'choices',  'label' => string, 'id' => string, 'current' => string, 'items' => list<link entry with 'active'>]
 *
 * @phpstan-type Entry array<string,mixed>
 */
final class HeaderMenus
{
    // The core builders, used without making this class a theme.
    use ModuleThemeTrait;

    // Contextual help topics shown in the Help menu: HelpText::get() topics,
    // labelled with the same (already translated) titles as their help dialogs.
    private const array HELP_TOPICS = [
        'DATE'            => 'Date',
        'NAME'            => 'Name',
        'PLAC'            => 'Place',
        'RESN'            => 'Restriction',
        'pending_changes' => 'Pending changes',
    ];

    public function __construct(
        private readonly string $about_url,
        private readonly string $roles_url,
        private readonly RoleNames $role_names = new RoleNames(),
    ) {
    }

    public function title(): string
    {
        return IdentityModule::NAME;
    }

    /**
     * @return list<Entry>
     */
    public function help(): array
    {
        $entries = [['type' => 'header', 'label' => I18N::translate('Help topics')]];

        foreach (self::HELP_TOPICS as $topic => $label) {
            $entries[] = [
                'type'  => 'link',
                'label' => I18N::translate($label),
                'url'   => '#',
                'class' => 'mytree-help-' . $topic,
                'attrs' => [
                    'data-bs-toggle' => 'modal',
                    'data-bs-target' => '#wt-ajax-modal',
                    'data-wt-href'   => route(HelpText::class, ['topic' => $topic]),
                ],
            ];
        }

        $entries[] = ['type' => 'divider'];
        $entries[] = $this->link(new Menu(I18N::translate('Roles and permissions'), $this->roles_url, 'mytree-roles'));
        $entries[] = $this->link(new Menu(I18N::translate('About %s', IdentityModule::NAME), $this->about_url, 'mytree-about'));

        return $entries;
    }

    /**
     * @return list<Entry>
     */
    public function settings(Tree|null $tree): array
    {
        $entries = [['type' => 'header', 'label' => I18N::translate('Personal preferences')]];

        if (Auth::check()) {
            $entries[] = $this->link($this->menuMyAccount($tree)->setLabel(I18N::translate('Personal preferences')));
            $entries[] = $this->link(new Menu(I18N::translate('My roles and access'), $this->roles_url, 'mytree-my-roles'));
        } else {
            $entries[] = $this->disabled(
                I18N::translate('Personal preferences'),
                I18N::translate('Sign in to change your personal preferences.'),
                'mytree-hint-preferences'
            );
        }

        if ($tree instanceof Tree) {
            $change_blocks = $this->menuChangeBlocks($tree);

            if ($change_blocks instanceof Menu) {
                $entries[] = $this->link($change_blocks);
            }
        }

        $themes    = $this->menuThemes();
        $languages = $this->menuLanguages();

        if ($themes instanceof Menu || $languages instanceof Menu) {
            $entries[] = ['type' => 'divider'];
            $entries[] = ['type' => 'header', 'label' => I18N::translate('Appearance and language')];
        }

        if ($themes instanceof Menu) {
            $entries[] = $this->choices($themes->setLabel(I18N::translate('Theme and appearance')), 'mytree-theme-choices');
        }

        if ($languages instanceof Menu) {
            $entries[] = $this->choices($languages, 'mytree-language-choices');
        }

        $entries[] = ['type' => 'divider'];
        $entries[] = ['type' => 'header', 'label' => I18N::translate('Administration')];

        return [...$entries, ...$this->administration($tree)];
    }

    /**
     * @return list<Entry>
     */
    public function account(Tree|null $tree): array
    {
        if (!Auth::check()) {
            return $this->visitorAccount($tree);
        }

        $user   = Auth::user();
        $detail = $user->userName();

        if ($tree instanceof Tree) {
            $detail .= ' · ' . $this->role_names->label($this->role_names->key($tree, $user));
        }

        $entries = [['type' => 'identity', 'name' => $user->realName(), 'detail' => $detail]];

        $menus = $tree instanceof Tree
            ? [
                $this->menuMyAccount($tree),
                $this->menuMyPage($tree),
                $this->menuMyIndividualRecord($tree),
                $this->menuMyPedigree($tree),
                $this->menuPendingChanges($tree),
            ]
            : [$this->menuMyAccount(null)];

        foreach (array_filter($menus) as $menu) {
            $entries[] = $this->link($menu);
        }

        $logout = $this->menuLogout();

        if ($logout instanceof Menu) {
            $entries[] = ['type' => 'divider'];
            $entries[] = $this->link($logout);
        }

        return $entries;
    }

    public function hasPendingChanges(Tree|null $tree): bool
    {
        return $this->menuPendingChanges($tree) instanceof Menu;
    }

    /**
     * Sign in, and create an account when the site's registration setting
     * allows it - the same setting the registration pages enforce.
     *
     * @return list<Entry>
     */
    private function visitorAccount(Tree|null $tree): array
    {
        $entries = [];
        $login   = $this->menuLogin();

        if ($login instanceof Menu) {
            $entries[] = $this->link($login);
        }

        if (Site::getPreference('USE_REGISTRATION_MODULE') === '1') {
            $entries[] = $this->link(new Menu(
                I18N::translate('Create an account'),
                route(Register::class, ['tree' => $tree?->name()]),
                'mytree-register',
                ['rel' => 'nofollow']
            )) + ['note' => I18N::translate('A site administrator approves each new account.')];
        } else {
            $entries[] = $this->disabled(
                I18N::translate('Create an account'),
                I18N::translate('This website isn’t accepting new accounts. Ask the site administrator for one.'),
                'mytree-hint-register'
            );
        }

        return $entries;
    }

    /**
     * The control panel, user management and tree access, for those allowed
     * to use them; otherwise an explanation (or nothing, where irrelevant).
     *
     * @return list<Entry>
     */
    private function administration(Tree|null $tree): array
    {
        $is_admin   = Auth::isAdmin();
        $is_manager = $tree instanceof Tree && Auth::isManager($tree);

        if ($is_admin) {
            $control_panel = new Menu(I18N::translate('Control panel'), route(ControlPanel::class), 'menu-admin');
        } elseif ($tree instanceof Tree) {
            $control_panel = $this->menuControlPanel($tree);
        } else {
            $control_panel = null;
        }

        if ($control_panel instanceof Menu) {
            $entries = [$this->link($control_panel)];
        } else {
            $hint = Auth::check()
                ? I18N::translate('Only site and tree administrators can use the control panel.')
                : I18N::translate('Sign in as a site or tree administrator to use the control panel.');

            // Viewers and editors don't need the other administration items.
            return [$this->disabled(I18N::translate('Control panel'), $hint, 'mytree-hint-control-panel')];
        }

        if ($is_admin) {
            $entries[] = $this->link(new Menu(I18N::translate('User management'), route(UserListPage::class), 'mytree-users'));
            $entries[] = $this->link(new Menu(I18N::translate('Sign-in and registration'), route(SiteRegistration::class), 'mytree-registration'));
        } else {
            $entries[] = $this->disabled(
                I18N::translate('User management'),
                I18N::translate('Only site administrators can manage user accounts and roles.'),
                'mytree-hint-users'
            );
        }

        if ($is_manager) {
            $entries[] = $this->link(new Menu(
                I18N::translate('Tree access and privacy'),
                route(TreePrivacy::class, ['tree' => $tree->name()]),
                'mytree-tree-privacy'
            ));
        }

        return $entries;
    }

    /**
     * @return Entry
     */
    private function link(Menu $menu): array
    {
        return [
            'type'  => 'link',
            'label' => $menu->getLabel(),
            'url'   => $menu->getLink(),
            'class' => $menu->getClass(),
            'attrs' => $menu->getAttrs(),
        ];
    }

    /**
     * @return Entry
     */
    private function disabled(string $label, string $hint, string $id): array
    {
        return ['type' => 'disabled', 'label' => $label, 'hint' => $hint, 'id' => $id];
    }

    /**
     * A collapsible list of choices (themes, languages) from a core menu.
     *
     * @return Entry
     */
    private function choices(Menu $menu, string $id): array
    {
        $items   = [];
        $current = '';

        foreach ($menu->getSubmenus() as $submenu) {
            $active = str_contains(' ' . $submenu->getClass() . ' ', ' active ');

            if ($active) {
                $current = $submenu->getLabel();
            }

            $items[] = $this->link($submenu) + ['active' => $active];
        }

        return ['type' => 'choices', 'label' => $menu->getLabel(), 'id' => $id, 'current' => $current, 'items' => $items];
    }
}
