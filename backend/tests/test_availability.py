from datetime import date

from fpl_iq.modeling.availability import expected_return_gameweek, parse_expected_return_date


def test_parses_expected_back_date_within_the_same_year() -> None:
    result = parse_expected_return_date("Hamstring injury - Expected back 10 Oct", reference=date(2026, 9, 1))
    assert result == date(2026, 10, 10)


def test_rolls_over_to_next_year_when_the_date_has_already_passed_this_year() -> None:
    result = parse_expected_return_date("Expected back 5 Jan", reference=date(2026, 12, 1))
    assert result == date(2027, 1, 5)


def test_returns_none_for_unknown_return_date() -> None:
    assert parse_expected_return_date("Back injury - Unknown return date", reference=date(2026, 9, 1)) is None


def test_returns_none_for_no_news() -> None:
    assert parse_expected_return_date(None, reference=date(2026, 9, 1)) is None


def test_expected_return_gameweek_picks_first_deadline_on_or_after_the_date() -> None:
    deadlines = [(6, date(2026, 10, 3)), (7, date(2026, 10, 10)), (8, date(2026, 10, 17))]
    assert expected_return_gameweek(date(2026, 10, 9), deadlines) == 7
    assert expected_return_gameweek(date(2026, 10, 3), deadlines) == 6


def test_expected_return_gameweek_returns_none_when_past_every_deadline() -> None:
    deadlines = [(6, date(2026, 10, 3))]
    assert expected_return_gameweek(date(2026, 12, 1), deadlines) is None
