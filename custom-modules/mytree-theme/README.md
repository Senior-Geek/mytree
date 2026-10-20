# mytree-theme

The **MyTree** theme. Implements part of
[UI-001 — MyTree Identity & Navigation](../../docs/enhancements/UI-001-identity-and-navigation.md).

The familiar webtrees layout and grey/blue colours under the MyTree name: it
loads the core "webtrees" theme stylesheet unchanged, then
`resources/css/mytree-theme.css`, which

* removes the webtrees logo (the MyTree wordmark comes from
  [mytree-identity](../mytree-identity/));
* arranges the header as *wordmark · tree title · search · Help · Settings ·
  Account*, with the genealogy menu below;
* on phones (< 768 px): wordmark and the three menus on one row, then the
  tree title, a full-width search box, and a text-only genealogy menu with
  44 px touch targets.

No new palette yet (UI-001 keeps the existing appearance).

## Installation

```bash
ln -s "$(pwd)/custom-modules/mytree-theme" modules_v4/mytree-theme
```

The Docker dev environment mounts it instead (`docker/docker-compose.yml`).
Then, once per installation:

* make it the default theme:
  `php index.php site-setting THEME_DIR _mytree-theme_`
  (or *Control panel → Website preferences → Default theme*);
* *Control panel → Modules → Themes*: disable the **webtrees** theme.

Keep this module enabled: if no enabled theme matches the site default,
webtrees falls back to its own "webtrees" theme, even when that is disabled.
