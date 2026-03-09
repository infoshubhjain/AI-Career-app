from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.bkt_engine import BKTEngine


def test_correct_answer_increases_posterior() -> None:
    engine = BKTEngine()
    state = engine.initial_state(skill_id="python-basics", domain_id="python", p_init=0.45)

    result = engine.update(state, is_correct=True)

    assert result.posterior_after > result.posterior_before
    assert 0.0 <= result.confidence <= 1.0


def test_incorrect_answer_decreases_posterior() -> None:
    engine = BKTEngine()
    state = engine.initial_state(skill_id="sql-joins", domain_id="data", p_init=0.65)

    result = engine.update(state, is_correct=False)

    assert result.posterior_after < result.posterior_before
    assert result.uncertainty >= 0.0


def test_frontier_detection_finds_first_unmastered_skill() -> None:
    engine = BKTEngine()

    frontier_index = engine.frontier_index([0.92, 0.84, 0.68, 0.31])

    assert frontier_index == 2


def test_should_stop_when_frontier_is_stable() -> None:
    engine = BKTEngine()

    should_stop, reason = engine.should_stop(
        ordered_probabilities=[0.92, 0.86, 0.64, 0.28],
        ordered_observations=[2, 2, 2, 1],
        question_budget_used=4,
        max_questions=6,
    )

    assert should_stop is True
    assert reason == "frontier_stable"


def test_budget_stop_takes_precedence() -> None:
    engine = BKTEngine()

    should_stop, reason = engine.should_stop(
        ordered_probabilities=[0.51, 0.49, 0.48],
        ordered_observations=[1, 1, 1],
        question_budget_used=6,
        max_questions=6,
    )

    assert should_stop is True
    assert reason == "budget_reached"
