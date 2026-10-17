# WT-001 / WT-002 — Workflow Investigation (Milestone 3A)

**Date:** 2026-10-17
**Branch:** `development` (no application code changed)
**Scope:** What unmodified webtrees already does for "create people from source
evidence" (WT-001) and "reuse sources and citations" (WT-002). This is an
investigation only. Nothing in WT-001 or WT-002 has been implemented.

> **Update (2026-10-17):** the Project Director's decisions on §11 are in
> §12. The specs have since been revised: WT-001 is now the *Guided Census
> Evidence Workflow* and WT-002 is *Duplicate-Aware Evidence Entry*.
> §§1–11 are kept as originally written, as the record of the investigation.

---

## 1. Summary

The original specs assume the missing pieces are a way to **attach an existing
source** and a way to **cite the same evidence for several people**. Both
already exist. Testing found that:

* **Attaching an existing source already works.** Every citation field
  (person, fact, family, association) is a searchable source picker with a
  **+ Create a source** button next to it. The button opens a modal, so
  anything already typed into the form is kept.
* **Citation details can be reused.** The *Citation details* (`PAGE`) field
  autocompletes from the details already used with the chosen source.
* **The Census Assistant already does most of the census workflow.** It's a
  core module, enabled in this install. You enter the census source and
  citation once on the head's census fact. You add people already in the tree
  to a household table, and it fills in relationship, marital condition, age
  and birthplace. When you save, it creates a shared note with the household
  transcript. It also gives **every linked member their own copy of the census
  fact, with its own citation**.
* **The fact clipboard covers the rest.** You can copy a census (or any other)
  fact, including its citation and note, and paste it onto another person.

The real gaps are smaller than the specs suggest:

1. **People can't be created inline.** Every other record type (source, note,
   media, repository, submitter, location) has a modal "create" button next to
   its picker. Individuals don't. Any new person means leaving the current
   form, and the census-assistant table is lost when you do.
2. **The census assistant can only add rows for people already in the tree.**
   You can't add a row for a lodger or servant. They can only go in the
   free-text *Comments* box, so the transcript isn't one complete table.
3. **There are no duplicate warnings when you save.** That applies to sources,
   people, citations and pasted facts. Checks only exist as admin tools you run
   afterwards, and the main one, **Find duplicates, crashes on SQLite** (see
   §8.1).
4. **Married names have no given name by default.** Searching for the wife as
   "Martha Quillbrook" finds nothing.

**Recommendation:** narrow WT-001 to "create a person inline from any person
picker, and from the census assistant". Narrow WT-002 to "warn about likely
duplicates when creating a source, and when adding a citation or fact a person
already has". Build both in **one custom module** around one shared "find or
create a person" modal (§10).

---

## 2. Terminology: sources, citations and citation details in webtrees

webtrees keeps the GEDCOM 5.5.1 model. There is no separate "citation" table.

| Concept | GEDCOM | Where it lives | Example from the test |
|---|---|---|---|
| **Source record** | `0 @X106@ SOUR` + `1 TITL …` | Its own record (`wt_sources`). Shared and searchable. | `1851 Census of England — Lower Quillham, Testshire` |
| **Citation** | `n SOUR @X106@` | Inside the citing record. Level 1 cites the whole person; level 2 cites one fact (e.g. `1 CENS` → `2 SOUR`). | `1 CENS` / `2 SOUR @X106@` on Josiah, and a separate copy on Martha |
| **Citation details** | `n+1 PAGE …` (also `DATA/TEXT`, `QUAY`, `OBJE`, `NOTE`) | Inside the citation | `3 PAGE HO 107/9999 folio 12 page 3 schedule 45` |
| **Household transcript** | `0 @X107@ NOTE` (shared note) | Its own record, linked from each member's census fact with `2 NOTE @X107@` | Created by the census assistant |

So when the same census entry is cited for six people, there should be **one
source record**, **six citations**, and six copies of the same `PAGE` text, all
pointing at one shared transcript note. That is how webtrees and the census
assistant already work. It matches the preferred approach of not making
citations into separate objects. Each copy can then be edited independently
(e.g. adding a `QUAY` to one person).

---

