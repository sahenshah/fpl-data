from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[int | None] = mapped_column(Integer)
    draw: Mapped[int | None] = mapped_column(Integer)
    form: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    loss: Mapped[int | None] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    played: Mapped[int | None] = mapped_column(Integer)
    points: Mapped[int | None] = mapped_column(Integer)
    position: Mapped[int | None] = mapped_column(Integer)
    short_name: Mapped[str] = mapped_column(String(10), nullable=False)
    strength: Mapped[int | None] = mapped_column(Integer)
    team_division: Mapped[str | None] = mapped_column(String(100))
    unavailable: Mapped[bool | None] = mapped_column(Boolean)
    win: Mapped[int | None] = mapped_column(Integer)
    strength_overall_home: Mapped[int | None] = mapped_column(Integer)
    strength_overall_away: Mapped[int | None] = mapped_column(Integer)
    strength_attack_home: Mapped[int | None] = mapped_column(Integer)
    strength_attack_away: Mapped[int | None] = mapped_column(Integer)
    strength_defence_home: Mapped[int | None] = mapped_column(Integer)
    strength_defence_away: Mapped[int | None] = mapped_column(Integer)
    pulse_id: Mapped[int | None] = mapped_column(Integer)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    players: Mapped[list["Player"]] = relationship(back_populates="team")


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    can_transact: Mapped[bool | None] = mapped_column(Boolean)
    can_select: Mapped[bool | None] = mapped_column(Boolean)
    chance_of_playing_next_round: Mapped[int | None] = mapped_column(Integer)
    chance_of_playing_this_round: Mapped[int | None] = mapped_column(Integer)
    code: Mapped[int | None] = mapped_column(Integer)
    cost_change_event: Mapped[int | None] = mapped_column(Integer)
    cost_change_event_fall: Mapped[int | None] = mapped_column(Integer)
    cost_change_start: Mapped[int | None] = mapped_column(Integer)
    cost_change_start_fall: Mapped[int | None] = mapped_column(Integer)
    dreamteam_count: Mapped[int | None] = mapped_column(Integer)
    element_type: Mapped[int | None] = mapped_column(ForeignKey("element_types.id"), index=True)
    ep_next: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    ep_this: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    event_points: Mapped[int | None] = mapped_column(Integer)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    form: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    in_dreamteam: Mapped[bool | None] = mapped_column(Boolean)
    news: Mapped[str | None] = mapped_column(Text)
    news_added: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    now_cost: Mapped[int | None] = mapped_column(Integer)
    photo: Mapped[str | None] = mapped_column(String(100))
    points_per_game: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    removed: Mapped[bool | None] = mapped_column(Boolean)
    second_name: Mapped[str] = mapped_column(String(100), nullable=False)
    selected_by_percent: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    special: Mapped[bool | None] = mapped_column(Boolean)
    squad_number: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str | None] = mapped_column(String(5))
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False, index=True)
    team_code: Mapped[int | None] = mapped_column(Integer)
    total_points: Mapped[int | None] = mapped_column(Integer)
    transfers_in: Mapped[int | None] = mapped_column(Integer)
    transfers_in_event: Mapped[int | None] = mapped_column(Integer)
    transfers_out: Mapped[int | None] = mapped_column(Integer)
    transfers_out_event: Mapped[int | None] = mapped_column(Integer)
    value_form: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    value_season: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    web_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    region: Mapped[int | None] = mapped_column(Integer)
    team_join_date: Mapped[date | None] = mapped_column(Date)
    birth_date: Mapped[date | None] = mapped_column(Date)
    has_temporary_code: Mapped[bool | None] = mapped_column(Boolean)
    opta_code: Mapped[str | None] = mapped_column(String(50))
    minutes: Mapped[int | None] = mapped_column(Integer)
    goals_scored: Mapped[int | None] = mapped_column(Integer)
    assists: Mapped[int | None] = mapped_column(Integer)
    clean_sheets: Mapped[int | None] = mapped_column(Integer)
    goals_conceded: Mapped[int | None] = mapped_column(Integer)
    own_goals: Mapped[int | None] = mapped_column(Integer)
    penalties_saved: Mapped[int | None] = mapped_column(Integer)
    penalties_missed: Mapped[int | None] = mapped_column(Integer)
    yellow_cards: Mapped[int | None] = mapped_column(Integer)
    red_cards: Mapped[int | None] = mapped_column(Integer)
    saves: Mapped[int | None] = mapped_column(Integer)
    bonus: Mapped[int | None] = mapped_column(Integer)
    bps: Mapped[int | None] = mapped_column(Integer)
    influence: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    creativity: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    threat: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    ict_index: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    clearances_blocks_interceptions: Mapped[int | None] = mapped_column(Integer)
    recoveries: Mapped[int | None] = mapped_column(Integer)
    tackles: Mapped[int | None] = mapped_column(Integer)
    defensive_contribution: Mapped[int | None] = mapped_column(Integer)
    starts: Mapped[int | None] = mapped_column(Integer)
    expected_goals: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_assists: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_goal_involvements: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_goals_conceded: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    influence_rank: Mapped[int | None] = mapped_column(Integer)
    influence_rank_type: Mapped[int | None] = mapped_column(Integer)
    creativity_rank: Mapped[int | None] = mapped_column(Integer)
    creativity_rank_type: Mapped[int | None] = mapped_column(Integer)
    threat_rank: Mapped[int | None] = mapped_column(Integer)
    threat_rank_type: Mapped[int | None] = mapped_column(Integer)
    ict_index_rank: Mapped[int | None] = mapped_column(Integer)
    ict_index_rank_type: Mapped[int | None] = mapped_column(Integer)
    corners_and_indirect_freekicks_order: Mapped[int | None] = mapped_column(Integer)
    corners_and_indirect_freekicks_text: Mapped[str | None] = mapped_column(Text)
    direct_freekicks_order: Mapped[int | None] = mapped_column(Integer)
    direct_freekicks_text: Mapped[str | None] = mapped_column(Text)
    penalties_order: Mapped[int | None] = mapped_column(Integer)
    penalties_text: Mapped[str | None] = mapped_column(Text)
    expected_goals_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    saves_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_assists_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_goal_involvements_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_goals_conceded_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    goals_conceded_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    now_cost_rank: Mapped[int | None] = mapped_column(Integer)
    now_cost_rank_type: Mapped[int | None] = mapped_column(Integer)
    form_rank: Mapped[int | None] = mapped_column(Integer)
    form_rank_type: Mapped[int | None] = mapped_column(Integer)
    points_per_game_rank: Mapped[int | None] = mapped_column(Integer)
    points_per_game_rank_type: Mapped[int | None] = mapped_column(Integer)
    selected_rank: Mapped[int | None] = mapped_column(Integer)
    selected_rank_type: Mapped[int | None] = mapped_column(Integer)
    starts_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    clean_sheets_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    defensive_contribution_per_90: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    team: Mapped[Team] = relationship(back_populates="players")


