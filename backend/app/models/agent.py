"""Pydantic models for the multi-agent coaching runtime."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from app.models.roadmap import RoadmapResponse


class AgentAnswerOption(BaseModel):
    id: str
    label: str


class QuizOutcomeFeedback(BaseModel):
    """Shown only in the quiz overlay (lesson quizzes); not duplicated in chat."""

    is_correct: bool
    explanation_markdown: str


class DungeonTurnPayload(BaseModel):
    """Structured dungeon beat; narration is also duplicated in session message for the transcript."""

    narration: str
    decision_state: Literal["continue", "success", "failure"]
    success_condition: str | None = None
    failure_condition: str | None = None
    scenario_title: str | None = None
    stakes_tier: int | None = None


class AgentQuestion(BaseModel):
    id: str
    prompt: str
    skill_id: str | None = None
    domain_id: str | None = None
    concept_id: str | None = None
    correct_option_index: int | None = None
    question_type: Literal["multiple_choice"] = "multiple_choice"
    kind: Literal["profile", "knowledge_probe", "placement_probe", "placement_confirm", "topic_quiz", "skill_quiz", "domain_quiz"] = "profile"
    options: list[AgentAnswerOption] = Field(default_factory=list)
    attempt_number: int = 1
    difficulty: Literal["easy", "medium", "hard"] | None = None
    placement_stage: Literal["placement_probe", "placement_confirm"] | None = None
    quiz_id: str | None = None


class AgentSessionCreateRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    query: str = Field(..., min_length=1)
    learning_style: Literal["text", "video", "both"] | None = None


class AgentTurnRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    message: str | None = None
    input_mode: Literal[
        "text",
        "multiple_choice",
        "start_mode",
        "focus_confirm",
        "quiz_ready",
        "dungeon_start",
        "dungeon_abort",
        "dungeon_dismiss",
    ] = "text"
    question_id: str | None = None
    selected_option_id: str | None = None
    selected_option_index: int | None = None

    @model_validator(mode="after")
    def validate_payload(self) -> "AgentTurnRequest":
        if self.input_mode == "multiple_choice":
            if self.question_id is None:
                raise ValueError("question_id is required for multiple-choice turns")
            if self.selected_option_index is None and not self.selected_option_id:
                raise ValueError("A selected option is required for multiple-choice turns")
            return self

        if self.input_mode == "start_mode":
            if self.selected_option_id not in {"beginning", "placement"}:
                raise ValueError("selected_option_id must be 'beginning' or 'placement' for start-mode turns")
            return self

        if self.input_mode == "focus_confirm":
            return self

        if self.input_mode == "quiz_ready":
            return self

        if self.input_mode in {"dungeon_start", "dungeon_abort", "dungeon_dismiss"}:
            return self

        if not (self.message or "").strip():
            raise ValueError("message is required for text turns")
        return self


class AgentSessionResponse(BaseModel):
    session_id: str
    project_id: str | None = None
    user_id: str
    status: str
    active_agent: str
    message: str
    roadmap: RoadmapResponse | None = None
    pending_questions: list[AgentQuestion] = Field(default_factory=list)
    state: dict[str, Any] = Field(default_factory=dict)
    quiz_outcome_feedback: QuizOutcomeFeedback | None = None
    dungeon_turn: DungeonTurnPayload | None = None


class AgentSessionStateResponse(BaseModel):
    session_id: str
    project_id: str | None = None
    user_id: str
    status: str
    active_agent: str
    roadmap: RoadmapResponse | None = None
    pending_questions: list[AgentQuestion] = Field(default_factory=list)
    state: dict[str, Any] = Field(default_factory=dict)


class AgentProjectSummary(BaseModel):
    id: str
    user_id: str
    title: str
    goal: str
    status: str
    latest_session_id: str | None = None
    latest_session_status: str | None = None
    created_at: str
    updated_at: str


class AgentProjectLatestSessionResponse(BaseModel):
    project: AgentProjectSummary
    session: AgentSessionStateResponse | None = None


class AgentEventResponse(BaseModel):
    id: int
    session_id: str
    role: Literal["user", "assistant", "system"]
    agent: str
    event_type: str
    content: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class AgentDeleteResponse(BaseModel):
    deleted: bool = True