## 3. Environment and how to reproduce

* Local SQLite dev install, tree `mytree_dev_test`, fictional admin with
  auto-accept on (DEVELOPMENT.md step 7), so no pending-change step was needed.
* **Fictional fixture.** These were made through the UI; all names and places
  are invented.
  * **Josiah Quillbrook** (b. abt 1811, Lower Quillham, Testshire) is head of
    household.
  * **Martha Pellowby** (b. abt 1815) is his wife. She is recorded under her
    maiden name, with family links to her father **William Pellowby** and her
    brother **Richard Pellowby**.
  * **Ann Cridgeworth (b. abt 1790)** is an older decoy who shares the
    servant's name.
* **The 1851 household being entered:**

  | Name | Rel. | Cond. | Age | Occupation | Status before entry |
  |---|---|---|---|---|---|
  | Josiah Quillbrook | Head | Mar | 40 | Ag Lab | in tree |
  | Martha Quillbrook | Wife | Mar | 36 | | in tree as *Pellowby* |
  | Eliza Quillbrook | Dau | | 9 | Scholar | not entered |
  | Samuel Quillbrook | Son | | 5 | | not entered |
  | Thomas Pellowby | Cousin | U | 19 | Ag Lab | not entered. The wife's maiden surname, so plausibly her nephew or cousin |
  | Henry Vosperton | Lodger | U | 34 | Blacksmith | not entered, relationship unknown |
  | Ann Cridgeworth | Serv | U | 16 | House Servant | not entered. A namesake aged 61 is in the tree |

  Source reference: `HO 107/9999 folio 12 page 3 schedule 45` (piece 9999 is
  deliberately fake).
* **Reproducible demonstration:**
  [`e2e/investigations/census-household.spec.js`](../../e2e/investigations/census-household.spec.js),
  run with `cd e2e && npm run investigate`. It builds its own fixture with
  per-run surnames. The checks pass when they find **current** behaviour,
  limitations included, so a future WT-001/WT-002 implementation is expected
  to break some of them on purpose. It uses a separate config
  (`playwright.investigations.config.js`), so `npm test` is unchanged.
  **Result: 8/8 passed. The existing regression suite still passes 6/6.**

---

## 4. Demonstration: the 1851 household in unmodified MyTree

The best current route, as checked with Playwright:

| # | Step | Where | Result |
|---|---|---|---|
| 1 | Open Josiah → **Edit → Add a fact → Census** (`/add-fact/{xref}/CENS`) | Person | Fact form opens |
| 2 | Click **+** (*Create a source*) next to the census **Source citation** picker, then enter the title | Modal | Source `X106` is created and picked automatically. **Text already typed (address) is kept.** |
| 2a | *Or*, if the source exists, type any words of its title in the picker (`quillham 1851`, `census 1851 testshire`) | Picker | Matches title words in any order |
| 3 | Enter **Citation details** `HO 107/…` once | Fact | |
| 4 | Choose **Census date and place → 1851 — England** | Fact | Census date is filled in as `30 MAR 1851`. **The place is not filled in.** |
| 5 | Click **Create a shared note using the census assistant** | Fact | Opens the household table with the head added. Its title is pre-filled as `1851 England - Census transcript - Josiah Quillbrook - Household` |
| 6 | Search the **Individuals** picker and click **add** for each person in the tree | Assistant | Martha's row: relation `wife`, condition `Mar`, AgeF `36`, birthplace `Upper Quillham, Testshire`. **Her name shows as `… Quillbrook`** (§8.2) |
| 7 | Try to add a lodger or servant row | Assistant | **Not possible.** Clicking *add* with nobody selected does nothing |
| 8 | Type the occupants who aren't in the tree into **Comments** | Assistant | Becomes free text below the table in the note |
| 9 | **Save** | | Josiah and Martha each get a `1 CENS` fact with its own `2 SOUR @X106@ / 3 PAGE …` and `2 NOTE @X107@`. `AGE`/`OCCU` are deliberately left off the copies. The shared note holds the table, the citation and the comments |
| 10 | Family page → **Add a daughter** for Eliza | Family | Surname is pre-filled. In the birth **Source citation**, pick the census source. **Citation details autocomplete** offers `HO 107/9999 …` after typing `HO 107` |
| 11 | Back on Josiah, click the **Copy** icon on the census fact. On Samuel: **Edit → Add from clipboard → Census — 1851** | Person | Samuel gets the identical census fact: citation, `PAGE` and the shared transcript note |
| 12 | Thomas (cousin): **Individual → add unlinked individual**, or add him as a child of Richard's family *if* the evidence supports it | | No relationship is suggested or created automatically (as required) |
| 13 | Lodger and servant: stay in the transcript note only | | They are recorded in the evidence but not added to the tree (as required) |

