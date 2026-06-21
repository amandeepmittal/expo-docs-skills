# Skill quality rubric

The review has two halves. The linter (`scripts/lint.ts`) computes the deterministic half and hands you JSON. You judge the rest by reading the `SKILL.md`. Be strict: the point is to catch a skill drifting toward bloat or vagueness, not to hand out tens.

## Deterministic checks (from the linter, do not recompute)

Fold every linter finding into the report verbatim, with its line number. The checks:

| Check | Severity | Means |
| --- | --- | --- |
| `frontmatter-required` | fail/warn | missing `name`, `description`, or top-level `version` |
| `frontmatter-style` | warn | uses the `license` + `metadata.version` shape; canonical is top-level `version` + `argument-hint`/`allowed-tools` |
| `frontmatter-recommend` | info | no `argument-hint` / `allowed-tools` |
| `name-kebab`, `name-dir` | fail | name not kebab-case, or does not match the directory |
| `description-length`, `description-trigger` | warn | description too thin/long, or missing a "Use when…" / "MUST USE" / slash-command trigger cue |
| `size` | warn | over 180 lines |
| `code-ratio` | warn | code is over 40% of the body |
| `house-style` | warn | em dash present (repo rule: never em dashes) |
| `broken-reference` | warn | a `references/` or `scripts/` path does not resolve |

## Judgment dimensions (you assess these)

Rate each PASS / WARN / FAIL with a one-line reason and a concrete suggestion. Anchor every claim to a line or quote.

1. **Description and triggers.** Does the description say both what the skill does and when to fire it? Could the model reliably choose this skill over neighbours? FAIL if vague or ambiguous, WARN if the triggers are thin.
2. **Directiveness.** Do sections tell the agent what to do (imperative), or do they describe concepts (expository)? A skill is a set of instructions, not an essay. WARN on descriptive drift, FAIL if it mostly explains rather than directs.
3. **Scope.** One clear job, or several bundled together? WARN if it sprawls. A skill that does two things wants to be two skills.
4. **Redundancy.** Does it spend lines re-teaching things the model already knows (what git is, how markdown works) instead of skill-specific judgment? WARN, and point at the lines to cut.
5. **Completeness.** For its kind, does it cover the parts that matter: when NOT to use, required inputs, the deliverable/output shape, and any safety constraint (for skills that edit files or post to GitHub)? WARN on a missing essential.

## Scoring

Start from the linter's `deterministicScore` (10 minus 2 per distinct failing check, 1 per distinct warning check, so five em dashes count once, not five times). Then lower it for judgment FAILs (heavy) and WARNs (light). Map to a verdict:

- **Solid (8-10):** ship as is, suggestions optional.
- **Needs work (5-7):** real issues, fix before relying on it.
- **Rework (0-4):** structural or clarity problems; rewrite the flagged sections.

## Report template

Per skill:

```
## <name> — <category> — <verdict> (<n>/10)

`<lines>` lines · code <pct>% · description <chars> chars

| Dimension | Status | Note |
| --- | --- | --- |
| Frontmatter | ✅/⚠️/❌ | ... |
| Naming | ✅ | ... |
| Size & code ratio | ✅ | ... |
| House style | ⚠️ | em dash on L42 |
| References | ✅ | ... |
| Description & triggers | ⚠️ | ... |
| Directiveness | ✅ | ... |
| Scope | ✅ | ... |
| Redundancy | ✅ | ... |
| Completeness | ⚠️ | no "when not to use" |

**Strengths**
- ...

**Issues**
- L42 — em dash (house-style)
- ...

**Suggestions**
- ...
```

In `all` / `--changed` mode, lead with one ranked summary table (skill, verdict, score, fail/warn counts) sorted worst-first, then a full section only for skills below Solid. Skills that score 8+ need only their summary row. Never edit a skill; this review is advisory.
