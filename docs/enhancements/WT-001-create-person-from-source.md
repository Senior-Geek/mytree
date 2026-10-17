# WT-001 — Create Person from Source Record

**Priority:** High
**Status:** Proposed
**Category:** Workflow Enhancement

## Problem

When entering a source record, such as a census, birth
certificate, or marriage certificate, a person mentioned
in that source may not yet exist in MyTree.

Currently, this interrupts the evidence-entry workflow.

## Required Behavior

1. Allow searching for an existing person from within
   the source record.
2. If the person does not exist, provide a
   "Create New Person" option.
3. Open a compact person-entry form, preferably
   prepopulated with information from the source.
4. Save the new person and automatically associate
   them with the current source.
5. Return to the source-entry workflow without
   losing unsaved information.

## Example — 1851 Census

A household contains a husband, wife, four children,
and a lodger.

Three people already exist in MyTree.

The remaining four should be created directly from
the census record without leaving the source workflow.

## Acceptance Criteria

- Existing people can be selected without duplication.
- New people can be created without navigating away.
- New people are immediately available for linking.
- Source associations are retained correctly.
- Cancelling does not lose existing work.

## Implementation Notes

To be determined after Claude Code examines the
existing webtrees architecture.
