# expo-docs-skills CLI

Interactive Ink-based TUI for browsing and toggling skills in this repo.

## Run

```sh
cd cli
bun install
bun start
```

## What it does

- Discovers every `skills/<category>/<name>/SKILL.md` in the parent repo.
- For each skill, shows its status: `✓ linked`, `◯ unlinked`, or `⚠ conflict`.
- Use `↑` / `↓` to navigate, `space` to queue a link or unlink, `enter` to apply, `q` to quit.
- Symlinks live in `~/.claude/skills/<name>` and point at the source skill directory.
- Safety: the CLI refuses to overwrite non-symlink files at the target. Resolve those manually.

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
    │   ├── SkillDetails.tsx
    │   └── StatusBar.tsx
    └── lib/
        ├── discover.ts    # walks skills/, parses frontmatter
        ├── symlink.ts     # link/unlink primitives with safety checks
        ├── paths.ts       # SKILLS_ROOT and GLOBAL_DIR constants
        └── types.ts
```
