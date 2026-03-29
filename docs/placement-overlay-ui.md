# Placement Overlay UI Flow

This doc explains when the placement test overlay appears, disappears, and how it reappears. It is intentionally non-technical and focuses on user-visible behavior and the key logic that drives it.

## What The Overlay Is
- The placement overlay is the modal quiz popup that appears during the placement test (and other quizzes).
- It presents a single multiple‑choice question and blocks the main chat until answered or dismissed.

## When It Appears
The overlay opens whenever the session includes a pending quiz question:
- After the user selects **“Take placement test”**
- After each answer, if another placement question is generated
- Any time the server responds with a new `pending_questions[0]`

## When It Disappears
The overlay closes in two situations:
1. **User closes it manually** using the X button (state is preserved).
2. **Placement completes** and the backend returns no more questions (the focus overlay takes over).

## When It Reappears
The overlay will reopen automatically if:
- A new pending question arrives from the server
- The user previously closed it, but the session still requires a quiz answer

There is also a small “Quiz waiting” banner below the input that lets the user reopen it at any time.

## Focus Confirm Overlay
When placement completes, the backend returns a **focus-confirm** state:
- The placement overlay closes.
- The “Your next learning focus” overlay appears.
- The user must click **Get started** to begin the lecture.
- Only after that click does the conversation agent start streaming the lesson.

## Key UI Logic (High Level)
- **`pendingQuestion`**: the first item in `session.pending_questions`.
  - If it exists, the overlay should be shown.
- **`displayedQuestion`**: the question currently shown in the overlay.
  - If a new question arrives, it can be queued until the user clicks “Next question.”
- **`quizDrafts`**: stores the selected answer per question id so closing the overlay does not lose state.
- **`dismissedQuizKey`**: remembers if the user manually closed the overlay.
  - If the current pending question changes, this dismissal is reset.
- **`isQuizOverlayOpen`**: true when there is a pending question and it hasn’t been dismissed.

## Placement Test‑Specific Flow
- Placement uses the same overlay as other quizzes, but is driven by placement logic on the backend.
- The user selects an option, then clicks **Submit**.
- While the answer is sent, the overlay stays open with a loading state.
- After each answer, the backend either:
  - Sends another placement question (the button changes to “Next question”), or
  - Ends placement and returns a focus-confirm state (overlay closes and the focus overlay appears).

## UX Summary
- The overlay appears automatically when a placement question exists.
- The user selects an answer, then submits.
- The overlay stays open during submission.
- If more placement questions are required, the user clicks **Next question** to advance.
- If placement is complete, the overlay closes and the focus overlay appears.

## Relevant Frontend Touchpoints
- `frontend/app/chat/page.tsx`
  - `pendingQuestion`, `displayedQuestion`, `quizDrafts`, `dismissedQuizKey`, `isQuizOverlayOpen`
  - `handleQuizSubmit`, `handleNextQuestion`
  - `QuizOverlay` component render
- `frontend/app/chat/components/QuizOverlay.tsx`
  - UI for the modal itself
