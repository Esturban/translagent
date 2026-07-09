# AGENTS.md

Work style: telegraph; noun-phrases ok; drop grammar; min tokens.

## Core
- `CLAUDE.md` + `GEMINI.md` point here. This file is primary; read it first.
- Local repo instructions win.
- `@.wolf/OPENWOLF.md` optional; local-only if present.
- Skills = workflows. This file = hard rules only.
- Token efficiency: query a local code-graph/memory layer (CodeGraph, codebase-memory-mcp, or `.wolf`) before grep/read-heavy exploration; offload broad exploration to subagents; keep decision-bearing edits single-threaded.

## Defaults
- Simplicity first. No speculative features.
- Surgical changes. Touch only what the task needs.
- Bugs: add regression test when it fits.
- Verify before ship/PR: run the adapter `## Verify` command if present; green required, red blocks.
- Failure => feature: when the agent repeats a mistake, add a tool / validator / lint or ast-grep rule / hook — not a prompt tweak.
- Loops: set an explicit stop condition + iteration/cost cap; on limit, halt and report — don't spin.
- Use repo package manager/runtime. No swaps without approval.
- Read repo docs before coding. Update docs/changelog for user-visible changes.
- Secrets: env vars only if already exported. Never hardcode.

## Done-gate (no "done" on intent — only on evidence)
- Not done until acceptance criteria met AND shown. Saying done without proof = not done.
- Acceptance source: `.acceptance` (one check per line) if present, else the task / PRD / spec criteria.
- Survives context loss: re-read the acceptance source after `/clear` or a crash. Never trust remembered progress — verify against the file.
- Each check must pass: command exits 0, or criterion demonstrably true. One unmet => not done; report which + why, then halt.
- Don't move the goalposts to pass. Unmeetable / wrong criterion => surface to the user; never silently drop it.

## Commit hygiene (nothing goes in that doesn't need to be there)
- Never commit secrets/credentials: API keys, `.env` (non-example), private keys, tokens. Scan before staging.
- Never commit PII or scraped personal-data dumps: contact-list exports, raw email/CSV exports, address/phone data. Redact an incidental PII string inside real code (e.g. a test fixture) rather than deleting the whole file; untrack + gitignore dedicated data-dump files instead.
- Never commit AI-IDE scaffolding as if it were project work: `.cursor/`, `.cursorrules`, `.cursorignore`, `.clinerules`, `.windsurfrules`, `.roo*`, `memory-bank/`, `.github/copilot-instructions.md`, `*.code-workspace`. Untrack + gitignore if found; leave the files on disk.
- `.wolf/` (OpenWolf) state is legitimate operational memory, not scaffolding -- never touch it under this rule.
- Public repos: never commit `AGENTS.md` itself -- gitignore it instead. Private repos: commit it normally.

## CI/CD (dev -> trunk auto-PR)
- Every repo with real remote work gets `.github/workflows/dev-to-trunk.yml` (source: `templates/ci-cd/dev-to-trunk-auto-pr.yml`): push to `dev` auto-opens/refreshes a PR into the repo's default branch (`main`/`master`, auto-detected), owner requested as reviewer.
- PRs are opened ONLY by this Action -- never `gh pr create` run by a human or an agent.
- New repos: wire this Action in during harness mint. Existing repos: retrofit it alongside the AGENTS.md organ injector.

## Git flow (traceable; next agent picks it up cold)
- Branch off the default branch: `feat|fix|chore/<slug>`. Never commit straight to main.
- Atomic, phased commits — one logical change each; Conventional Commits.
- Verify green (adapter `## Verify`) before each commit; red = don't commit.
- Push / open PR only when the user asks. No amend / rebase / force / destructive ops unless asked.
- Never include AI attribution or `Co-Authored-By`.
- Traceable by default: commit message says *why*; leave the tree clean at each checkpoint.
- Handoff: end a session with a one-line status (done / next) so the next agent resumes without re-deriving context.

## Routing
- Complex feature / unclear scope => `planner`
- Architecture => `architect`
- Feature / bug fix => `tdd-guide`
- Code changed => `code-reviewer`
- Pre-merge / anti-pattern audit => `anti-patterns-auditor`
- Security-sensitive => `security-reviewer`
- Build/type errors => `build-error-resolver`
- Docs-only => `doc-updater`

## Models
- simple => `claude-haiku-4-5`
- default => `claude-sonnet-4-6`
- complex => `claude-opus-4-8`

## Skills
- Planning => `/autoplan`
- Review => `/review`
- Investigate => `/investigate`
- Ship/deploy/PR => `/ship`

## Stack
- Stack-agnostic. Detect repo package manager, test runner, and lint from existing files; match them.

## Verify
- Gate (run before ship/PR): detect the repo's lint + typecheck + test commands (from manifests/CI) and run them; green required.
- Wire that command into pre-commit + CI — that is the deterministic gate, not the model.

## Model routing
Route by task type (policy: rules/_meta.yaml). Pick the cheapest tier that fits.
- default -> sonnet
- security -> opus
- review -> sonnet
- test -> sonnet
- deploy -> sonnet
- architecture -> opus
- refactor -> haiku
- hooks -> haiku
- laravel -> sonnet
- nextjs -> sonnet
- python -> sonnet
- web -> sonnet
- performance -> sonnet
