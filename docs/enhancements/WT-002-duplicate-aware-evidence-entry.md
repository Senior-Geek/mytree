# WT-002 — Duplicate-Aware Evidence Entry

**Priority:** High
**Status:** Investigated — scope revised (not started)
**Category:** Data Quality / Workflow Enhancement
**Formerly:** "Attach Existing Source to Person" (revised 2026-10-17 after the
Milestone 3A investigation)

## Background and revision history

### Original objective (preserved)

The original WT-002 addressed this problem:

> When editing a person record, MyTree currently allows creation of a new
> source record but does not provide a convenient way to attach an existing
> source. This encourages duplicate source records.

It proposed an "Attach Existing Source" option next to "Create New Source",
a searchable list of sources, attaching without duplication, duplicate
checks (exact and fuzzy) when creating sources with "Use Existing Source" /
"Create New Anyway", and keeping unsaved person-record changes. Its key rule
still holds: **warnings must never merge records automatically**, and
duplicate detection must tell a general source apart from a specific
citation.

The underlying objective is unchanged: avoid duplicate sources and
citations without getting in the way of legitimate reuse.

### What the investigation found

The Milestone 3A investigation
([docs/investigations/WT-001-WT-002-workflow-review.md](../investigations/WT-001-WT-002-workflow-review.md))
found that most of the original required behaviour **already exists**:

| Original requirement | Existing functionality |
|---|---|
| Attach existing source / searchable list | Every *Source citation* field is a searchable source picker (title words in any order, or XREF) |
| Attach without duplicating | Picking a source creates a citation pointing at the existing record |
| Associate a source with many people | Each person has their own citation pointing at one shared source record |
| Preserve unsaved changes | *Create a source* is a pop-up; unsaved form input is kept (verified) |
| Reuse citation details | *Citation details* autocomplete offers details already used with the chosen source; the fact clipboard copies whole facts with their citations |

The genuine gap is duplicate awareness when entering data. Testing showed:

* an identical source title saved without warning (a second source
  record was created);
* a near-identical title ("Lower Quillham 1851 census (Testshire)") saved
  without warning;
* the same citation (source plus citation details) added twice to one
  person saved without warning. The admin data fix *Remove duplicate links*
  finds this afterwards;
* a census fact pasted twice onto the same person saved without warning,
  and **no** existing tool detects it;
* the admin *Find duplicates* report (exact source title; exact name plus
  vital date) runs only after the fact, and currently **crashes on SQLite**
  (upstream bug, see
  [docs/investigations/upstream-bug-sqlite-find-duplicates.md](../investigations/upstream-bug-sqlite-find-duplicates.md)).

### Revised direction (Project Director decision, 2026-10-17)

WT-002 now focuses on **duplicate-aware evidence entry**:

* possible duplicate **source records**;
* duplicate **citations or facts on the same record**.

It must **not** warn just because the same source and citation details are
cited for different people. That is the normal, correct pattern, e.g. one
census entry cited for every household member.

## Terminology

| Term | Meaning in MyTree / GEDCOM |
|---|---|
| **Source record** | A standalone, shared `0 @S@ SOUR` record (e.g. a census for a year and place) |
| **Citation** | A `SOUR @S@` reference inside a person, family or fact |
| **Citation details** | The citation's `PAGE` and related subfields (piece, folio, page, schedule, entry) |

Citations stay inside the records that cite them, as webtrees already does.
They are **not** to become standalone database objects.

## Problem

1. A user creating a source can't tell that an equivalent source may
   already exist, so duplicate source records build up.
2. A user can add the same citation, or paste the same fact, to a record
   that already has it, producing duplicate data that existing tools detect
   only partly and only afterwards.

## Required Behavior

### A. Possible duplicate sources (when creating a source)

1. Before a new source is saved, from the *Create a source* pop-up or the
   Control panel, check for existing sources that may be equivalent.
2. **Exact checks:** identical title (ignoring case, punctuation and
   whitespace), identical abbreviation, or identical repository call
   number / reference number where present.
3. **Similarity checks (later phase, shared with future person matching):**
   overlapping significant title words, years and places. Example:
   "1851 Census — John Marriott Household" vs. "John Marriott, Census 1851".
4. If candidates are found, list them (title, abbreviation, repository,
   number of linked records) and offer **Use existing source** or **Create
   new anyway**.
5. **Use existing source** selects that source in the field that opened the
   pop-up. Unsaved input in the underlying form is kept.
6. Granularity guidance: a warning should point out when the new title looks
   like a *citation* (a household, page or entry) rather than a *source*
   (e.g. a census year and place), and suggest using citation details
   instead.

### B. Duplicate citations or facts on the same record

1. When adding a citation, or saving or pasting a fact, warn if **the same
   record** already has:
   - a citation to the same source with the same citation details at the
     same level (record-level, or within the same fact); or
   - a fact of the same type and date that cites the same source and
     citation details (e.g. the same census fact pasted twice).
2. Offer **Cancel** or **Save anyway**. Never merge or remove anything
   automatically.

### C. What must not trigger a warning

- The same source and citation details cited by **different** people,
  families or facts.
- The same source cited by one person with **different** citation details
  (e.g. two different census years in one "England census" source, or two
  entries in one parish register).

## Acceptance Criteria

- Creating a source with a title identical (after normalisation) to an
  existing source shows the candidate before saving.
- The user can choose *Use existing source* (the existing source is
  selected and unsaved input kept) or *Create new anyway* (the new source
  is created).
- Adding an identical citation, or pasting an identical fact, to the same
  record shows a warning; the user can still proceed.
- Citing the same source and citation details for several different people
  produces **no** warning (verified with the fictional 1851 household).
- No record is ever merged, deleted or changed automatically.
- The existing `e2e/` regression suite passes; the investigation baseline
  (`e2e/investigations/`) is updated where behaviour is deliberately changed.

## Out of Scope (initial implementation)

- Fuzzy or similarity scoring beyond exact or normalised matching (a later
  phase, designed once and shared with person matching for WT-001's future
  enhancements).
- Changes to the GEDCOM data model or database schema.
- Automatic merging.

## Implementation Notes

- Preferred delivery is a custom module under `custom-modules/`.
- **Duplicate sources (A):** feasible as a module by replacing the
  `modals/create-source` view (`View::registerCustomView()`) and adding a
  module route that returns candidate sources. Existing search code
  (`SearchService::searchSourcesByName()`) can be reused.
- **Duplicate citations/facts (B):** harder without core changes, because the
  checks belong in the save paths (`EditFact`, `AddNewFact`, `PasteFact`). The
  options are, in order of preference:
  1. a client-side check from module JavaScript, using a module endpoint
     that compares the pending fact with the record's existing facts;
  2. a minimal, isolated, documented and tested core hook, proposed upstream
     where possible.

  Core changes are not authorised at this stage. If option 1 proves
  inadequate, write up the proposal before any core edit.
- A shared **duplicate-candidate service** in the module should serve both
  sources and, later, people (WT-001 future enhancements).
- Upstream bug: *Find duplicates* uses `LEAST`/`GREATEST`, which SQLite lacks.
  A draft bug report is held for review in `docs/investigations/`.
