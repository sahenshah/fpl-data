import csv
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..models import Fixture, HistoricalMatchOdds, MatchOdds

# Maps the many spellings football-data.co.uk and The Odds API use for a
# club to our own `Team.short_name` codes. Includes current-season clubs
# plus promoted/relegated ones across the seasons already ingested
# (2022-23 through 2024-25, see historical.py) so both odds sources match
# against the same alias table.
TEAM_NAME_ALIASES: dict[str, str] = {
    "arsenal": "ARS",
    "aston villa": "AVL",
    "bournemouth": "BOU",
    "afc bournemouth": "BOU",
    "brentford": "BRE",
    "brighton": "BHA",
    "brighton and hove albion": "BHA",
    "brighton & hove albion": "BHA",
    "burnley": "BUR",
    "chelsea": "CHE",
    "coventry": "COV",
    "coventry city": "COV",
    "crystal palace": "CRY",
    "everton": "EVE",
    "fulham": "FUL",
    "hull": "HUL",
    "hull city": "HUL",
    "ipswich": "IPS",
    "ipswich town": "IPS",
    "leeds": "LEE",
    "leeds united": "LEE",
    "leicester": "LEI",
    "leicester city": "LEI",
    "liverpool": "LIV",
    "luton": "LUT",
    "luton town": "LUT",
    "man city": "MCI",
    "manchester city": "MCI",
    "man united": "MUN",
    "man utd": "MUN",
    "manchester united": "MUN",
    "newcastle": "NEW",
    "newcastle united": "NEW",
    "norwich": "NOR",
    "norwich city": "NOR",
    "nott'm forest": "NFO",
    "nottingham forest": "NFO",
    "sheffield united": "SHU",
    "sheffield utd": "SHU",
    "southampton": "SOU",
    "spurs": "TOT",
    "tottenham": "TOT",
    "tottenham hotspur": "TOT",
    "sunderland": "SUN",
    "watford": "WAT",
    "west brom": "WBA",
    "west bromwich albion": "WBA",
    "west ham": "WHU",
    "west ham united": "WHU",
    "wolves": "WOL",
    "wolverhampton": "WOL",
    "wolverhampton wanderers": "WOL",
}

HISTORICAL_ODDS_COLUMNS = ("HomeTeam", "AwayTeam", "AvgH", "AvgD", "AvgA")


def _short_name(raw_name: str) -> str | None:
    return TEAM_NAME_ALIASES.get(raw_name.strip().lower())


def devig(probabilities: list[float]) -> list[float]:
    """Normalize implied probabilities (1/odds, which sum to >1 because of
    the bookmaker's margin) so they sum to exactly 1."""
    total = sum(probabilities)
    if total <= 0:
        return [0.0 for _ in probabilities]
    return [p / total for p in probabilities]


def _implied_probabilities_from_odds(odds: list[float | None]) -> list[float] | None:
    if any(value is None or value <= 0 for value in odds):
        return None
    return devig([1.0 / value for value in odds])


def parse_historical_odds_csv(path: Path, season: str) -> list[dict[str, Any]]:
    with path.open(newline="", encoding="utf-8", errors="replace") as handle:
        reader = csv.DictReader(handle)
        fieldnames = set(reader.fieldnames or [])
        missing = [column for column in HISTORICAL_ODDS_COLUMNS if column not in fieldnames]
        if missing:
            raise ValueError(f"{path} is missing expected column(s): {', '.join(missing)}")
        rows = list(reader)

    over_under_available = "Avg>2.5" in fieldnames and "Avg<2.5" in fieldnames
    parsed: list[dict[str, Any]] = []
    for row in rows:
        home_short = _short_name(row["HomeTeam"])
        away_short = _short_name(row["AwayTeam"])
        if home_short is None or away_short is None:
            continue

        def _float(value: str | None) -> float | None:
            try:
                return float(value) if value not in (None, "") else None
            except ValueError:
                return None

        result_probs = _implied_probabilities_from_odds([_float(row.get("AvgH")), _float(row.get("AvgD")), _float(row.get("AvgA"))])
        goals_probs = (
            _implied_probabilities_from_odds([_float(row.get("Avg>2.5")), _float(row.get("Avg<2.5"))])
            if over_under_available else None
        )
        if result_probs is None:
            continue

        parsed.append({
            "season": season,
            "home_short_name": home_short,
            "away_short_name": away_short,
            "home_win_probability": Decimal(str(round(result_probs[0], 4))),
            "draw_probability": Decimal(str(round(result_probs[1], 4))),
            "away_win_probability": Decimal(str(round(result_probs[2], 4))),
            "over_2_5_probability": Decimal(str(round(goals_probs[0], 4))) if goals_probs else None,
            "under_2_5_probability": Decimal(str(round(goals_probs[1], 4))) if goals_probs else None,
            "raw_data": row,
        })
    return parsed


