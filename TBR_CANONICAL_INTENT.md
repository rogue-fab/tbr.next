# TubeBenderReviews (TBR) – Canonical Intent (Authoritative)

This document is the single, binding source of truth for what
TubeBenderReviews (TBR) **is**, **does**, and **must not contain**.

Any code, file, route, feature, or behavior not aligned with this document
is invalid and must be removed.

This document overrides all prior discussions, comments, TODOs, and implied intent.

Document Authority:

In the event of conflict, this document overrides:

repository README files

agent behavior guides

CI or execution scripts

historical discussions or comments

This document is authoritative.

---

## 1. Purpose

TubeBenderReviews (TBR) is a **production-grade, public-facing product
comparison and review system** for tube bending equipment.

It exists to:
- Publish technically accurate, reproducible product evaluations
- Provide deterministic, explainable scoring
- Be SEO-effective without being deceptive
- Be legally defensible under FTC advertising and disclosure standards
- Remain maintainable long-term without institutional or tribal knowledge

TBR must function as a **quiet, boring, reliable system** in production.

---

## 2. Core Principles (Non-Negotiable)

- Determinism over dynamism
- Clarity over cleverness
- Deletion over refactoring
- Explicit behavior over inferred behavior
- Reproducibility over convenience
- Transparency over persuasion

If a choice exists between:
- “Impressive” and “auditable” → choose **auditable**
- “Flexible” and “understandable” → choose **understandable**

---

## 3. What TBR IS

TBR **IS**:

- A public product listing and comparison site
- A deterministic scoring system with documented inputs
- A transparent explanation engine for how scores are derived
- A long-lived reference site, not a campaign or landing page
- A system that assumes hostile reading by:
  - Lawyers
  - Competitors
  - Engineers
  - Regulators
  - Skeptical consumers

Every score must be:
- Traceable to public claims or documented evidence
- Recomputable by a third party using the same inputs
- Explainable without developer intervention

---

## 4. What TBR IS NOT

TBR **IS NOT**:

- A playground
- A demo app
- A framework experiment
- A feature incubator
- A half-finished admin product
- A staging area for “later”
- A dumping ground for abandoned ideas

If something is:
- Unused
- Unreachable
- Incomplete
- Experimental
- Placeholder
- Speculative

**It must not exist in the final codebase. Delete it.**

---

## 5. Required Functional Areas (Must Exist)

The following capabilities are mandatory:

### Public Functionality
- Product listings
- Product detail pages
- Side-by-side comparisons
- Stable URLs and canonical routing

### Scoring
- Deterministic scoring logic
- Explicit, documented inputs
- No hidden multipliers or heuristics
- No silent fallbacks

### Diagnostics (Read-Only)
- Clear system health indicators
- Scoring band visibility
- Outlier detection
- Data sanity checks

### SEO & Infrastructure
- Titles and meta descriptions
- Canonical URLs
- Sitemap and robots configuration
- Predictable error handling (no silent failures)

---

## 6. Diagnostics (Explicitly Allowed Scope)

Diagnostics are **intentionally allowed scope creep**, with constraints.

Diagnostics MAY:
- Explain system state
- Surface configuration issues
- Highlight data anomalies or outliers
- Be human-readable
- Be visible in production

Diagnostics MUST:
- Be read-only
- Be safe for public exposure
- Use the same effective data as the public site
- Never modify data
- Never depend on admin authentication
- Never be required for normal site operation

Diagnostics MUST NOT:
- Expose credentials
- Expose secrets
- Leak PII
- Depend on alternate or shadow data sources

---

## 7. Data Integrity Rules

- There must be **one effective product data source** at runtime
- All scoring, diagnostics, and public views must derive from that source
- Static or duplicate catalogs are forbidden
- Shadow data is forbidden
- Cached data must be explicit and intentional

If two parts of the system disagree:
**That is a bug, not a feature.**

---

## 8. Hard Cleanup Rules (Absolute)

The final codebase must contain:

- No unused files
- No unused exports
- No dead routes
- No orphaned components
- No TODOs
- No commented-out code
- No placeholder logic
- No “future” features

If a file is not imported or executed in a live runtime path:
**Delete it.**

---

## 9. Technical Quality Bar

The system must:

- Build without warnings
- Typecheck without errors
- Run without runtime exceptions
- Be understandable by a senior engineer with no prior context
- Read as one coherent system, not an accretion of patches

Any complexity must justify its existence.

---

## 10. Change Constraints (Freeze Rules)

From this point forward:

- No new features beyond diagnostics improvements
- No redesign of scoring logic unless correctness is broken
- No new dependencies unless strictly required and justified
- Prefer removal over modification
- Prefer explicit logic over abstraction

---

## 11. Definition of Done

TBR is considered **DONE** when:

- The codebase is minimal and intentional
- Diagnostics are accurate, readable, and boring
- All data paths are unified and auditable
- No recurring “one more fix” loop exists
- A new engineer can maintain the system without history

If the system requires explanation outside the code and diagnostics:
**It is not done.**

---

This document is binding.
Anything that conflicts with it must be corrected or removed.