**Effort:** about 3 forms for the head and two existing people, plus one form
per new person, plus one paste per new person who needs the census fact. The
workflow loses work only if you leave the census form to create a person.

**Order that avoids lost work (workaround):** create the missing family members
first, from the family page. Then open the census assistant on the head and add
everyone at once. Each person gets their citation automatically and the
transcript has them all in proper rows. Only lodgers and servants end up in
*Comments*.

---

## 5. Requirement-by-requirement gap analysis

Classification key: **AS** = already supported · **CFG** = configuration
change · **UX** = usability improvement · **NEW** = new capability required.

### 5.1 WT-001: creating people from source evidence

| # | Requirement | Existing functionality / how to access | Playwright result | Confirmed limitation | Class | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Create a person while **viewing or editing a source** | Source page menus offer only source fields (Abbreviation, Author, Repository…). The *Individuals* tab lists linked people (5 for X106) | Menu contents checked | No "add person" on a source | NEW (low value) | Don't build this as such. Evidence entry starts from a fact (census, baptism), not from the source record. Cover it with #2 |
| 2 | Create a person **while entering a citation** / fact | None. Pickers for source, note, media, repository, submitter and location have **+ Create** modals (`app/Elements/Xref*.php`); `XrefIndividual` / `XrefAssociate` do not | Confirmed: no create button on individual pickers | Leaving the form loses unsaved input, including the census table | **NEW** | A "Create individual" modal on individual pickers, built on the existing `CreateSource` modal pattern (`data-wt-select-id`, JSON `value/text` response) |
| 3 | **Search and select existing people** without leaving | Tom Select individual picker (`TomSelectIndividual`): every word must match one name; also accepts an XREF. Results show name and lifespan | Works. `Quillbrook` finds Martha through her married name | `Martha Quillbrook` finds nothing (married name has no given name, §8.2). Results show the birth name, not the matching name | UX + CFG | Workaround: search by surname only. Long term, see §8.2 |
| 4 | Link **several people to the same source and citation** | Census assistant (census facts only); clipboard copy/paste (any fact); citation-details autocomplete | Each linked member got their own citation | Only census facts get the "household" handling. Baptism, marriage and other sources are one person at a time | AS (census) / UX (others) | Document it (§7). A general "apply to several people" isn't needed for MVP |
| 5 | **Keep unsaved information** while creating or selecting | Picking existing people is in-page (kept). Creating sources, notes and media is modal (kept) | Address text was still there after inline source creation | Creating a person means leaving the page | NEW | Same fix as #2 |
| 6 | **Copy/paste, clipboard or linking** functions | Fact clipboard (`ClipboardService`): **Copy** icon on any fact or citation; **Add from clipboard** in the person's Edit menu. Session-based, last 10 facts per record type. Also *Link to existing family*, associates (`_ASSO` with `RELA` such as *lodger* or *servant*) and the Clippings cart (export only) | Pasting a census fact carried the citation, `PAGE` and shared note | Paste copies the fact exactly as it is (including `AGE`/`OCCU` if present) and gives no warning if the person already has it | AS / UX | Document it. Add a duplicate check to paste (§6) |

### 5.2 WT-002: reusing sources and citation details

