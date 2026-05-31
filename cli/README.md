# expo-docs-skills CLI

Interactive Ink-based TUI for browsing and toggling skills in this repo.

## Run

```sh
cd cli
bun install
bun start
```

## What it does

- Discovers every `skills/<category>/<name>/SKILL.md` in the parent repo and groups the list by category.
- Tracks two link targets per skill: Claude (`~/.claude/skills/<name>`) and Codex (`~/.codex/skills/<name>`).
- Shows per-target status with a glyph and color: `● linked` (green), `○ unlinked` (grey), `▲ conflict` (red). The header rolls up totals for each target.
- Stage toggles, then apply them in one pass. A staged target shows `→ link` or `→ unlink` (yellow) until you apply.
- The detail panel shows the selected skill's description, both target paths, and, for a conflict, the reason (for example, `links elsewhere: ...`).
- Safety: the CLI refuses to overwrite non-symlink files at the target. Resolve those manually.

## Keys

- `↑`/`↓` or `j`/`k`: move. `g`/`G`: jump to top/bottom.
- `c` (or `1`): toggle the Claude target. `x` (or `2`): toggle the Codex target. `space`: toggle both.
- `enter`: apply staged changes. `d` or `esc`: discard them. `r`: refresh. `q`: quit.

## Layout

```
cli/
├── package.json
├── tsconfig.json
└── src/
    ├── cli.tsx            # entry point
    ├── App.tsx            # Ink root component
    ├── components/
    │   ├── SkillList.tsx
    │   └── Detail.tsx
    └── lib/
        ├── discover.ts    # walks skills/, parses frontmatter, resolves link status
        ├── symlink.ts     # link/unlink primitives with safety checks
        ├── paths.ts       # SKILLS_ROOT, DEPRECATED_ROOT, and AGENT_TARGETS
        ├── theme.ts       # colors and glyphs
        └── types.ts
```
