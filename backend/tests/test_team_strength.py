from types import SimpleNamespace

from fpl_iq.modeling.team_strength import build_team_match_log, team_strength_by_gameweek


def stat(player_id, team, gameweek, fixture_id, goals_scored, expected_goals=None, was_home=True):
    return SimpleNamespace(
        player_id=player_id, gameweek=gameweek, fixture_id=fixture_id,
        goals_scored=goals_scored, expected_goals=expected_goals, was_home=was_home,
    )


def _team_of_map(mapping):
    return lambda row: mapping.get(row.player_id)


def test_goals_against_is_the_opponent_team_goals_for_in_the_same_fixture() -> None:
    rows = [
        stat(1, "ARS", gameweek=1, fixture_id=100, goals_scored=2, expected_goals=1.5, was_home=True),
        stat(2, "AVL", gameweek=1, fixture_id=100, goals_scored=1, expected_goals=0.8, was_home=False),
    ]
    team_of = _team_of_map({1: "ARS", 2: "AVL"})

    log = build_team_match_log(rows, team_of)

    ars_match = log["ARS"][0]
    avl_match = log["AVL"][0]
    assert ars_match.goals_for == 2 and ars_match.goals_against == 1
    assert avl_match.goals_for == 1 and avl_match.goals_against == 2
    assert ars_match.was_home is True
    assert avl_match.was_home is False


def test_fixtures_with_only_one_team_represented_are_skipped() -> None:
    rows = [stat(1, "ARS", gameweek=1, fixture_id=100, goals_scored=2, was_home=True)]
    team_of = _team_of_map({1: "ARS"})

    log = build_team_match_log(rows, team_of)

    assert log == {}


def test_shrinkage_pulls_low_sample_team_toward_league_average() -> None:
    # ARS score heavily in their one match so far; every other team scores 1.
    rows = []
    fixture_id = 1
    for gw in range(1, 4):
        rows.append(stat(10 + gw, f"OPP{gw}A", gameweek=gw, fixture_id=fixture_id, goals_scored=1, was_home=True))
        rows.append(stat(20 + gw, f"OPP{gw}B", gameweek=gw, fixture_id=fixture_id, goals_scored=1, was_home=False))
        fixture_id += 1
    rows.append(stat(1, "ARS", gameweek=3, fixture_id=fixture_id, goals_scored=5, was_home=True))
    rows.append(stat(2, "BUR", gameweek=3, fixture_id=fixture_id, goals_scored=0, was_home=False))
    team_of = _team_of_map({1: "ARS", 2: "BUR", **{10 + gw: f"OPP{gw}A" for gw in range(1, 4)}, **{20 + gw: f"OPP{gw}B" for gw in range(1, 4)}})

    log = build_team_match_log(rows, team_of)
    snapshots = team_strength_by_gameweek(log, max_gameweek=5, shrink_k=6)

    # as of gameweek 4, ARS has one home match with 5 goals — shrunk toward
    # the league's ~1-goal average, so it should sit well below the raw 5.0
    ars_attack_home = snapshots[("ARS", 4)].strength_attack_home
    assert 0 < ars_attack_home < 2.5


def test_team_with_no_matches_gets_the_league_worst_not_the_average() -> None:
    # two very different home attacks on the books: ARS strong (3 goals), BUR weak (0 goals)
    rows = [
        stat(1, "ARS", gameweek=1, fixture_id=1, goals_scored=3, was_home=True),
        stat(2, "OPPA", gameweek=1, fixture_id=1, goals_scored=1, was_home=False),
        stat(3, "BUR", gameweek=1, fixture_id=2, goals_scored=0, was_home=True),
        stat(4, "OPPB", gameweek=1, fixture_id=2, goals_scored=1, was_home=False),
    ]
    team_of = _team_of_map({1: "ARS", 2: "OPPA", 3: "BUR", 4: "OPPB"})
    log = build_team_match_log(rows, team_of)
    # simulate a promoted club with zero recorded matches this season
    log["LEE"] = []

    snapshots = team_strength_by_gameweek(log, max_gameweek=3, shrink_k=6)

    lee_home_attack_at_gw2 = snapshots[("LEE", 2)].strength_attack_home
    ars_home_attack_at_gw2 = snapshots[("ARS", 2)].strength_attack_home
    bur_home_attack_at_gw2 = snapshots[("BUR", 2)].strength_attack_home
    league_average = (1.5 + 0.0) / 2  # ARS blended 1.5, BUR blended 0.0

    # LEE (zero matches) shrinks toward BUR's *raw* average (the weakest
    # observed team, 0.0) rather than the league average (0.75) — strictly
    # below both the league average and every team with actual data,
    # including BUR itself once BUR's own single match has been partially
    # shrunk back toward that same league average.
    assert lee_home_attack_at_gw2 == 0.0
    assert lee_home_attack_at_gw2 < league_average < ars_home_attack_at_gw2
    assert lee_home_attack_at_gw2 < bur_home_attack_at_gw2


def test_recent_matches_are_weighted_more_than_early_season_form() -> None:
    # ARS started the season poorly (0 goals) then hit form (3 goals) in
    # their most recent home match. The recency-weighted (decayed) blended
    # average should sit above the flat (undecayed) blended average of the
    # same two matches, since the more recent, higher-scoring match counts
    # for more.
    from fpl_iq.modeling.team_strength import _blended_average

    rows = [
        stat(1, "ARS", gameweek=1, fixture_id=1, goals_scored=0, was_home=True),
        stat(2, "OPPA", gameweek=1, fixture_id=1, goals_scored=2, was_home=False),
        stat(3, "ARS", gameweek=3, fixture_id=2, goals_scored=3, was_home=True),
        stat(4, "OPPB", gameweek=3, fixture_id=2, goals_scored=1, was_home=False),
    ]
    team_of = _team_of_map({1: "ARS", 2: "OPPA", 3: "ARS", 4: "OPPB"})
    log = build_team_match_log(rows, team_of)

    flat = _blended_average(log["ARS"], "goals_for", "xg_for")
    decayed = _blended_average(log["ARS"], "goals_for", "xg_for", decay=0.5)
    assert decayed > flat

    # and that recency weighting also propagates through to the full,
    # shrunk gameweek snapshot (not just the isolated helper)
    snapshots = team_strength_by_gameweek(log, max_gameweek=5, shrink_k=1, form_decay=0.5)
    snapshots_flat = team_strength_by_gameweek(log, max_gameweek=5, shrink_k=1, form_decay=1.0)
    assert snapshots[("ARS", 5)].strength_attack_home > snapshots_flat[("ARS", 5)].strength_attack_home
