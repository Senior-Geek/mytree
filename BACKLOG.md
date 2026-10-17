# MyTree Backlog

Master index of proposed MyTree enhancements. Each entry links to a full
specification in `docs/enhancements/`. This file tracks priority and status
only — the specifications themselves are the source of truth for scope and
acceptance criteria, and should not be edited here.

| ID | Title | Priority | Status | Spec |
|----|-------|----------|--------|------|
| WT-001 | Create person from source record | High | Proposed — architecture assessed | [docs/enhancements/WT-001-create-person-from-source.md](docs/enhancements/WT-001-create-person-from-source.md) |
| WT-002 | Attach existing source to person | High | Proposed — architecture assessed | [docs/enhancements/WT-002-attach-existing-source.md](docs/enhancements/WT-002-attach-existing-source.md) |

## Status values

* **Proposed** — specification written, not yet assessed against the codebase.
* **Proposed — architecture assessed** — feasibility reviewed against
  webtrees' existing code; no implementation started.
* **In progress** — implementation underway on a feature branch.
* **Done** — merged into `development`.
* **Deferred** — valid idea, not scheduled.

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

### Architectural consideration: duplicate detection (not yet implemented)

Duplicate detection is central to WT-002's fuzzy-matching requirement, and
also relevant to WT-001's "existing people can be selected without
duplication" criterion. webtrees has no existing fuzzy-matching equivalent —
the current admin "Find duplicates" tool (`AdminService::duplicateRecords()`)
only does exact-match grouping (identical source name; identical date+name
for individuals). Genuinely fuzzy comparison (e.g. "1851 Census — John
Marriott Household" vs. "John Marriott, Census 1851") would be new logic.

This is recorded here as a design constraint for whoever implements WT-001
or WT-002 — **it is not scheduled or implemented at this stage**. Whichever
enhancement is built first should design this once, as shared logic, rather
than each spec growing its own ad hoc duplicate check.

## Adding a new entry

1. Write the specification in `docs/enhancements/WT-0XX-short-title.md`,
   following the structure of WT-001/WT-002 (Problem, Required Behavior,
   Acceptance Criteria, Implementation Notes).
2. Add a row to the table above.
3. Do not start implementation until priority and status are agreed.
