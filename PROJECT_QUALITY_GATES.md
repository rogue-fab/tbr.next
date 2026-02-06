# Project Quality Gates – Canonical

This document defines the **objective, verifiable completion criteria**
for cleanup, finalization, and acceptance of a software project.

It does NOT define intent, architecture, or agent behavior.
It ONLY defines how success is measured.

Failure to meet any required gate means the project is **not complete**.

---

# PART A — General Project Quality Gates (Reusable)

These gates apply to **any production-grade software project**
unless explicitly overridden in a project-specific section.

## A1. Dependency Installation

```bash
npm install
Must complete without:

install failures

unresolved peer dependency errors

interactive prompts

A2. Type Safety
npm run typecheck
Must complete with:

zero TypeScript errors

no suppressed, ignored, or commented-out failures

A3. Linting
npm run lint
Must complete with:

zero lint errors

warnings allowed only if:

they pre-existed, and

they are explicitly unavoidable

New warnings introduced by the agent are not allowed.

A4. Production Build
npm run build
Must complete with:

no build errors

no runtime exceptions during build

no missing environment variables for dev or preview operation

Production secrets must NOT be required to build.

A5. Tests (If Present)
If automated tests exist:

npm test
All existing tests must pass

Tests must not be deleted or skipped to achieve a pass

New tests are NOT required unless needed to fix correctness

A6. Codebase Hygiene (Mandatory)
The final repository must contain:

no unused files

no unused exports

no dead routes

no orphaned components

no commented-out code

no TODOs or placeholder logic

no abandoned experiments

If a file is not imported or executed in a live runtime path:
it must be deleted.

A7. Coding Quality Standards
Code must be:

correct before clever

boring before impressive

explicit before implicit

When multiple approaches exist, decisions must be weighted in this order:

Stability

Runtime safety

Ease of future human or automated understanding

Operational performance

Speed of implementation

Projects should be clean enough to serve as a reference or template
for similar future work.

PART B — Project-Specific Quality Gates (TubeBenderReviews)
These gates are additive to Part A and apply specifically to TBR.

B1. Preview Deployment (If Configured)
If preview deployments (e.g., Vercel) are available:

Preview build must succeed

Preview runtime logs must show:

no uncaught exceptions

no repeated error loops

Agents may inspect logs via CLI or dashboard.
Agents must NOT deploy to production.

B2. Diagnostics Rules (TBR-Specific)

Public Behavior Preservation Gate (Mandatory)

Cleanup passes MUST preserve:
- Access to comparison functionality from public pages
- Visibility of scoring audits
- Equivalent number and content of audit lines for identical products

Any cleanup that changes public behavior is a failure,
even if builds and typechecks pass.

Diagnostics must reflect current effective runtime data, not cached, snapshotted, or seed data unless explicitly labeled as such.

Diagnostics may be improved or expanded only if they are:

read-only

safe for public exposure

free of secrets, tokens, or credentials

independent of admin authentication

non-essential to normal site operation

Diagnostics must NOT:

modify data

depend on admin state

require production-only configuration

diverge from the public site’s effective data source

B3. End-to-End (E2E) UI Gates — Playwright (If Present)
If Playwright tests exist, all must pass.

Browser Matrix
Chromium (Chrome / Edge class)

Firefox

WebKit (Safari engine)

Viewport Matrix
360 × 640 (small mobile)

390 × 844 (modern mobile)

430 × 932 (large mobile)

768 × 1024 (tablet portrait)

1024 × 768 (tablet landscape)

1280 × 800 (small desktop)

1440 × 900 (standard desktop)

Public-Site Smoke Tests (Required)
At minimum:

Homepage loads without errors

Product listing pages render

Product detail pages render

Comparison pages render (if applicable)

No uncaught console errors

No hydration or runtime exceptions

Admin → Public Data Flow Tests (Required)
Using test-only credentials and non-production data:

Admin login succeeds

Admin edits persist after save

Admin changes are reflected on public pages

No API or console errors during admin actions

No full-page reload failures or state corruption

Tests must NOT:

touch production data

use production credentials

rely on pre-existing manual state

B4. Definition of Done (Binding)
The TBR project is considered complete only when:

All applicable gates in Part A and Part B pass

The repository builds cleanly

No dead or speculative code remains

Diagnostics are accurate, readable, and safe

No recurring “one more bug” loop exists

If any gate fails, work must continue until it passes.

B5. Mandatory Halt Conditions:

The agent must halt and report if:

Runtime behavior contradicts Canonical Intent

Multiple data sources influence scoring or diagnostics

Correctness cannot be achieved without guessing intent

A cleanup run is incomplete without the required Cursor Handoff Summary in the PR/terminal output.

This document is authoritative for completion.