| # | Requirement | Existing functionality / how to access | Playwright result | Confirmed limitation | Class | Recommendation |
|---|---|---|---|---|---|---|
| 1 | **Pick an existing source** in a person record | Every *Source citation* field is a searchable picker (`TomSelectSource`) that matches title words in any order, or an XREF. Sources tab → **Add a source citation** | Found `1851 Census of England — Lower Quillham, Testshire` from `quillham 1851` and `census 1851 testshire` | Searches the title only, not abbreviation, author, repository or call number | AS (+ UX) | The spec's "Attach existing source" button is **already there**: the picker *is* that button. Searching more fields is an optional UX improvement |
| 2 | **Create a citation** for that source | Add a fact → **Source citation** (`/add-fact/{xref}/SOUR`) or the citation inside any fact | Covered by the existing regression suite and this investigation | — | AS | Document it |
| 3 | **Copy a citation**, including `PAGE` | Clipboard copy/paste of a level-1 citation or of a whole fact. **Citation details autocomplete** (`AutoCompleteCitation`) offers every `PAGE` already used with the chosen source | Autocomplete suggested `HO 107/9999 folio 12 page 3 schedule 45` | Only `PAGE` is suggested, not `QUAY`, text or media. A citation *inside* a fact can't be copied on its own, only the whole fact | AS / UX | Document it. Copying a fact-level citation alone is a possible later UX item |
| 4 | Apply the same citation to **several people or facts** | Census assistant (census); clipboard (one paste each) | Josiah, Martha and Samuel all ended up with the citation | One paste per person for non-census facts | AS / UX | Fine for now |
| 5 | **Avoid duplicate sources and citations** | None when saving. Afterwards: *Find duplicates* (exact title, **crashes on SQLite**), *Merge records*, data fix **Remove duplicate links** | An identical title made a second source (`X110`); a near-identical title made `X111`; neither gave a warning. Two identical level-1 citations on Richard: no warning, flagged later by *Remove duplicate links*. A census fact pasted twice: no warning, **not** flagged by any tool | No checks when saving | **NEW** | Warn about likely duplicate sources in the create-source modal, and about the same citation or fact already on a person (§6) |
| 6 | **Edit citation information separately** for each person | Each citation is held inside its own record, so editing one never changes another | Confirmed from the GEDCOM: separate `SOUR/PAGE` blocks | — | AS | Keep this design, as you preferred |

### 5.3 Census household desired outcomes

