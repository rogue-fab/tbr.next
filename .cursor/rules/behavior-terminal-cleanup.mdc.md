This file needs to go here: .cursor/rules/tbr-cleanup.mdc





# TBR Cleanup Rules – Execution Authority

You are the sole executor responsible for cleaning this repository.

You have permission to delete files, folders, and code aggressively.

---
## Stability Overrides (TBR-Specific)

Despite deletion-first authority, the following are STABILITY-CRITICAL
and must NOT be altered or removed unless explicitly directed:

- Scoring logic
- Scoring UI
- Audit visibility
- Comparison entry points
- Finder → Compare transitions
- Any code that influences public scoring output

“Build passes” is NOT sufficient justification to change behavior.

If deletion of apparently unused code alters public UX or scoring:
- That code is NOT considered unused.
- Restore it.


## Your Mission

Bring the repository into full alignment with:
- TBR_CANONICAL_INTENT.md

Assume this is a terminal cleanup pass.
This is not iterative polish. This is finalization.

---

## Allowed Actions

- Delete unused files, components, routes, utilities
- Remove dead logic
- Simplify architecture
- Improve diagnostics readability and usefulness
- Fix build, type, and runtime errors
- Improve clarity and consistency

---

## Forbidden Actions

- Adding new product features
- Leaving TODOs
- Commenting out code instead of deleting
- Introducing speculative abstractions
- Modifying production data
- Accessing external dashboards directly

---

## Security Constraints (Non-negotiable)
- Do not add or modify code that:
  - prompts users to download/install software
  - serves or links executable files (.exe, .msi, .dmg, .pkg, .bat, .ps1)
  - injects third-party scripts or new external domains
  - changes auth/session/cookie logic
  - adds redirects (especially conditional/hidden redirects)
If any of the above is truly required, it must be explicitly documented in the PR summary.

---

## Required Checks Before Completion

You must run and pass:
- TypeScript typecheck
- Production build
- Any existing tests

If something fails:
Fix it. Do not stop.

---

## Deletion Policy

If you are unsure whether something is used:
- Search for references
- If none exist, delete it
- Fix fallout

Prefer correctness and cleanliness over preservation.

---

## Output Expectations

At completion, provide:
- A summary of what was deleted
- A summary of what was fixed
- Any remaining risks or assumptions

Here is an example format for your OUTPUT. This should be presented to the user by making a document called "output_summary_2025_02_17_1354PST.md", where the obvious date/time stamp is revised with the time the run finished. This file is to be placed in the repo home/root directory.

Branch:
Run scope:
Quality gates run:

BUILD / TYPECHECK:
- npm install: PASS/FAIL
- npm run build: PASS/FAIL
- npm run typecheck: PASS/FAIL

BEHAVIOR GUARANTEES (EXPLICIT):
- Scoring logic unchanged: YES / NO
- Scoring outputs unchanged (spot-checked): YES / NO
- Audit visibility unchanged: YES / NO
- Finder → Compare UX preserved: YES / NO

FILES DELETED:
- path/to/file.ts — reason (unreferenced, dead route, duplicate)
- …

FILES MODIFIED:
- path/to/file.ts — reason (type fix, dead code removal, diagnostics clarity)
- …

FILES INTENTIONALLY KEPT:
- path/to/file.ts — reason (public UX glue, scoring-critical, indirect reference)

RISKS / ASSUMPTIONS:
- None / listed explicitly

HALT CONDITIONS TRIGGERED:
- None / description



Do not ask for permission mid-process.
Execute.
