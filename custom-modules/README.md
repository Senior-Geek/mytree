# MyTree custom modules — source directory

This directory holds the **tracked source** for MyTree-specific webtrees
modules (e.g. the WT-001/WT-002 implementations). It exists because upstream's
`.gitignore` excludes `/modules_v4/` entirely — that directory is where
webtrees actually loads modules from, but it is not where MyTree's own module
code is meant to live in git.

## Layout

One subdirectory per module, named the same as the module's directory name
under `modules_v4/`:

```
custom-modules/
└── mytree-<module-name>/
    ├── module.php          # module bootstrap, as required by webtrees
    └── ...                 # module classes, views, assets
```

## Deploying into `modules_v4/`

webtrees only discovers modules under `modules_v4/`, so each module here must
be made visible there before it will load. For local development, use a
symlink so edits take effect immediately without a copy step:

```bash
ln -s "$(pwd)/custom-modules/mytree-<module-name>" "modules_v4/mytree-<module-name>"
```

For a deployment where symlinks aren't practical (e.g. copying a release
elsewhere), copy instead:

```bash
cp -r "custom-modules/mytree-<module-name>" "modules_v4/mytree-<module-name>"
```

Either way, `modules_v4/` itself stays git-ignored — only `custom-modules/` is
tracked. Re-run the symlink/copy step after a fresh checkout.

## Modules

| Module | Purpose | Spec |
|---|---|---|
| [`mytree-identity`](mytree-identity/) | MyTree header (Help, Settings, Account menus), wordmark, favicons, titles, footer attribution, About page | [UI-001](../docs/enhancements/UI-001-identity-and-navigation.md) |
| [`mytree-lists`](mytree-lists/) | Individuals and Families lists show the records at once: search on top, records, count / paging / rows per page below; list state kept | [UI-002](../docs/enhancements/UI-002-searchable-lists.md) |
| [`mytree-theme`](mytree-theme/) | The MyTree theme (existing webtrees look, MyTree header layout, compact phone header) | [UI-001](../docs/enhancements/UI-001-identity-and-navigation.md) |

The Docker dev environment mounts each module into `modules_v4/` itself
(`docker/docker-compose.yml`); the symlinks above are for a non-Docker setup.
