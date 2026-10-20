<?php

declare(strict_types=1);

namespace MyTree\Identity;

use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\Contracts\UserInterface;
use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Tree;

/**
 * MyTree's names for the webtrees roles (UI-001).
 *
 * Presentation only: the role a user has is always read from webtrees' own
 * checks (Auth::isAdmin(), Auth::isManager(), ...), and every permission is
 * still enforced by webtrees. Nothing here grants or changes access.
 *
 *   MyTree               webtrees
 *   Visitor              Visitor (not signed in, or no role in this tree)
 *   Viewer               Member
 *   Editor               Editor
 *   Moderator            Moderator (an editor who can also approve others' changes)
 *   Tree Administrator   Manager
 *   Site Administrator   Administrator (the site-wide "Administrator" option)
 */
final class RoleNames
{
    public const string VISITOR            = 'visitor';
    public const string VIEWER             = 'viewer';
    public const string EDITOR             = 'editor';
    public const string MODERATOR          = 'moderator';
    public const string TREE_ADMINISTRATOR = 'tree-administrator';
    public const string SITE_ADMINISTRATOR = 'site-administrator';

    /**
     * The user's role in a tree. (Roles are per tree; only site administrators
     * have one role everywhere.)
     */
    public function key(Tree $tree, UserInterface $user): string
    {
        if (Auth::isAdmin($user)) {
            return self::SITE_ADMINISTRATOR;
        }

        return match (true) {
            Auth::isManager($tree, $user)   => self::TREE_ADMINISTRATOR,
            Auth::isModerator($tree, $user) => self::MODERATOR,
            Auth::isEditor($tree, $user)    => self::EDITOR,
            Auth::isMember($tree, $user)    => self::VIEWER,
            default                         => self::VISITOR,
        };
    }

    public function label(string $key): string
    {
        return match ($key) {
            self::SITE_ADMINISTRATOR => I18N::translate('Site Administrator'),
            self::TREE_ADMINISTRATOR => I18N::translate('Tree Administrator'),
            self::MODERATOR          => I18N::translate('Moderator'),
            self::EDITOR             => I18N::translate('Editor'),
            self::VIEWER             => I18N::translate('Viewer'),
            default                  => I18N::translate('Visitor'),
        };
    }

    /**
     * The webtrees name of the role, for reference.
     */
    public function webtreesLabel(Tree $tree, UserInterface $user): string
    {
        if (Auth::isAdmin($user)) {
            return I18N::translate('Administrator');
        }

        return match (true) {
            Auth::isManager($tree, $user)   => I18N::translate('Manager'),
            Auth::isModerator($tree, $user) => I18N::translate('Moderator'),
            Auth::isEditor($tree, $user)    => I18N::translate('Editor'),
            Auth::isMember($tree, $user)    => I18N::translate('Member'),
            default                         => I18N::translate('Visitor'),
        };
    }

    /**
     * All roles, lowest first: key => [label, webtrees name(s), what it allows].
     *
     * @return array<string,array{0:string,1:string,2:string}>
     */
    public function all(): array
    {
        return [
            self::VISITOR => [
                $this->label(self::VISITOR),
                I18N::translate('Visitor'),
                I18N::translate('Not signed in. Sees only what each family tree’s privacy settings show to everyone.'),
            ],
            self::VIEWER => [
                $this->label(self::VIEWER),
                I18N::translate('Member'),
                I18N::translate('Read-only access to the records the family tree’s privacy settings allow. Cannot edit records or administer users.'),
            ],
            self::EDITOR => [
                $this->label(self::EDITOR),
                I18N::translate('Editor'),
                I18N::translate('Can add and change records in the family trees where this role is assigned. Changes wait for a moderator’s approval unless the account accepts its own changes. Cannot administer user accounts or privileges.'),
            ],
            self::MODERATOR => [
                $this->label(self::MODERATOR),
                I18N::translate('Moderator'),
                I18N::translate('Everything an editor can do, plus approving or rejecting other people’s pending changes, in the family trees where this role is assigned. Cannot administer user accounts or privileges.'),
            ],
            self::TREE_ADMINISTRATOR => [
                $this->label(self::TREE_ADMINISTRATOR),
                I18N::translate('Manager'),
                I18N::translate('Everything a moderator can do, plus the family tree’s preferences, privacy and visitor access, imports and exports, in the family trees where this role is assigned. Cannot create, change, disable or delete user accounts, or assign roles.'),
            ],
            self::SITE_ADMINISTRATOR => [
                $this->label(self::SITE_ADMINISTRATOR),
                I18N::translate('Administrator'),
                I18N::translate('Everything, in every family tree, plus website settings, modules and user accounts: creates, changes, disables (unapproves) and deletes accounts, approves registrations, and assigns family tree roles and site administrator rights.'),
            ],
        ];
    }
}
