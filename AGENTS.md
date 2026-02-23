## Skills
A skill is a set of local instructions stored in a `SKILL.md` file.

## Installation (Portable)
Install skills locally with:

```bash
npx antigravity-awesome-skills
```

After install, skills are expected under:

- `$CODEX_HOME/skills/<skill-name>/SKILL.md`

If your installer uses a different location (for example `~/.agent/skills`), either:

1. mirror/symlink them into `$CODEX_HOME/skills`, or
2. update this file to your team’s shared path convention.

## How to Use Skills
- Trigger a skill if the user names it or the task clearly matches it.
- If multiple skills apply, use the minimal set that covers the request.
- Open each selected `SKILL.md` and follow its instructions.
- If a skill path is missing, state it briefly and continue with best fallback.

## Available Skills

### Core Workflow
- `concise-planning`: Always start with a plan. (file: `$CODEX_HOME/skills/concise-planning/SKILL.md`)
- `lint-and-validate`: Keep code clean automatically. (file: `$CODEX_HOME/skills/lint-and-validate/SKILL.md`)
- `git-pushing`: Save work safely. (file: `$CODEX_HOME/skills/git-pushing/SKILL.md`)
- `kaizen`: Continuous improvement mindset. (file: `$CODEX_HOME/skills/kaizen/SKILL.md`)
- `systematic-debugging`: Debug like a pro. (file: `$CODEX_HOME/skills/systematic-debugging/SKILL.md`)

### The "Web Wizard" Pack
- `frontend-design`: UI guidelines and aesthetics. (file: `$CODEX_HOME/skills/frontend-design/SKILL.md`)
- `react-best-practices`: React & Next.js performance optimization. (file: `$CODEX_HOME/skills/react-best-practices/SKILL.md`)
- `react-patterns`: Modern React patterns and principles. (file: `$CODEX_HOME/skills/react-patterns/SKILL.md`)
- `nextjs-best-practices`: Next.js App Router patterns. (file: `$CODEX_HOME/skills/nextjs-best-practices/SKILL.md`)
- `tailwind-patterns`: Tailwind CSS styling patterns. (file: `$CODEX_HOME/skills/tailwind-patterns/SKILL.md`)
- `form-cro`: Optimize forms for conversion. (file: `$CODEX_HOME/skills/form-cro/SKILL.md`)
- `seo-audit`: SEO auditing patterns. (file: `$CODEX_HOME/skills/seo-audit/SKILL.md`)

### The "Web Designer" Pack
- `ui-ux-pro-max`: Premium design systems and tokens. (file: `$CODEX_HOME/skills/ui-ux-pro-max/SKILL.md`)
- `frontend-design`: Base design aesthetics. (file: `$CODEX_HOME/skills/frontend-design/SKILL.md`)
- `3d-web-experience`: Three.js / React Three Fiber patterns. (file: `$CODEX_HOME/skills/3d-web-experience/SKILL.md`)
- `canvas-design`: Static visuals and poster design. (file: `$CODEX_HOME/skills/canvas-design/SKILL.md`)
- `mobile-design`: Mobile-first design principles. (file: `$CODEX_HOME/skills/mobile-design/SKILL.md`)
- `scroll-experience`: Scroll-driven immersive UX. (file: `$CODEX_HOME/skills/scroll-experience/SKILL.md`)

### The "Full-Stack Developer" Pack
- `senior-fullstack`: Fullstack development guide. (file: `$CODEX_HOME/skills/senior-fullstack/SKILL.md`)
- `frontend-developer`: React/Next expertise. (file: `$CODEX_HOME/skills/frontend-developer/SKILL.md`)
- `backend-dev-guidelines`: Node/Express/TS backend patterns. (file: `$CODEX_HOME/skills/backend-dev-guidelines/SKILL.md`)
- `api-patterns`: REST vs GraphQL vs tRPC selection. (file: `$CODEX_HOME/skills/api-patterns/SKILL.md`)
- `database-design`: Schema and ORM design. (file: `$CODEX_HOME/skills/database-design/SKILL.md`)
- `stripe-integration`: Payments/subscriptions patterns. (file: `$CODEX_HOME/skills/stripe-integration/SKILL.md`)

### AI & Agents
#### The "Agent Architect" Pack
- `agent-evaluation`: Agent testing/benchmarking. (file: `$CODEX_HOME/skills/agent-evaluation/SKILL.md`)
- `langgraph`: Stateful agent workflows. (file: `$CODEX_HOME/skills/langgraph/SKILL.md`)
- `mcp-builder`: Build MCP tools. (file: `$CODEX_HOME/skills/mcp-builder/SKILL.md`)
- `prompt-engineering`: Prompt design patterns. (file: `$CODEX_HOME/skills/prompt-engineering/SKILL.md`)
- `ai-agents-architect`: Autonomous agent system design. (file: `$CODEX_HOME/skills/ai-agents-architect/SKILL.md`)
- `rag-engineer`: RAG systems with vector search. (file: `$CODEX_HOME/skills/rag-engineer/SKILL.md`)

#### The "LLM Application Developer" Pack
- `llm-app-patterns`: Production LLM patterns. (file: `$CODEX_HOME/skills/llm-app-patterns/SKILL.md`)
- `rag-implementation`: Retrieval-augmented generation. (file: `$CODEX_HOME/skills/rag-implementation/SKILL.md`)
- `prompt-caching`: LLM caching strategies. (file: `$CODEX_HOME/skills/prompt-caching/SKILL.md`)
- `context-window-management`: Context optimization patterns. (file: `$CODEX_HOME/skills/context-window-management/SKILL.md`)
- `langfuse`: LLM observability/tracing. (file: `$CODEX_HOME/skills/langfuse/SKILL.md`)
