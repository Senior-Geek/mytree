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

- Milestone 3A workflow investigation of WT-001/WT-002 against existing
  webtrees functionality: report in
  `docs/investigations/WT-001-WT-002-workflow-review.md`, a draft (unsubmitted)
  upstream bug report for "Find duplicates" failing on SQLite, and an
  investigation baseline suite in `e2e/investigations/`
  (`npm run investigate`), separate from the regression suite.
- Revised and renamed the enhancement specifications following the
  investigation:
  - WT-001 → `WT-001-guided-census-evidence-workflow.md` (contextual workflow
    guidance in the Census Assistant; inline person creation deferred).
  - WT-002 → `WT-002-duplicate-aware-evidence-entry.md` (duplicate source and
    same-record duplicate citation/fact warnings; attaching existing sources
    is already supported).
- Added an investigate-before-implement policy to `BACKLOG.md` and
  `CLAUDE.md`.

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