| # | Desired outcome | Status | Class |
|---|---|---|---|
| 1 | Pick or create the census source | Picker + inline **Create a source** | AS |
| 2 | Enter household citation details once | Census fact `PAGE` + assistant *Citation*, copied to every linked member | AS (you type it twice: the fact `PAGE` and the assistant's *Citation*) → UX |
| 3 | Find and select existing people | Assistant's Individuals picker | AS (married-name search gap → UX/CFG) |
| 4 | Spot plausible relatives not yet recorded | Nothing automatic. Manual tools: **Phonetic search** (`Pellowbie` → all Pellowbys; `Cridgworth` → Ann Cridgeworth), **Advanced search** (birth-year range and place), Relationships chart | **NEW** (fuzzy matching, deferred by this milestone) |
| 5 | Create new people only after confirmation | Today they're created by hand, so always confirmed | NEW (creating from the household table) |
| 6 | Separate citations created automatically for approved people | Done by the census assistant for members linked to the tree | **AS** |
| 7 | Don't add unlinked occupants to the tree by default | Nobody is added unless picked | AS |
| 8 | Keep the full household evidence, including people not added | Shared note keeps the table + comments. **Non-tree people can't be table rows** | UX (blank rows) |
| 9 | Consider maiden and married names, cousins, in-laws, ages, birthplaces and relationships when matching; no relationships from fuzzy matching | Picker shows lifespan; the assistant works out relation, condition, age and birthplace from tree data; phonetic search exists. No scoring | NEW (later milestone) |

### 5.4 Classification totals

* **Already supported:** WT-002 #1, #2, #3, #6; WT-001 #6; census #1, #6, #7.
* **Configuration:** married names with given names (surname tradition, or
  data entry habit; §8.2).
* **Usability improvement:** married-name search display; blank census rows;
  duplicate `PAGE` entry; source search fields; paste duplicate check.
* **New capability:** creating a person inline (WT-001 #2/#5), duplicate
  warnings when saving (WT-002 #5), fuzzy candidate matching (census #4/#9,
  deferred).

---

## 6. Duplicate detection

| Category | Existing check | When | Verified | Gap |
|---|---|---|---|---|
| **Duplicate people** | *Control panel → tree → Find duplicates* (`AdminService::duplicateRecords`): identical full name **and** identical birth/baptism/death/burial date. *Merge records* to resolve. *Phonetic search* (Russell / Daitch-Mokotoff) is the only fuzzy matching | Admin, afterwards | **Page crashes on SQLite** (§8.1). Phonetic search works | Nothing warns when you create a person. Fuzzy matching is manual |
| **Duplicate source records** | *Find duplicates*: identical title only | Admin, afterwards | Identical and near-identical titles saved without warning | Nothing warns when you create a source. No fuzzy title matching |
| **Same citation twice on one person or fact** | Data fix **Remove duplicate links** (`FixDuplicateLinks`) finds byte-identical repeated link blocks. *Merge records* also removes them | Admin, afterwards | Flagged Richard's two identical citations | Nothing warns when adding. Doesn't catch a **whole fact pasted twice** (Martha / Samuel got two identical census facts) |
| **Legitimate shared citation** (same source and `PAGE` on different people) | Correctly **not** treated as a duplicate by any tool | — | Five people cite X106 with the same `PAGE` | None. Any new check must leave this alone |

**Where new checks would help most (in order):**

1. **Create-source modal:** before saving, show existing sources whose titles
   share most words with the new one (e.g. `1851`, `Census`, `Quillham`) and
   offer *Use existing* / *Create anyway*. Exact title matches first; fuzzy
   matching later.
2. **Adding a fact, citation or paste to a person:** warn if the person
   already has a fact of the same type and date citing the same source and
   `PAGE`.
3. **Creating a person (WT-001 modal):** show existing people with matching
   surname plus given name, including married names, with lifespans, before
   creating.

The legitimate shared-citation case must never trigger a warning.

---

## 7. Alternative workflows that work today (exact steps)

**A. Attach an existing source to a person (WT-002 core).** Person → **Sources**
tab → **Add a source citation**, or the *Source citation* field inside any
fact → type any words of the title → pick it → enter **Citation details**
(start typing to get suggestions from earlier citations) → Save.

**B. Create a source without leaving a person form.** Click **+** (*Create a
source*) to the left of any *Source citation* picker → fill in the modal →
Save. The new source is picked automatically and the rest of the form is
unchanged.

**C. Census household.** Person (head) → **Edit → Add a fact → Census** → pick
the source and enter *Citation details* → **Census date and place** → **Create
a shared note using the census assistant** → add each person already in the
tree → edit table cells as needed → put people not in the tree into
*Comments* → Save. Every linked member gets their own census fact and
citation.

**D. Give a new person an existing census entry.** On someone who already has
it: **Copy** icon on the census fact → on the new person: **Edit → Add from
clipboard → Census — 1851**. The clipboard holds the last 10 facts per record
type for the browser session; **Edit → Empty the clipboard** clears it.

**E. Find possible matches by hand.** **Search → Phonetic search** (surname
variants), **Search → Advanced search** (birth year ± range, birthplace), and
the individual picker searching by surname only (this finds married names).

**F. Record a lodger or servant who *is* in the tree** without making them
family: census fact → **Associate** (`_ASSO`) → Relationship **Lodger** /
**Servant**.

**G. Clean up afterwards.** Control panel → tree → **Data fixes → Remove
duplicate links**; **Merge records** for duplicate people or sources; **Find
duplicates** (MySQL/PostgreSQL only until §8.1 is fixed).

**Other modules:** core has no batch-update module (webtrees 2.x replaced it
with *Data fixes*). Third-party modules were **not** evaluated, because this
milestone used only the local install.

---

## 8. Other findings

### 8.1 Upstream bug: *Find duplicates* crashes on SQLite

`/tree/{tree}/duplicates` fails with `SQLSTATE[HY000]: no such function:
LEAST` from the families query in `AdminService::duplicateRecords()`
(`app/Services/AdminService.php:154-155`). SQLite has multi-argument
`MIN()`/`MAX()` but no `LEAST`/`GREATEST`. This is an upstream defect, so per
the restrictions it hasn't been fixed here. It's worth reporting upstream, and
it only matters if production also runs on SQLite (see questions). A draft
bug report is held for review, not submitted, in
[upstream-bug-sqlite-find-duplicates.md](upstream-bug-sqlite-find-duplicates.md).

### 8.2 Married names are created without a given name

With the default **paternal** surname tradition, adding a wife creates
`1 NAME /Quillbrook/ 2 TYPE MARRIED` with **no given name**. It is indexed as
`@P.N. Quillbrook`, which means:

* the picker can't find "Martha Quillbrook";
* the census assistant fills her row's name as `… Quillbrook`;
* list pages show `Martha Pellowby … Quillbrook`.

The add-spouse form does have a married-name block where the given name can be
typed. Typing it there, or changing the setting (Control panel → tree →
Preferences → *Surname tradition*), would avoid the problem without any code.

### 8.3 Smaller observations

* Choosing the census fills in the date but **not** the place.
* The census assistant has its own *Citation* text box (into the note),
  separate from the fact's `PAGE`, so the reference is typed twice.
* Census assistant rows can be edited. Occupation is always blank, because it
  isn't worked out from the tree.
* The individual picker always lists the currently selected person (Josiah)
  first in every search result. That's Tom Select behaviour, but it's
  confusing during a household search.

---

## 9. Recommendations for revising WT-001 and WT-002

These are proposals only. The specs haven't been edited (per CLAUDE.md).

**WT-001: rename to "Create person inline from evidence entry"**

* Remove "search existing person from the source record" (already available
  in every individual picker, census assistant included) and "associate with
  current source" (the citation already lives in the fact being entered).
* Keep and narrow:
  1. a **+ Create individual** modal next to individual pickers, for
     associates and the census assistant (sex, given names, surname, birth
     year/place, optional parent-family link);
  2. in the census assistant, let users **add a blank row** for someone not in
     the tree, plus a per-row **"Create person from this row"** action that
     pre-fills the modal from the row (name, age → estimated birth year,
     birthplace) and, only after confirmation, links the new person to the row
     so they get the census fact and citation when saved;
  3. a **simple duplicate check before creating**: same surname (birth or
     married) plus given name, showing lifespans. No fuzzy scoring yet.
* Acceptance criteria: unsaved form and assistant contents survive creating a
  person; no relationship is created unless the user picks a family.

**WT-002: rename to "Duplicate-aware source and citation entry"**

* Remove required behaviours 1–4 and 7. They're already supported (§5.2);
  record them as documented workflows instead.
* Keep and narrow:
  1. a **possible-duplicate list in the create-source modal** (exact
     title/reference first, word-overlap next, fuzzy later) with *Use
     existing* / *Create anyway*;
  2. a **duplicate citation/fact warning** when adding a citation or pasting a
     fact a person already has (same type, date, source and `PAGE`);
  3. optionally, the source picker also searching abbreviation, author and
     call number.
* State outright that the **same source and `PAGE` on different people is
  legitimate** and must never trigger a warning.

---

## 10. Proposed implementation strategy (only if you approve Milestone 3B)

**One custom module:** `custom-modules/mytree-evidence-entry/`, symlinked into
`modules_v4/`. No schema changes; plain GEDCOM only.

| Component | Serves | Approach | Core touch? |
|---|---|---|---|
| **Create-individual modal** (controller + view returning `{value, text, html}` like `CreateSource`) | WT-001 | Module route plus a view in the same style as `modals/create-source` | None |
| **Picker "+" button for individuals** | WT-001 | Module JS adds the button next to `select-individual` pickers in edit forms (same `data-wt-select-id` / `#wt-ajax-modal` mechanism), *or* override the `components/select-individual` view through the module's view namespace | None if done in JS or a view override |
| **Census assistant blank row + "create from row"** | WT-001 / census | Override `modules/census-assistant` view + extra JS. `censusTableEmptyRow()` already exists on the server side; only the JS stops you adding a blank row | None (view override) |
| **Duplicate-candidate service** (sources by title words; people by name incl. married names; facts and citations on a record) | Both | One shared service class in the module, reusing `SearchService` | None |
| **Duplicate warning in create-source** | WT-002 | Override `modals/create-source` to call the service before saving | None (view override) |
| **Fact/citation duplicate warning** | WT-002 | Hardest without core edits: needs a hook on `EditFact`/`PasteFact`. Options: client-side check from the module JS, or one small, upstreamable core patch | Possibly one small core edit. **Decision needed** |
| Fix `LEAST/GREATEST` on SQLite | Both (admin) | Upstream PR rather than a fork edit | Upstream |

Shared pieces: the **create-individual modal**, the **duplicate-candidate
service**, and the **modal/picker wiring** (already generic in webtrees). Build
these once and both enhancements reuse them. This matches the "search → select
→ create inline → link" pattern in BACKLOG.md, with the "search/select" part
already done by core.

Suggested order: (1) create-individual modal + picker button → (2) census
blank rows + create-from-row → (3) duplicate-candidate service + create-source
warning → (4) fact/citation duplicate warning → (5) fuzzy scoring (separate
milestone).

---

## 11. Questions for you to decide

1. **Production database:** will production MyTree run on SQLite? If so, the
   *Find duplicates* crash (§8.1) affects you. Should I prepare an upstream
   bug report or PR?
2. **Married names:** should we fix this by entry habit or configuration
   (§8.2), or should WT-001's person search also match married names that have
   no given name, e.g. by matching the person's other names?
3. **Census non-tree occupants:** is the transcript note (table + comments)
   enough evidence for lodgers and servants, or should they be proper table
   rows (blank-row UX, recommended)?
4. **Scope of WT-001:** census assistant first, or every individual picker
   (associates, facts) at once?
5. **Core edits:** is one small, upstreamable core change acceptable for the
   fact/citation duplicate warning, or should that stay client-side only?
6. **Spec revisions:** may I rewrite WT-001/WT-002 along the lines of §9 (and
   update BACKLOG.md status)?
7. **Investigation spec:** keep `e2e/investigations/` (and the `npm run
   investigate` script) in the repo, or treat it as throwaway?

---

*Nothing in this investigation was committed. Fixture records (Quillbrook,
Pellowby, Cridgeworth families; sources `X106`, `X110`, `X111`; note `X107`)
remain in the local fictional dev database only.*

---

## 12. Project Director decisions (2026-10-17)

| # | Question | Decision | Effect |
|---|---|---|---|
| 1 | Production database / SQLite bug | Production database not yet chosen; keep SQLite for development. Document the failure and prepare an upstream bug report, **but don't submit it** | Draft: [upstream-bug-sqlite-find-duplicates.md](upstream-bug-sqlite-find-duplicates.md) |
| 2 | Married-name matching | Don't rely only on data-entry conventions. Matching should eventually consider maiden, married and alternative names, approximate ages, places and known relationships. **For now, document existing search methods and their limitations; no new matching engine** | §13 below; recorded as a future enhancement in WT-001 and WT-002 |
| 3 | Lodgers, servants, other occupants | Keep **every** occupant in the full transcription, using the existing shared household note. They don't automatically become person records. Use **"unlinked"**, not "unrelated" | Principles 2–3 of WT-001; terminology fixed in this report |
| 4 | WT-001 scope | Rename to **Guided Census Evidence Workflow**. Start with a contextual Workflow Assistant help pop-up in the Census Assistant (7 stages). No automatic genealogical decisions. Inline creation, matching and row actions are future work. Keep evidence separate from interpretation | [WT-001 spec](../enhancements/WT-001-guided-census-evidence-workflow.md); module feasibility in §14 |
| 5 | Core modifications | Only when genuinely necessary and a module can't reasonably do it; must be isolated, documented, tested, with upstream-sync implications explained. **No core modifications at this stage** | Policy in `CLAUDE.md` / `BACKLOG.md`; WT-002 §B lists a core hook only as a fallback needing a proposal |
| 6 | Spec rewrites | Approved. WT-002 focuses on duplicate sources and duplicate citations or facts **on the same record**; no warning for the same source and page on different people. Keep the original objectives and explain the change | [WT-002 spec](../enhancements/WT-002-duplicate-aware-evidence-entry.md) |
| 7 | Investigation tests | Keep `e2e/investigations/` in the repo, separate from the regression suite, as a baseline | Documented in `e2e/README.md` |

Also directed: an investigate-before-implement policy in `BACKLOG.md` and
`CLAUDE.md`; keep this report; design the WT-001 pop-up so it can be reused
for birth, marriage, death and other workflows; check custom-module delivery
before implementation (§14). **These decisions authorise documentation
revisions only, not Milestone 3B implementation.**

---

## 13. Existing person-search methods and their limitations

No new matching engine is planned yet (decision 2). These are the tools
available today for finding whether a census occupant is already in the
tree:

| Method | How to use | Matches | Limitations (observed or from code) |
|---|---|---|---|
| **Individual picker** (`TomSelectIndividual`), in every person field and the Census Assistant | Type words; or an XREF | Every word must appear in **one** indexed name (`n_full`) of the person: birth, married or other `NAME` records all count | A married name recorded without a given name (`/Quillbrook/`, the default from the paternal surname tradition) can't be found by "Martha Quillbrook"; "Quillbrook" alone finds her. Results always show the *primary* name, so it isn't obvious why someone matched. No spelling tolerance. Results are sorted by name, not relevance |
| **General search** (Search → General search) | Free text across records | Words in the indexed GEDCOM | Not designed for people, so it's noisy. No age or place weighting |
| **Phonetic search** (Search → Phonetic search) | Surname / given name / place; Russell soundex or Daitch-Mokotoff | Spelling variants (`Pellowbie` → all Pellowby; `Cridgworth` → Cridgeworth; `Quilbrook` → Quillbrook, including Martha through her married name) | No age filter. Shows candidates only, with no ranking by evidence |
| **Advanced search** (Search → Advanced search) | Field-by-field: names, birth date (with ± years range), birthplace, etc. | Approximate age via birth-year range; places | Several manual steps. Exact-ish name match. Doesn't combine with phonetic matching |
| **Relationships chart / family pages** | Navigate from the head's family | Confirms known relationships (e.g. Martha's brother Richard) | Manual. Only finds people already connected |
| **Find duplicates** (admin) | Control panel | Identical full name **and** identical vital date | After the fact; exact only; **crashes on SQLite** (§8.1) |

**What isn't possible today:** a single search combining maiden, married and
alternative names with approximate age, place and known relationships. That
is the future matching capability noted in WT-001 (*Future enhancements*)
and WT-002 (*Out of scope*). It's to be designed once and shared.

---

## 14. Can the WT-001 Workflow Assistant pop-up be a custom module?

**Yes. Code analysis shows no core change is needed** (not yet
prototyped; a prototype is the first step of any implementation):

* **Hook point:** the Census Assistant UI comes from the core view
  `modules/census-assistant`, rendered by `CensusAssistantModule::createCensusAssistant()`
  from the census element's edit control (`app/Elements/Census.php`).
* **Override without copying:** a custom module's `boot()` can call
  `View::registerNamespace()` and
  `View::registerCustomView('::modules/census-assistant', '<module>::modules/census-assistant')`.
  The module's view can then render the original with
  `view('::modules/census-assistant', $data)`. A leading `::` marks an
  explicit name, which `View::getFilenameForView()` doesn't redirect, so
  there's no loop. The module then adds its button and pop-up next to it.
  Upstream changes to the Census Assistant still flow through.
* **UI:** Bootstrap's modal/offcanvas components are already loaded; no
  Content-Security-Policy header is sent, so a small module script or inline
  markup works.
* **Reuse for other evidence types:** birth, marriage and death forms have no
  assistant view to wrap. The likely route there is
  `ModuleGlobalInterface::bodyContent()` injecting a script that detects the
  relevant fact form (e.g. an input whose id ends in `-INDI-BIRT-DATE`) and
  adds the same button with different content. Workflow content should
  therefore be data (per-workflow view or config), separate from the
  button/pop-up component.
* **Dependencies and risks:** needs the core `GEDFact_assistant` module
  enabled; JS selectors depend on upstream markup (cover with e2e tests);
  `registerCustomView` is unused by core itself, so its behaviour is less
  battle-tested (a prototype will confirm).

