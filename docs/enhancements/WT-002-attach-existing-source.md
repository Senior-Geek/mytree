# WT-002 — Attach Existing Source to Person

**Priority:** High
**Status:** Proposed
**Category:** Workflow Enhancement

## Problem

When editing a person record, MyTree currently allows
creation of a new source record but does not provide
a convenient way to attach an existing source.

This encourages duplicate source records.

## Required Behavior

1. Add "Attach Existing Source" alongside
   "Create New Source".
2. Provide a searchable list of existing sources.
3. Support searching by title, date, reference number,
   and available metadata.
4. Attach the selected source without duplicating it.
5. Check for possible duplicates when creating sources.
6. Offer "Use Existing Source" or "Create New Anyway".
7. Preserve unsaved person-record changes.

## Duplicate Detection

Use two complementary checks:

### Exact Matching

Detect matching reference numbers or unique identifiers.

### Fuzzy Matching

Compare similar titles, dates, locations, and
other relevant metadata.

Example:

- 1851 Census — John Marriott Household
- John Marriott, Census 1851

These may refer to the same record and should trigger
a duplicate warning.

Duplicate detection must distinguish between a
general source and a specific citation or census entry.

Warnings should never automatically merge records.

## Acceptance Criteria

- Existing sources can be searched and attached.
- A source can be associated with multiple people.
- Possible duplicates are identified before saving.
- Fuzzy matches produce warnings, not automatic merges.
- Users can override warnings for distinct records.
- Existing unsaved changes are preserved.

## Implementation Notes

Claude Code should first examine how webtrees represents
sources, citations, and individuals.

Implementation should reuse common search, selection,
creation, and validation components where practical.
