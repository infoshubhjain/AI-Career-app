"""Online Bayesian Knowledge Tracing utilities for skill-level mastery."""

from __future__ import annotations

from dataclasses import dataclass
from math import log2


MODEL_VERSION = "bkt-skill-v1"


@dataclass(slots=True)
class BKTState:
    skill_id: str
    domain_id: str | None
    p_know: float
    p_init: float
    p_learn: float
    p_guess: float
    p_slip: float
    observation_count: int
    correct_count: int
    incorrect_count: int


@dataclass(slots=True)
class BKTUpdateResult:
    posterior_before: float
    posterior_observation: float
    posterior_after: float
    confidence: float
    uncertainty: float
    expected_information_gain: float
    is_correct: bool


class BKTEngine:
    """Pure BKT math plus selection heuristics for the orchestration runtime."""

    mastery_threshold = 0.7
    confidence_threshold = 0.05
    min_budget_before_stop = 3
    default_p_learn = 0.15
    default_p_guess = 0.2
    default_p_slip = 0.1

    def initial_state(self, *, skill_id: str, domain_id: str | None, p_init: float) -> BKTState:
        bounded = self._clamp(p_init)
        return BKTState(
            skill_id=skill_id,
            domain_id=domain_id,
            p_know=bounded,
            p_init=bounded,
            p_learn=self.default_p_learn,
            p_guess=self.default_p_guess,
            p_slip=self.default_p_slip,
            observation_count=0,
            correct_count=0,
            incorrect_count=0,
        )

    def default_prior_for_skill(self, *, absolute_index: int, total_skills: int) -> float:
        if total_skills <= 1:
            return 0.55
        relative = absolute_index / max(1, total_skills - 1)
        return self._clamp(0.78 - (0.56 * relative))

    def update(self, state: BKTState, *, is_correct: bool) -> BKTUpdateResult:
        prior = self._clamp(state.p_know)
        posterior_observation = self._posterior_after_observation(
            p_know=prior,
            p_guess=state.p_guess,
            p_slip=state.p_slip,
            is_correct=is_correct,
        )
        posterior_after = self._clamp(
            posterior_observation + ((1.0 - posterior_observation) * state.p_learn)
        )
        uncertainty_after = self.normalized_entropy(posterior_after)
        return BKTUpdateResult(
            posterior_before=prior,
            posterior_observation=posterior_observation,
            posterior_after=posterior_after,
            confidence=1.0 - uncertainty_after,
            uncertainty=uncertainty_after,
            expected_information_gain=self.expected_information_gain(state),
            is_correct=is_correct,
        )

    def expected_information_gain(self, state: BKTState) -> float:
        prior_entropy = self.normalized_entropy(state.p_know)
        p_correct = self._clamp(
            (state.p_know * (1.0 - state.p_slip)) + ((1.0 - state.p_know) * state.p_guess)
        )
        posterior_correct = self._posterior_after_observation(
            p_know=state.p_know,
            p_guess=state.p_guess,
            p_slip=state.p_slip,
            is_correct=True,
        )
        posterior_incorrect = self._posterior_after_observation(
            p_know=state.p_know,
            p_guess=state.p_guess,
            p_slip=state.p_slip,
            is_correct=False,
        )
        expected_entropy = (
            p_correct * self.normalized_entropy(posterior_correct)
            + (1.0 - p_correct) * self.normalized_entropy(posterior_incorrect)
        )
        return max(0.0, prior_entropy - expected_entropy)

    def normalized_entropy(self, probability: float) -> float:
        p = self._clamp(probability)
        if p in {0.0, 1.0}:
            return 0.0
        entropy = -(p * log2(p) + (1.0 - p) * log2(1.0 - p))
        return max(0.0, min(1.0, entropy))

    def confidence(self, probability: float) -> float:
        return 1.0 - self.normalized_entropy(probability)

    def assessment(self, posterior_after: float, *, is_correct: bool) -> str:
        if posterior_after >= self.mastery_threshold:
            return "mastered"
        if not is_correct and posterior_after < (self.mastery_threshold * 0.8):
            return "frontier"
        return "developing"

    def selection_score(self, state: BKTState, *, distance_from_frontier: int, recently_asked: bool) -> float:
        info_gain = self.expected_information_gain(state)
        distance_bonus = 1.0 / (1 + max(0, distance_from_frontier))
        recency_penalty = 0.35 if recently_asked else 1.0
        return info_gain * distance_bonus * recency_penalty

    def should_stop(
        self,
        *,
        ordered_probabilities: list[float],
        ordered_observations: list[int],
        question_budget_used: int,
        max_questions: int,
    ) -> tuple[bool, str | None]:
        if question_budget_used >= max_questions:
            return True, "budget_reached"
        if not ordered_probabilities:
            return True, "no_skills"
        frontier_index = self.frontier_index(ordered_probabilities)
        if frontier_index is None:
            if question_budget_used >= self.min_budget_before_stop:
                return True, "all_mastered"
            return False, None
        frontier_confident = self.confidence(ordered_probabilities[frontier_index]) >= self.confidence_threshold
        frontier_seen = ordered_observations[frontier_index] > 0
        prev_index = frontier_index - 1
        prev_mastered = prev_index < 0 or ordered_probabilities[prev_index] >= self.mastery_threshold
        prev_confident = prev_index < 0 or self.confidence(ordered_probabilities[prev_index]) >= self.confidence_threshold
        prev_seen = prev_index < 0 or ordered_observations[prev_index] > 0
        if question_budget_used >= self.min_budget_before_stop and frontier_confident and frontier_seen and prev_mastered and prev_confident and prev_seen:
            return True, "frontier_stable"
        return False, None

    def frontier_index(self, ordered_probabilities: list[float]) -> int | None:
        for index, probability in enumerate(ordered_probabilities):
            if probability < self.mastery_threshold:
                return index
        return None

    def _posterior_after_observation(self, *, p_know: float, p_guess: float, p_slip: float, is_correct: bool) -> float:
        prior = self._clamp(p_know)
        if is_correct:
            numerator = prior * (1.0 - p_slip)
            denominator = numerator + ((1.0 - prior) * p_guess)
        else:
            numerator = prior * p_slip
            denominator = numerator + ((1.0 - prior) * (1.0 - p_guess))
        if denominator <= 0:
            return prior
        return self._clamp(numerator / denominator)

    def _clamp(self, value: float) -> float:
        return max(0.001, min(0.999, float(value)))
