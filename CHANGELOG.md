# Changelog

All notable MyTree-specific changes are documented here, in the style of
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

This file tracks **MyTree's own changes only**. It does not restate upstream
webtrees history — that remains in `git log` and upstream's own release notes
at <https://github.com/fisharebest/webtrees/releases>. Each entry below is
tagged as either:

* **MyTree** — a change specific to this fork (new feature, custom module,
  documentation, configuration).
* **Upstream sync** — a note recording that upstream changes were merged in,
  with the commit range or tag, but without restating upstream's own log.

## [Unreleased]

### MyTree
- Added fork documentation: `README.md` rewritten to identify MyTree as a
  fork of webtrees with upstream attribution; added `DEVELOPMENT.md`,
  `BACKLOG.md`, and this `CHANGELOG.md`.
- Added initial enhancement specifications in `docs/enhancements/`:
  - `WT-001-create-person-from-source.md` — create a person inline while
    editing a source record.
  - `WT-002-attach-existing-source.md` — attach an existing source to a
    person, with duplicate detection.

### Upstream sync
- Forked from `fisharebest/webtrees` at commit `c5ddf7f816` ("Fix:
  SearchService tests"), 2026-10-17.

<!--
Template for future upstream syncs:

### Upstream sync
- Merged upstream `main` from `<old-commit>` to `<new-commit>` (`<old-tag>`
  → `<new-tag>`). See the upstream changelog for details.
- Conflicts/adjustments required in MyTree code: <none | describe>.
-->