def replace_historical_odds(session: Session, season: str, rows: list[dict[str, Any]]) -> int:
    session.execute(delete(HistoricalMatchOdds).where(HistoricalMatchOdds.season == season))
    session.add_all(HistoricalMatchOdds(**row) for row in rows)
    return len(rows)


def parse_live_odds_payload(payload: list[dict[str, Any]], fixtures: list[Fixture], teams_by_id: dict[int, Any]) -> list[dict[str, Any]]:
    """Walk The Odds API's `/v4/sports/soccer_epl/odds/` response shape:
    a list of events, each with `home_team`/`away_team` and
    `bookmakers[].markets[].outcomes[]`. Averages implied probabilities
    across bookmakers before de-vigging, then matches to an already-ingested
    Fixture by (home_team_id, away_team_id).
    """
    fixture_by_teams: dict[tuple[int, int], Fixture] = {
        (fixture.home_team_id, fixture.away_team_id): fixture for fixture in fixtures
    }
    short_name_to_team_id = {team.short_name.lower(): team_id for team_id, team in teams_by_id.items()}

    parsed: list[dict[str, Any]] = []
    for event in payload:
        home_short = _short_name(event.get("home_team", ""))
        away_short = _short_name(event.get("away_team", ""))
        if home_short is None or away_short is None:
            continue
        home_team_id = short_name_to_team_id.get(home_short.lower())
        away_team_id = short_name_to_team_id.get(away_short.lower())
        if home_team_id is None or away_team_id is None:
            continue
        fixture = fixture_by_teams.get((home_team_id, away_team_id))
        if fixture is None:
            continue

        h2h_odds: dict[str, list[float]] = {"home": [], "draw": [], "away": []}
        totals_odds: dict[str, list[float]] = {"over": [], "under": []}
        for bookmaker in event.get("bookmakers", []):
            for market in bookmaker.get("markets", []):
                if market.get("key") == "h2h":
                    for outcome in market.get("outcomes", []):
                        name = outcome.get("name", "")
                        price = outcome.get("price")
                        if price is None:
                            continue
                        if name == event.get("home_team"):
                            h2h_odds["home"].append(price)
                        elif name == event.get("away_team"):
                            h2h_odds["away"].append(price)
                        elif name.lower() == "draw":
                            h2h_odds["draw"].append(price)
                elif market.get("key") == "totals":
                    for outcome in market.get("outcomes", []):
                        if outcome.get("point") != 2.5 or outcome.get("price") is None:
                            continue
                        if outcome.get("name", "").lower() == "over":
                            totals_odds["over"].append(outcome["price"])
                        elif outcome.get("name", "").lower() == "under":
                            totals_odds["under"].append(outcome["price"])

        def _average(values: list[float]) -> float | None:
            return sum(values) / len(values) if values else None

        result_probs = _implied_probabilities_from_odds([
            _average(h2h_odds["home"]), _average(h2h_odds["draw"]), _average(h2h_odds["away"]),
        ])
        goals_probs = _implied_probabilities_from_odds([_average(totals_odds["over"]), _average(totals_odds["under"])])
        if result_probs is None:
            continue

        parsed.append({
            "fixture_id": fixture.id,
            "home_win_probability": Decimal(str(round(result_probs[0], 4))),
            "draw_probability": Decimal(str(round(result_probs[1], 4))),
            "away_win_probability": Decimal(str(round(result_probs[2], 4))),
            "over_2_5_probability": Decimal(str(round(goals_probs[0], 4))) if goals_probs else None,
            "under_2_5_probability": Decimal(str(round(goals_probs[1], 4))) if goals_probs else None,
            "fetched_at": datetime.now(timezone.utc),
            "raw_data": event,
        })
    return parsed


def replace_live_odds(session: Session, rows: list[dict[str, Any]]) -> int:
    fixture_ids = [row["fixture_id"] for row in rows]
    if fixture_ids:
        session.execute(delete(MatchOdds).where(MatchOdds.fixture_id.in_(fixture_ids)))
    session.add_all(MatchOdds(**row) for row in rows)
    return len(rows)
