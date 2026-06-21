---
name: skill-quality
version: 1.0.0
description: Review a SKILL.md in this repo against the skill-quality rubric (frontmatter, naming, size, code ratio, house style, references, plus clarity, directiveness, scope) and print an advisory report. Never edits skills. Use when the user says "skill quality", "review this skill", "lint this skill", "is this skill any good", or "/skill-quality". Takes a skill name, path, "all", or "--changed".
argument-hint: "[skill-name|path|all|--changed]"
allowed-tools: Read, Grep, Glob, Bash(bun:*)
---

# skill-quality

Review one or more skills in this repo for quality and print an advisory report. The linter at `scripts/lint.ts` does the objective half (frontmatter shape, naming, size, code ratio, em dashes, broken references); you do the judgment half (clarity, directiveness, scope, redundancy, completeness). This skill reports, it never edits a skill.

## When NOT to use

- Editing or rewriting a skill: this is review only. Hand the report to the author.
- Auditing Expo docs or PRs: that is `docs-review` and the other review-category skills. This audits the skills in this repo.
- Running evals or behavior tests: out of scope here (report only, no execution of the skill).

## Inputs

`$ARGUMENTS` selects the target:

- a skill name (`docs-pr`), a skill directory, or a path to a `SKILL.md` → that one skill
- `all` → every skill (skips `deprecated/` and `node_modules/`)
- `--changed` → only skills with uncommitted changes
- empty → default to `--changed`; if nothing changed, ask what to review

## Workflow

1. **Run the linter** on the target and read its JSON:

   ```sh
   bun <skill-dir>/scripts/lint.ts $ARGUMENTS
   ```

   Each entry has `metrics`, `findings` (with `severity`, `check`, `line`), and a `deterministicScore`. Treat these as fixed inputs, do not recompute them.

2. **Read each target `SKILL.md` in full.** You cannot judge clarity or scope from metrics alone.

3. **Apply the rubric** in `references/rubric.md`: fold in every linter finding with its line number, then rate the five judgment dimensions PASS / WARN / FAIL, each with a one-line reason anchored to a line or quote, and a concrete suggestion. Be strict, the point is to catch regressions.

4. **Write the report** using the template in `references/rubric.md`. For a single skill, print its full section. For `all` / `--changed`, lead with one ranked summary table sorted worst-first, then a full section only for skills below Solid (8/10).

5. **Stop at the report.** Do not edit any skill. If the user wants fixes, they ask separately.
