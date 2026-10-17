# WT-001 — Guided Census Evidence Workflow

**Priority:** High
**Status:** Investigated — scope revised (not started)
**Category:** Workflow Guidance
**Formerly:** "Create Person from Source Record" (revised 2026-10-17 after the
Milestone 3A investigation)

## Background and revision history

### Original objective (preserved)

The original WT-001 addressed this problem:

> When entering a source record, such as a census, birth certificate, or
> marriage certificate, a person mentioned in that source may not yet exist
> in MyTree. Currently, this interrupts the evidence-entry workflow.

It proposed searching for people from within a source record, creating new
people inline with a compact form, automatically associating them with the
source, and returning to the source workflow without losing unsaved work.
Its example was an 1851 census household of seven people, three already in
the tree.

That objective still holds: entering evidence for a household should be
efficient, should not lose work, and should not create duplicate people.

### What the investigation found

The Milestone 3A investigation
([docs/investigations/WT-001-WT-002-workflow-review.md](../investigations/WT-001-WT-002-workflow-review.md))
found that webtrees already supports most of this workflow. The pieces are
just not obvious, and nothing explains the order to use them in:

* The core **Census Assistant**, on a census fact, takes the source and
  citation details once and builds a household table from people already in
  the tree. When saved, it gives **every linked member their own census fact
  and citation**, plus a shared note holding the household transcript.
* Every source-citation field has a source search box and an inline
  **Create a source** pop-up that keeps unsaved input.
* **Citation details** autocomplete from details already used with the
  chosen source.
* The **fact clipboard** copies a census fact, with its citation and
  transcript note, onto people added later.
* **Add a son/daughter** from the family page pre-fills the surname.

The real gaps are:

* people can't be created inline;
* occupants not in the tree can't be added as transcript rows;
* existing people are hard to find by married name;
* nothing guides the user through the correct sequence.

Creating people inline would be new data-entry functionality, with matching
and duplicate risks. Guidance has neither risk and makes the existing
features usable straight away.

### Revised direction (Project Director decision, 2026-10-17)

The first deliverable is a **contextual Workflow Assistant**: a help pop-up
inside the existing Census Assistant that explains the existing features and
recommends the order to use them in. It makes **no genealogical decisions**
and **changes no data**. Inline person creation, intelligent matching and
interactive household-row actions are possible later enhancements (see
*Future enhancements*).

## Problem

A census household is a single piece of historical evidence about several
people. Some are already in the tree, some are plausibly relatives not yet
recorded, and some (lodgers, servants, visitors, people whose family links
are unknown) may never become person records. The tools to record that
evidence properly already exist, but a user has to know:

* to identify the source and enter the citation details once;
* to transcribe the whole household, not just the family members;
* to search for existing people (including by maiden name, married name or
  other names) before creating anyone;
* to decide, for each occupant, whether to **link** them to an existing
  person, **create** a new person, or **leave them unlinked**;
* that the Census Assistant copies the citation only to **linked** people,
  and how to apply it to people created afterwards;
* to review the result before saving.

Without guidance, users either miss these features or use them in an order
that loses work. For example, leaving the census form to create a child
discards the household table.

## Principles

1. **Historical evidence is separate from genealogical interpretation.** The
   transcript records what the document says. Linking an occupant to a person
   record, or creating one, is an interpretation the user makes and
   confirms.
2. **Every occupant is preserved** in the household transcript (the shared
   note), including lodgers, servants, visitors and people whose family
   connections are unknown.
3. **Occupants not yet tied to a person record are "unlinked"**, never
   "unrelated". A different surname, or a lodger or visitor status, is not
   evidence of no relationship. Unlinked occupants can be investigated and
   linked later.
4. **No automatic decisions.** The assistant never creates people, never
   links occupants, never establishes relationships and never infers them
   from name similarity.
5. **Use what already exists.** The assistant explains and sequences
   existing webtrees functionality; it doesn't replace it.

## Nature of the Workflow Assistant: optional, on-demand help

The Workflow Assistant is an **optional, on-demand helper pop-up. It is not
a wizard.** Specifically:

* **Optional:** the user can ignore it entirely. The census workflow works
  exactly as it does today without ever opening it.
* **On demand:** it appears only when the user clicks its button. It never
  opens automatically, never prompts, and never blocks or interrupts the
  user's normal workflow.
* **Not a wizard:** it doesn't enforce an order, gate any step, or require
  the user to "complete" anything. The seven stages are reference guidance
  the user can read in any order.
* **No progress tracking:** it doesn't record, store or show which stages
  the user has done, either in the browser or on the server.
* **Doesn't change the form:** it never reads into, fills, changes, submits
  or resets the current form, and never creates or changes data.

## Required Behavior

