# MyTree Backlog

Master index of proposed MyTree enhancements. Each entry links to a full
specification in `docs/enhancements/`. This file tracks priority and status
only — the specifications themselves are the source of truth for scope and
acceptance criteria, and should not be edited here.

| ID | Title | Priority | Status | Spec |
|----|-------|----------|--------|------|
| WT-001 | Guided census evidence workflow *(formerly "Create person from source record")* | High | Investigated — scope revised | [docs/enhancements/WT-001-guided-census-evidence-workflow.md](docs/enhancements/WT-001-guided-census-evidence-workflow.md) |
| WT-002 | Duplicate-aware evidence entry *(formerly "Attach existing source to person")* | High | Investigated — scope revised | [docs/enhancements/WT-002-duplicate-aware-evidence-entry.md](docs/enhancements/WT-002-duplicate-aware-evidence-entry.md) |
| UI-001 | MyTree identity & navigation (branding, new header, upgrade mechanism disabled) | High | Done (2026-10-20) | [docs/enhancements/UI-001-identity-and-navigation.md](docs/enhancements/UI-001-identity-and-navigation.md) |

Both specs were revised after the Milestone 3A investigation, which found
most of the original requirements already supported by core webtrees:
[docs/investigations/WT-001-WT-002-workflow-review.md](docs/investigations/WT-001-WT-002-workflow-review.md).
Implementation (Milestone 3B) is **not** authorised yet.
UI-001 was authorised on 2026-10-20 after the branding and UI
inventory ([docs/investigations/UI-001-identity-and-navigation.md](docs/investigations/UI-001-identity-and-navigation.md)).

## Status values

* **Proposed** — specification written, not yet assessed against the codebase.
* **Proposed — architecture assessed** — feasibility reviewed against
  webtrees' existing code; no implementation started.
* **Investigated — scope revised** — existing functionality checked
  hands-on (code + Playwright) per the policy below; spec rewritten to
  cover only genuine gaps; no implementation started.
* **In progress** — implementation underway on a feature branch.
* **Done** — merged into `development`.
* **Deferred** — valid idea, not scheduled.

## Investigate before implementing

Before any enhancement is implemented:

1. **Investigate existing functionality first.** Treat the spec as a
   statement of the user's problem, not a fixed technical solution. Check
   the code *and* the running application (Playwright against the fictional
   dev tree) for features, settings, modules, clipboard/batch operations or
   workflows that already meet the need.
2. **Write up the findings** in `docs/investigations/` (existing
   functionality, how to reach it, verification, confirmed limitations,
   classification as *already supported / configuration change / usability
   improvement / new capability*).
3. **Record current behaviour as a baseline** in `e2e/investigations/`
   (run with `cd e2e && npm run investigate`), kept separate from the
   regression suite.
4. **Revise the spec** to cover only genuine gaps, keeping the original
   objective and explaining the revision, after discussion with the
   Project Director.
5. **Confirm the delivery route**: a custom module by default. A core
   (`app/`) change only when a module genuinely can't do it, and then
   isolated, documented, tested, with its upstream-sync implications
   explained and explicitly approved.
6. **Get explicit authorisation** before starting implementation.

## Shared functionality

WT-001 and WT-002 both depend on the same underlying capability: searching
for an existing record, letting the user pick it or create a new one inline,
and linking the result back into the record currently being edited, all
without losing unsaved work on that record. webtrees already has building
blocks for each piece (see the architecture assessment in the project
summary / commit discussion for specifics: `SearchService`, the
`AbstractTomSelectHandler`-based pickers, and the existing `Create*`
controllers for sources, media, etc.). Any implementation work should design
one reusable "search → select → create inline → link" pattern and apply it
to both enhancements, rather than building two independent features.

*Update after Milestone 3A:* the "search → select" half, inline source
creation and per-person citation copying already exist in core (see the
investigation report). The revised WT-001 starts with workflow guidance only;
inline person creation is a future enhancement. The pieces shared by the
revised specs are a reusable contextual-help component (WT-001, later
reusable for other evidence types) and a shared duplicate-candidate service
(WT-002 sources now; people later).

### Architectural consideration: duplicate detection (not yet implemented)

Duplicate detection is central to WT-002's fuzzy-matching requirement, and
also relevant to WT-001's "existing people can be selected without
duplication" criterion. webtrees has no existing fuzzy-matching equivalent —
the current admin "Find duplicates" tool (`AdminService::duplicateRecords()`)
only does exact-match grouping (identical source name; identical date+name
for individuals), and currently crashes on SQLite (upstream bug; draft report
held for review in
[docs/investigations/upstream-bug-sqlite-find-duplicates.md](docs/investigations/upstream-bug-sqlite-find-duplicates.md)). Genuinely fuzzy comparison (e.g. "1851 Census — John
Marriott Household" vs. "John Marriott, Census 1851") would be new logic.

This is recorded here as a design constraint for whoever implements WT-001
or WT-002 — **it is not scheduled or implemented at this stage**. Whichever
enhancement is built first should design this once, as shared logic, rather
than each spec growing its own ad hoc duplicate check.

## Adding a new entry

1. Investigate existing functionality first (see "Investigate before
   implementing" above). Then write the specification in `docs/enhancements/WT-0XX-short-title.md`,
   following the structure of WT-001/WT-002 (Problem, Required Behavior,
   Acceptance Criteria, Implementation Notes).
2. Add a row to the table above.
3. Do not start implementation until priority and status are agreed.
