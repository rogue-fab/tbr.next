# 🚦 TBR / RogueFab AI Guardrails (v3 – Canonical)

## Purpose
Keep TubeBenderReviews (TBR) stable, auditable, FTC-safe, and human-reproducible while using AI tools (ChatGPT + Cursor) as force multipliers — not wrecking balls.

Priorities:
- Minimal, controlled diffs
- Explicit intent
- Human-reproducible scoring logic
- Zero silent assumptions

---

## Roles
- **ChatGPT** = planner/architect (design + instruction), not the applier.
- **Cursor** = scalpel editor (apply the diff), not repo surgeon.

### ChatGPT is responsible for
- Understanding intent and constraints
- Designing the smallest viable change
- Identifying the exact files to touch
- Producing Cursor-ready instructions + diff
- Calling out risks, edge cases, and manual verification steps (for the human)

### ChatGPT must NOT
- Perform repo-wide refactors
- “Clean up” code unless explicitly asked
- Guess missing requirements
- Add “helpful” fallbacks or defaults that change meaning

### Cursor must
- Apply exactly the provided diff
- Touch only the files listed
- Make no additional “improvements”

### Cursor must NOT
- Reformat/lint outside the diff
- Update dependencies, lockfiles, configs, or env files unless explicitly instructed
- Add fallback logic or “helpful defaults”

---

## Canonical Cursor Prompt Format (MANDATORY)
All Cursor prompts must follow this exact structure:

1) Plain-text instructions (no code fences)
2) A single line that says exactly:
**Produce a clean unified diff.**
3) Exactly one fenced code block containing a unified diff:
```diff
diff --git a/file.ts b/file.ts
...
Hard rules:

Only one fenced block

The fenced block must be diff

No mid-sentence code fences

No markdown formatting inside the diff

No shell commands inside the diff block

File Touch Limits
Maximum: 5 files per Cursor run

Prefer 1–3 files when possible

If more are needed: STOP and ask before proceeding

If a full file is required: request the entire file; do not infer missing sections

Absolute No-Touch Zones (unless explicitly requested)
package.json

lockfiles (pnpm-lock.yaml, package-lock.json, etc.)

next.config.*

tsconfig.*

Tailwind config

ESLint / Prettier configs

environment variables

database schemas or migrations

Vercel/Fly deployment config

Scoring & FTC Safety (CRITICAL)
Any change that affects scoring, ranking, comparison, or category definitions must satisfy ALL:

1) Human-Reproducible
A reasonable human must be able to:

Read /scoring

Read a product’s inputs

Manually reproduce the score

If they can’t → the change is invalid.

2) No Inference
Missing/undocumented data must score 0

No “assumed,” “typical,” or “likely”

No brand-based heuristics unless explicitly disclosed on /scoring

3) No Silent Fallbacks
Fallback behavior must be either:

Explicitly documented on /scoring, OR

Removed entirely

“No placeholder shipping” rule:

“If you see this message…” placeholders must NOT ship.

4) Alignment Requirement
Any scoring-related change must be aligned across all four:

Scoring engine behavior

Admin input fields

/scoring documentation

Review page “Score math (diagnostic)”

If any of the four disagree → stop and fix alignment before continuing.

Admin UI Rules
Admin fields should map 1:1 to scoring inputs

Avoid duplicated fields that represent the same evidence

If a field is removed from scoring, it must be removed from admin UI

Add validation to prevent impossible/misleading values where practical

Outside-the-Diff Requirements (ChatGPT → Human only)
In the chat (outside the diff), ChatGPT should provide:

Goal (one sentence)

Manual verification steps (plain English; commands allowed here if needed)

Risks / side-effects

Rollback plan (what to revert)

Cursor prompts should NOT include testing/verification commands inside the diff block.

Style & Quality
Preserve Tailwind classes, safelists, and configs

Respect Next.js routes/layout conventions

No repo-wide reformatting

Add concise JSDoc for new exports where helpful

Flag perf/size issues if a change adds heavy deps or large payloads

Philosophy
Smaller changes beat clever changes

Explicit beats elegant

FTC-safe beats “pretty”

Zero-point penalties are acceptable

99-point totals are acceptable

Ambiguity is not acceptable

When to Stop
Stop and propose a new chat + transfer prompt if:

Scope is expanding uncontrollably

Diff is growing beyond what can be audited

Context is degrading (“context bogging”)