class ElementType(Base):
    __tablename__ = "element_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    singular_name: Mapped[str] = mapped_column(String(50), nullable=False)
    plural_name: Mapped[str] = mapped_column(String(50), nullable=False)
    singular_name_short: Mapped[str] = mapped_column(String(10), nullable=False)
    squad_select: Mapped[int | None] = mapped_column(Integer)
    squad_min_play: Mapped[int | None] = mapped_column(Integer)
    squad_max_play: Mapped[int | None] = mapped_column(Integer)
    ui_shorthand: Mapped[str | None] = mapped_column(String(10))
    sub_positions_locked: Mapped[list | None] = mapped_column(JSON)
    element_count: Mapped[int | None] = mapped_column(Integer)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    deadline_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    release_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    average_entry_score: Mapped[int | None] = mapped_column(Integer)
    finished: Mapped[bool | None] = mapped_column(Boolean)
    data_checked: Mapped[bool | None] = mapped_column(Boolean)
    highest_scoring_entry: Mapped[int | None] = mapped_column(Integer)
    deadline_time_epoch: Mapped[int | None] = mapped_column(Integer)
    deadline_time_game_offset: Mapped[int | None] = mapped_column(Integer)
    highest_score: Mapped[int | None] = mapped_column(Integer)
    is_previous: Mapped[bool | None] = mapped_column(Boolean)
    is_current: Mapped[bool | None] = mapped_column(Boolean)
    is_next: Mapped[bool | None] = mapped_column(Boolean)
    cup_leagues_created: Mapped[bool | None] = mapped_column(Boolean)
    h2h_ko_matches_created: Mapped[bool | None] = mapped_column(Boolean)
    can_enter: Mapped[bool | None] = mapped_column(Boolean)
    can_manage: Mapped[bool | None] = mapped_column(Boolean)
    released: Mapped[bool | None] = mapped_column(Boolean)
    ranked_count: Mapped[int | None] = mapped_column(Integer)
    most_selected: Mapped[int | None] = mapped_column(Integer)
    most_transferred_in: Mapped[int | None] = mapped_column(Integer)
    top_element: Mapped[int | None] = mapped_column(Integer)
    transfers_made: Mapped[int | None] = mapped_column(Integer)
    most_captained: Mapped[int | None] = mapped_column(Integer)
    most_vice_captained: Mapped[int | None] = mapped_column(Integer)
    overrides: Mapped[dict | None] = mapped_column(JSON)
    chip_plays: Mapped[list | None] = mapped_column(JSON)
    top_element_info: Mapped[dict | None] = mapped_column(JSON)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class Chip(Base):
    __tablename__ = "chips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    number: Mapped[int | None] = mapped_column(Integer)
    start_event: Mapped[int | None] = mapped_column(Integer)
    stop_event: Mapped[int | None] = mapped_column(Integer)
    chip_type: Mapped[str | None] = mapped_column(String(20))
    overrides: Mapped[dict | None] = mapped_column(JSON)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class Phase(Base):
    __tablename__ = "phases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_event: Mapped[int] = mapped_column(Integer, nullable=False)
    stop_event: Mapped[int] = mapped_column(Integer, nullable=False)
    highest_score: Mapped[int | None] = mapped_column(Integer)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class Fixture(Base):
    __tablename__ = "fixtures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"), index=True)
    home_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    away_team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), index=True)
    kickoff_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class PlayerGameweekStat(Base):
    __tablename__ = "player_gameweek_stats"
    __table_args__ = (UniqueConstraint("player_id", "gameweek", "fixture_id", name="uq_player_gameweek_fixture_stat"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), nullable=False, index=True)
    gameweek: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    fixture_id: Mapped[int | None] = mapped_column(Integer, index=True)
    opponent_team_id: Mapped[int | None] = mapped_column(Integer, index=True)
    was_home: Mapped[bool | None] = mapped_column(Boolean)
    kickoff_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    minutes: Mapped[int | None] = mapped_column(Integer)
    starts: Mapped[int | None] = mapped_column(Integer)
    total_points: Mapped[int | None] = mapped_column(Integer, nullable=False)
    goals_scored: Mapped[int | None] = mapped_column(Integer)
    assists: Mapped[int | None] = mapped_column(Integer)
    clean_sheets: Mapped[int | None] = mapped_column(Integer)
    goals_conceded: Mapped[int | None] = mapped_column(Integer)
    own_goals: Mapped[int | None] = mapped_column(Integer)
    penalties_saved: Mapped[int | None] = mapped_column(Integer)
    penalties_missed: Mapped[int | None] = mapped_column(Integer)
    yellow_cards: Mapped[int | None] = mapped_column(Integer)
    red_cards: Mapped[int | None] = mapped_column(Integer)
    saves: Mapped[int | None] = mapped_column(Integer)
    bonus: Mapped[int | None] = mapped_column(Integer)
    bps: Mapped[int | None] = mapped_column(Integer)
    influence: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    creativity: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    threat: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    ict_index: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    clearances_blocks_interceptions: Mapped[int | None] = mapped_column(Integer)
    recoveries: Mapped[int | None] = mapped_column(Integer)
    tackles: Mapped[int | None] = mapped_column(Integer)
    defensive_contribution: Mapped[int | None] = mapped_column(Integer)
    expected_goals: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_assists: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_goal_involvements: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_goals_conceded: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    value: Mapped[int | None] = mapped_column(Integer)
    transfers_balance: Mapped[int | None] = mapped_column(Integer)
    selected: Mapped[int | None] = mapped_column(Integer)
    transfers_in: Mapped[int | None] = mapped_column(Integer)
    transfers_out: Mapped[int | None] = mapped_column(Integer)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class IngestionRun(Base):
    __tablename__ = "ingestion_runs"
    __table_args__ = (UniqueConstraint("source", "started_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_message: Mapped[str | None] = mapped_column(String(500))


class BootstrapSnapshot(Base):
    __tablename__ = "bootstrap_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False)


class PredictionRun(Base):
    __tablename__ = "prediction_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    feature_version: Mapped[str] = mapped_column(String(50), nullable=False)
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    training_start_event: Mapped[int | None] = mapped_column(Integer)
    training_end_event: Mapped[int | None] = mapped_column(Integer)
    metrics: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False)


class HistoricalTeam(Base):
    __tablename__ = "historical_teams"

    season: Mapped[str] = mapped_column(String(10), primary_key=True)
    short_name: Mapped[str] = mapped_column(String(10), primary_key=True)
    strength_overall_home: Mapped[int | None] = mapped_column(Integer)
    strength_overall_away: Mapped[int | None] = mapped_column(Integer)
    strength_attack_home: Mapped[int | None] = mapped_column(Integer)
    strength_attack_away: Mapped[int | None] = mapped_column(Integer)
    strength_defence_home: Mapped[int | None] = mapped_column(Integer)
    strength_defence_away: Mapped[int | None] = mapped_column(Integer)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class HistoricalPlayer(Base):
    __tablename__ = "historical_players"

    season: Mapped[str] = mapped_column(String(10), primary_key=True)
    player_key: Mapped[str] = mapped_column(String(100), primary_key=True)
    web_name: Mapped[str] = mapped_column(String(100), nullable=False)
    team_short_name: Mapped[str] = mapped_column(String(10), nullable=False)
    element_type: Mapped[int | None] = mapped_column(Integer)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class HistoricalPlayerGameweekStat(Base):
    __tablename__ = "historical_player_gameweek_stats"
    __table_args__ = (
        UniqueConstraint("season", "player_key", "gameweek", "fixture_id", name="uq_historical_player_gameweek_fixture"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    season: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    player_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    gameweek: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    fixture_id: Mapped[int | None] = mapped_column(Integer)
    opponent_short_name: Mapped[str | None] = mapped_column(String(10))
    was_home: Mapped[bool | None] = mapped_column(Boolean)
    kickoff_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    minutes: Mapped[int | None] = mapped_column(Integer)
    starts: Mapped[int | None] = mapped_column(Integer)
    total_points: Mapped[int | None] = mapped_column(Integer, nullable=False)
    goals_scored: Mapped[int | None] = mapped_column(Integer)
    assists: Mapped[int | None] = mapped_column(Integer)
    clean_sheets: Mapped[int | None] = mapped_column(Integer)
    goals_conceded: Mapped[int | None] = mapped_column(Integer)
    expected_goals: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_assists: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_goal_involvements: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    expected_goals_conceded: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class HistoricalMatchOdds(Base):
    __tablename__ = "historical_match_odds"

    season: Mapped[str] = mapped_column(String(10), primary_key=True)
    home_short_name: Mapped[str] = mapped_column(String(10), primary_key=True)
    away_short_name: Mapped[str] = mapped_column(String(10), primary_key=True)
    home_win_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    draw_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    away_win_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    over_2_5_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    under_2_5_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class MatchOdds(Base):
    __tablename__ = "match_odds"

    fixture_id: Mapped[int] = mapped_column(ForeignKey("fixtures.id"), primary_key=True)
    home_win_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    draw_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    away_win_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    over_2_5_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    under_2_5_probability: Mapped[Decimal | None] = mapped_column(Numeric(6, 4))
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    raw_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class PlayerPrediction(Base):
    __tablename__ = "player_predictions"
    __table_args__ = (UniqueConstraint("prediction_run_id", "player_id", "event_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    prediction_run_id: Mapped[int] = mapped_column(ForeignKey("prediction_runs.id"), index=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"), index=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), index=True)
    predicted_points: Mapped[Decimal] = mapped_column(Numeric(8, 3), nullable=False)
    predicted_minutes: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    lower_bound: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    upper_bound: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
