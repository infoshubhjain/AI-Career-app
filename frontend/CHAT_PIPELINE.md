# Frontend Agent Chat Pipeline

The chat page is now a frontend shell for the backend multi-agent runtime, not a generic streaming chatbot.

Core files:

- `/Users/talibmirza/Desktop/Projectia/AI-Career-app/frontend/app/chat/page.tsx`
- `/Users/talibmirza/Desktop/Projectia/AI-Career-app/frontend/app/lib/agent-api.ts`
- `/Users/talibmirza/Desktop/Projectia/AI-Career-app/frontend/types/index.ts`

What it does:

- creates an agent session from the user goal
- sends subsequent turns to the backend session endpoint
- renders backend-owned state directly
- shows the current domain, current skill, and current topic
- treats the assistant message as the only active prompt shown to the user
- runs sequential onboarding questions before knowledge calibration
- supports anchor-and-backfill knowledge calibration instead of repeating the same probe
- stores local transcript/session snapshots for convenience
- emits focused console logs for key state transitions

Areas to improve:

- add transcript/event replay endpoint instead of relying on `sessionStorage`
- add SSE/websocket streaming for intermediate orchestration states
- create specialized UI for quizzes and code answers once the backend interaction model stabilizes
- expose memory summaries and review plans in the UI
- move session state into a dedicated store for longer sessions