1. A **Workflow Assistant** button (e.g. a help icon labelled "How to record
   this household") appears in the census fact form alongside the existing
   Census Assistant. It doesn't move, hide or change any existing control.
2. Clicking it opens a **non-modal or dismissible pop-up**. Opening or closing
   it never changes, submits or resets the form; all unsaved input is kept.
3. The pop-up walks through seven stages, explaining the existing
   functionality for each and the recommended order:
   1. **Identify the source.** Search the *Source citation* field first; use
      *Create a source* only if no suitable source exists; one source record
      per census returned (or per your chosen granularity), not per
      household.
   2. **Enter the citation details.** Piece, folio, page and schedule in
      *Citation details*, entered once (autocomplete offers values already
      used); the same reference in the assistant's *Citation* box for the
      transcript.
   3. **Transcribe the complete household.** Every occupant, in document
      order. People already in the tree become table rows. Explain the
      current limitation that other occupants must go in *Comments*, and
      suggest a consistent layout for them.
   4. **Search for existing people.** How to search by surname alone, maiden
      name, married name, other names, XREF; using lifespans and birthplaces
      shown in results; *Phonetic search* and *Advanced search* for spelling
      variants and age/place. Explain that a married-name search can fail if
      the married name was recorded without a given name.
   5. **Decide for each occupant:** link to an existing person, create a new
      person, or leave unlinked. Give considerations (maiden/married names,
      cousins and in-laws, age consistency, birthplace, known relationships)
      but no recommendation for any particular occupant. Leaving someone
      unlinked is a valid, reversible choice.
   6. **Apply citations to confirmed people.** People linked in the table get
      their own census fact and citation automatically on save. People
      created later get it via **Copy** on a linked member's census fact →
      **Add from clipboard**, or via a citation that reuses the same source
      and citation details. Recommend creating confirmed family members
      *before* opening the Census Assistant, so they can be linked in one
      pass.
   7. **Review and save.** Check the table, comments and citation; save; then
      check each linked person's census fact and the shared transcript note.
4. The content is **contextual only in where it appears**: it's the help for
   the form it's attached to (here, the census fact form). It doesn't watch
   the user's progress, highlight a "current" stage, or change with form
   state.
5. The content is **translatable** (standard webtrees `I18N`) and uses
   fictional examples only.
6. The pop-up mechanism is **reusable**: workflow content is defined
   separately from the button/pop-up component, so the same component can
   later serve other evidence workflows (birth, baptism, marriage, death,
   burial, probate, etc.) by supplying different content.

## Example — 1851 census household (fictional)

Household: head and wife already in the tree (the wife recorded under her
maiden name); two children not yet entered; a cousin with the wife's maiden
surname; a lodger; a domestic servant who shares a name with an older person
already in the tree.

Following the assistant, the user:

* creates the two children from the family page;
* opens the Census Assistant on the head and links head, wife and children;
* records the cousin, lodger and servant in the transcript as unlinked
  occupants;
* investigates the cousin separately, without creating a relationship from
  the surname alone;
* recognises the servant's namesake in the tree as a different person
  because of the age difference.

The assistant explains each step but makes none of these decisions itself.

## Acceptance Criteria

- The Workflow Assistant button is visible wherever the Census Assistant is
  available, and nowhere else (until reused for other workflows).
- Opening, navigating and closing the pop-up changes no form data and never
  submits the form.
- The pop-up never opens without a user click, never blocks other controls
  while closed, enforces no step order, and stores no progress state.
- With the pop-up never opened, the census form behaves identically to core
  webtrees.
- All seven stages are covered and describe the existing functionality
  accurately, including its current limitations.
- No person, family, citation, note or relationship is created, linked or
  changed by the assistant.
- The terminology "unlinked" (never "unrelated") is used for occupants not
  tied to a person record.
- The census workflow continues to work exactly as before with the assistant
  disabled or the module removed.
- The existing `e2e/` regression suite passes unchanged; new e2e tests cover
  opening and closing the pop-up without data loss.
- The component accepts alternative workflow content without code changes to
  the component itself.

## Out of Scope (initial implementation)

- Any wizard behaviour: mandatory steps, enforced order, progress tracking,
  or automatic opening.
- Inline person creation.
- Automated or fuzzy person matching or scoring.
- Interactive household-row actions (blank rows, "create from this row",
  per-row link/create/unlinked controls).
- Any change to how the Census Assistant stores data.
- Core (`app/`) modifications.

## Future Enhancements (separately specified when prioritised)

- Inline "Create individual" pop-up from person pickers and the Census
  Assistant (keeping unsaved work).
- Blank transcript rows for unlinked occupants, so the household table is
  complete.
- Interactive row actions: link / create / leave unlinked, with confirmation.
- Person matching that considers maiden, married and alternative names,
  approximate ages, places and known relationships (shared with WT-002).
- Workflow content for birth, marriage, death and other evidence types.

## Implementation Notes

**Delivery as a custom module: feasible without core changes** (code
analysis, 2026-10-17; not yet prototyped):

- A custom module (e.g. `custom-modules/mytree-evidence-workflow/`) can
  register its own view namespace and replace the core view
  `modules/census-assistant` using `View::registerCustomView()` in its
  `boot()` method.
- The replacement view can **render the original core view unchanged** by
  calling it with an explicit name (`view('::modules/census-assistant', …)`).
  Explicit `::` names bypass the replacement mechanism (`View::getFilenameForView()`),
  so the module adds its button and pop-up around the upstream markup instead
  of copying it. This keeps upstream changes to the Census Assistant flowing
  through automatically.
- The pop-up can use the Bootstrap modal/offcanvas components already loaded
  by webtrees. No CSP is in place that would block a small module script.
- Fallback / generalisation: `ModuleGlobalInterface::bodyContent()` can
  inject a script on edit pages that detects specific fact forms (e.g.
  `[id$="-INDI-BIRT-DATE"]`) and adds the button. That is the likely route for
  reusing the component on birth, marriage and death forms, which have no
  assistant view to wrap.
- Risk: the Census Assistant view only renders when the core
  `GEDFact_assistant` module is enabled; the Workflow Assistant should
  depend on it.

A short prototype should confirm this before implementation begins (per the
investigate-before-implement policy in `BACKLOG.md`).
