import requests
import sqlite3
import json
import os
import csv
import time
import subprocess
import shutil
from datetime import datetime

def fetch_bootstrap():
    url = "https://fantasy.premierleague.com/api/bootstrap-static/"
    res = requests.get(url)
    res.raise_for_status()
    return res.json()

def fetch_fixtures():
    url = "https://fantasy.premierleague.com/api/fixtures/"
    res = requests.get(url)
    res.raise_for_status()
    return res.json()

def fetch_element_summary(element_id):
    url = f"https://fantasy.premierleague.com/api/element-summary/{element_id}/"
    res = requests.get(url)
    res.raise_for_status()
    return res.json()

def create_tables(conn):
    c = conn.cursor()
    # Events table
    c.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY,
        name TEXT,
        deadline_time TEXT,
        release_time TEXT,
        average_entry_score INTEGER,
        finished BOOLEAN,
        data_checked BOOLEAN,
        highest_scoring_entry INTEGER,
        deadline_time_epoch INTEGER,
        deadline_time_game_offset INTEGER,
        highest_score INTEGER,
        is_previous BOOLEAN,
        is_current BOOLEAN,
        is_next BOOLEAN,
        cup_leagues_created BOOLEAN,
        h2h_ko_matches_created BOOLEAN,
        can_enter BOOLEAN,
        can_manage BOOLEAN,
        released BOOLEAN,
        ranked_count INTEGER,
        overrides TEXT,
        chip_plays TEXT,
        most_selected INTEGER,
        most_transferred_in INTEGER,
        top_element INTEGER,
        top_element_info TEXT,
        transfers_made INTEGER,
        most_captained INTEGER,
        most_vice_captained INTEGER
    )
    """)
    # Phases table
    c.execute("""
    CREATE TABLE IF NOT EXISTS phases (
        id INTEGER PRIMARY KEY,
        name TEXT,
        start_event INTEGER,
        stop_event INTEGER,
        highest_score INTEGER
    )
    """)
    # Teams table
    c.execute("""
    CREATE TABLE IF NOT EXISTS teams (
        code INTEGER,
        draw INTEGER,
        form TEXT,
        id INTEGER PRIMARY KEY,
        loss INTEGER,
        name TEXT,
        played INTEGER,
        points INTEGER,
        position INTEGER,
        short_name TEXT,
        strength INTEGER,
        team_division INTEGER,
        unavailable BOOLEAN,
        win INTEGER,
        strength_overall_home INTEGER,
        strength_overall_away INTEGER,
        strength_attack_home INTEGER,
        strength_attack_away INTEGER,
        strength_defence_home INTEGER,
        strength_defence_away INTEGER,
        pulse_id INTEGER
    )
    """)
    # Elements table with GW predicted points and xmins columns
    gw_pp_cols = [f"pp_gw_{i} REAL" for i in range(1, 39)]
    gw_xmins_cols = [f"xmins_gw_{i} REAL" for i in range(1, 39)]
    c.execute(f"""
    CREATE TABLE IF NOT EXISTS elements (
        id INTEGER PRIMARY KEY,
        can_transact BOOLEAN,
        can_select BOOLEAN,
        chance_of_playing_next_round INTEGER,
        chance_of_playing_this_round INTEGER,
        code INTEGER,
        cost_change_event INTEGER,
        cost_change_event_fall INTEGER,
        cost_change_start INTEGER,
        cost_change_start_fall INTEGER,
        dreamteam_count INTEGER,
        element_type INTEGER,
        ep_next TEXT,
        ep_this TEXT,
        event_points INTEGER,
        first_name TEXT,
        form TEXT,
        in_dreamteam BOOLEAN,
        news TEXT,
        news_added TEXT,
        now_cost INTEGER,
        photo TEXT,
        points_per_game TEXT,
        removed BOOLEAN,
        second_name TEXT,
        selected_by_percent TEXT,
        special BOOLEAN,
        squad_number INTEGER,
        status TEXT,
        team INTEGER,
        team_code INTEGER,
        total_points INTEGER,
        transfers_in INTEGER,
        transfers_in_event INTEGER,
        transfers_out INTEGER,
        transfers_out_event INTEGER,
        value_form TEXT,
        value_season TEXT,
        web_name TEXT,
        region INTEGER,
        team_join_date TEXT,
        birth_date TEXT,
        has_temporary_code BOOLEAN,
        opta_code TEXT,
        minutes INTEGER,
        goals_scored INTEGER,
        assists INTEGER,
        clean_sheets INTEGER,
        goals_conceded INTEGER,
        own_goals INTEGER,
        penalties_saved INTEGER,
        penalties_missed INTEGER,
        yellow_cards INTEGER,
        red_cards INTEGER,
        saves INTEGER,
        bonus INTEGER,
        bps INTEGER,
        influence TEXT,
        creativity TEXT,
        threat TEXT,
        ict_index TEXT,
        clearances_blocks_interceptions INTEGER,
        recoveries INTEGER,
        tackles INTEGER,
        defensive_contribution INTEGER,
        starts INTEGER,
        expected_goals TEXT,
        expected_assists TEXT,
        expected_goal_involvements TEXT,
        expected_goals_conceded TEXT,
        influence_rank INTEGER,
        influence_rank_type INTEGER,
        creativity_rank INTEGER,
        creativity_rank_type INTEGER,
        threat_rank INTEGER,
        threat_rank_type INTEGER,
        ict_index_rank INTEGER,
        ict_index_rank_type INTEGER,
        corners_and_indirect_freekicks_order INTEGER,
        corners_and_indirect_freekicks_text TEXT,
        direct_freekicks_order INTEGER,
        direct_freekicks_text TEXT,
        penalties_order INTEGER,
        penalties_text TEXT,
        expected_goals_per_90 REAL,
        saves_per_90 REAL,
        expected_assists_per_90 REAL,
        expected_goal_involvements_per_90 REAL,
        expected_goals_conceded_per_90 REAL,
        goals_conceded_per_90 REAL,
        now_cost_rank INTEGER,
        now_cost_rank_type INTEGER,
        form_rank INTEGER,
        form_rank_type INTEGER,
        points_per_game_rank INTEGER,
        points_per_game_rank_type INTEGER,
        selected_rank INTEGER,
        selected_rank_type INTEGER,
        starts_per_90 REAL,
        clean_sheets_per_90 REAL,
        defensive_contribution_per_90 REAL,
        predicted_points_next5 REAL,
        pp_next5_per_m REAL,
        elite_selected_percent TEXT,
        predicted_xmins_next5 REAL,
        pxm_next5_per_m REAL,
        {', '.join(gw_pp_cols)},
        {', '.join(gw_xmins_cols)}
    )
    """)
    # Fixtures table
    c.execute("""
    CREATE TABLE IF NOT EXISTS fixtures (
        id INTEGER PRIMARY KEY,
        code INTEGER,
        event INTEGER,
        finished BOOLEAN,
        finished_provisional BOOLEAN,
        kickoff_time TEXT,
        minutes INTEGER,
        provisional_start_time BOOLEAN,
        started BOOLEAN,
        team_a INTEGER,
        team_a_score INTEGER,
        team_h INTEGER,
        team_h_score INTEGER,
        stats TEXT,
        team_h_difficulty INTEGER,
        team_a_difficulty INTEGER,
        pulse_id INTEGER
    )
    """)
    # Element summary fixtures table
    c.execute("""
    CREATE TABLE IF NOT EXISTS element_summary_fixtures (
        pk INTEGER PRIMARY KEY AUTOINCREMENT,
        id INTEGER,
        element_id INTEGER,
        code INTEGER,
        team_h INTEGER,
        team_h_score INTEGER,
        team_a INTEGER,
        team_a_score INTEGER,
        event INTEGER,
        finished BOOLEAN,
        minutes INTEGER,
        provisional_start_time BOOLEAN,
        kickoff_time TEXT,
        event_name TEXT,
        is_home BOOLEAN,
        difficulty INTEGER
    )
    """)

    # Element summary history past table with unique id column
    c.execute("""
    CREATE TABLE IF NOT EXISTS element_summary_history_past (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_name TEXT,
        element_code INTEGER,
        element_id INTEGER,
        start_cost INTEGER,
        end_cost INTEGER,
        total_points INTEGER,
        minutes INTEGER,
        goals_scored INTEGER,
        assists INTEGER,
        clean_sheets INTEGER,
        goals_conceded INTEGER,
        own_goals INTEGER,
        penalties_saved INTEGER,
        penalties_missed INTEGER,
        yellow_cards INTEGER,
        red_cards INTEGER,
        saves INTEGER,
        bonus INTEGER,
        bps INTEGER,
        influence TEXT,
        creativity TEXT,
        threat TEXT,
        ict_index TEXT,
        clearances_blocks_interceptions INTEGER,
        recoveries INTEGER,
        tackles INTEGER,
        defensive_contribution INTEGER,
        starts INTEGER,
        expected_goals TEXT,
        expected_assists TEXT,
        expected_goal_involvements TEXT,
        expected_goals_conceded TEXT
    )
    """)

    conn.commit()

def insert_events(conn, events):
    c = conn.cursor()
    for e in events:
        # Serialize dict/list fields
        e = e.copy()
        e['overrides'] = json.dumps(e.get('overrides', {}))
        e['chip_plays'] = json.dumps(e.get('chip_plays', []))
        e['top_element_info'] = json.dumps(e.get('top_element_info', {}))
        c.execute("""
        INSERT OR REPLACE INTO events VALUES (
            :id, :name, :deadline_time, :release_time, :average_entry_score, :finished, :data_checked,
            :highest_scoring_entry, :deadline_time_epoch, :deadline_time_game_offset, :highest_score,
            :is_previous, :is_current, :is_next, :cup_leagues_created, :h2h_ko_matches_created,
            :can_enter, :can_manage, :released, :ranked_count, :overrides, :chip_plays, :most_selected,
            :most_transferred_in, :top_element, :top_element_info, :transfers_made, :most_captained, :most_vice_captained
        )
        """, e)
    conn.commit()

def insert_phases(conn, phases):
    c = conn.cursor()
    for p in phases:
        c.execute("""
        INSERT OR REPLACE INTO phases VALUES (
            :id, :name, :start_event, :stop_event, :highest_score
        )
        """, p)
    conn.commit()

def insert_teams(conn, teams):
    c = conn.cursor()
    for t in teams:
        c.execute("""
        INSERT OR REPLACE INTO teams VALUES (
            :code, :draw, :form, :id, :loss, :name, :played, :points, :position, :short_name, :strength,
            :team_division, :unavailable, :win, :strength_overall_home, :strength_overall_away,
            :strength_attack_home, :strength_attack_away, :strength_defence_home, :strength_defence_away, :pulse_id
        )
        """, t)
    conn.commit()

def insert_elements(conn, elements):
    c = conn.cursor()
    # List all columns as in table definition
    columns = [
        "id", "can_transact", "can_select", "chance_of_playing_next_round", "chance_of_playing_this_round", "code",
        "cost_change_event", "cost_change_event_fall", "cost_change_start", "cost_change_start_fall", "dreamteam_count",
        "element_type", "ep_next", "ep_this", "event_points", "first_name", "form", "in_dreamteam", "news", "news_added",
        "now_cost", "photo", "points_per_game", "removed", "second_name", "selected_by_percent", "special", "squad_number",
        "status", "team", "team_code", "total_points", "transfers_in", "transfers_in_event", "transfers_out", "transfers_out_event",
        "value_form", "value_season", "web_name", "region", "team_join_date", "birth_date", "has_temporary_code", "opta_code",
        "minutes", "goals_scored", "assists", "clean_sheets", "goals_conceded", "own_goals", "penalties_saved", "penalties_missed",
        "yellow_cards", "red_cards", "saves", "bonus", "bps", "influence", "creativity", "threat", "ict_index", "clearances_blocks_interceptions",
        "recoveries", "tackles", "defensive_contribution", "starts", "expected_goals", "expected_assists", "expected_goal_involvements",
        "expected_goals_conceded", "influence_rank", "influence_rank_type", "creativity_rank", "creativity_rank_type", "threat_rank",
        "threat_rank_type", "ict_index_rank", "ict_index_rank_type", "corners_and_indirect_freekicks_order", "corners_and_indirect_freekicks_text",
        "direct_freekicks_order", "direct_freekicks_text", "penalties_order", "penalties_text", "expected_goals_per_90", "saves_per_90",
        "expected_assists_per_90", "expected_goal_involvements_per_90", "expected_goals_conceded_per_90", "goals_conceded_per_90",
        "now_cost_rank", "now_cost_rank_type", "form_rank", "form_rank_type", "points_per_game_rank", "points_per_game_rank_type",
        "selected_rank", "selected_rank_type", "starts_per_90", "clean_sheets_per_90", "defensive_contribution_per_90"
    ]
    for e in elements:
        # Ensure all keys exist
        for col in columns:
            if col not in e:
                e[col] = None
        c.execute(f"""
        INSERT OR REPLACE INTO elements (
            {', '.join(columns)}
        ) VALUES (
            {', '.join(':' + col for col in columns)}
        )
        """, e)
    conn.commit()

def insert_fixtures(conn, fixtures):
    c = conn.cursor()
    for f in fixtures:
        f = f.copy()
        # Serialize stats (list) to JSON string
        f['stats'] = json.dumps(f.get('stats', []))
        c.execute("""
        INSERT OR REPLACE INTO fixtures (
            id, code, event, finished, finished_provisional, kickoff_time, minutes,
            provisional_start_time, started, team_a, team_a_score, team_h, team_h_score,
            stats, team_h_difficulty, team_a_difficulty, pulse_id
        ) VALUES (
            :id, :code, :event, :finished, :finished_provisional, :kickoff_time, :minutes,
            :provisional_start_time, :started, :team_a, :team_a_score, :team_h, :team_h_score,
            :stats, :team_h_difficulty, :team_a_difficulty, :pulse_id
        )
        """, f)
    conn.commit()

def insert_element_summary_data(conn, element_ids, delay=0.5):
    """
    For each element_id, fetch element-summary data and populate the
    element_summary_fixtures and element_summary_history_past tables.
    """
    c = conn.cursor()
    for eid in element_ids:
        try:
            summary = fetch_element_summary(eid)
        except Exception as e:
            print(f"Failed to fetch summary for element {eid}: {e}")
            continue

        # Insert fixtures
        for fixture in summary.get("fixtures", []):
            fixture_row = fixture.copy()
            fixture_row ["element_id"] = eid
            allowed_keys = {
                "id", "element_id", "code", "team_h", "team_h_score", "team_a", "team_a_score",
                "event", "finished", "minutes", "provisional_start_time", "kickoff_time",
                "event_name", "is_home", "difficulty"
            }
            fixture_row = {k: fixture_row.get(k) for k in allowed_keys}
            placeholders = ', '.join('?' for _ in fixture_row)
            columns = ', '.join(fixture_row.keys())
            values = list(fixture_row.values())
            c.execute(
                f"INSERT OR REPLACE INTO element_summary_fixtures ({columns}) VALUES ({placeholders})",
                values
            )

        # Insert history_past
        for hist in summary.get("history_past", []):
            hist_row = hist.copy()
            hist_row["element_id"] = eid
            allowed_keys = {
                "season_name", "element_code", "element_id", "start_cost", "end_cost", "total_points",
                "minutes", "goals_scored", "assists", "clean_sheets", "goals_conceded", "own_goals",
                "penalties_saved", "penalties_missed", "yellow_cards", "red_cards", "saves", "bonus",
                "bps", "influence", "creativity", "threat", "ict_index", "clearances_blocks_interceptions",
                "recoveries", "tackles", "defensive_contribution", "starts", "expected_goals",
                "expected_assists", "expected_goal_involvements", "expected_goals_conceded"
            }
            hist_row = {k: hist_row.get(k) for k in allowed_keys}
            placeholders = ', '.join('?' for _ in hist_row)
            columns = ', '.join(hist_row.keys())
            values = list(hist_row.values())
            c.execute(
                f"INSERT OR REPLACE INTO element_summary_history_past ({columns}) VALUES ({placeholders})",
                values
            )

        conn.commit()
        time.sleep(delay)  # Be polite to the FPL API

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database', 'fpl_data.db')
CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'expected_data', 'scout_table.csv')
CSV_XMINS_PATH = os.path.join(os.path.dirname(__file__), '..', 'expected_data', 'scout_table_xmins.csv')

def find_player_id(conn, web_name, element_type):
    cur = conn.cursor()
    # Try exact web_name match first
    cur.execute("""
        SELECT id, web_name, first_name, second_name FROM elements
        WHERE web_name = ? AND element_type = ?
    """, (web_name, element_type))
    result = cur.fetchone()
    if result:
        return result[0]

    # Try matching with first_name, second_name, or combinations
    cur.execute("""
        SELECT id, web_name, first_name, second_name FROM elements
        WHERE element_type = ?
    """, (element_type,))
    candidates = cur.fetchall()
    for candidate in candidates:
        cid, c_web, c_first, c_second = candidate
        names_to_try = [
            c_web,
            c_first,
            c_second,
            f"{c_first} {c_second}".strip(),
            f"{c_first[0]}. {c_second}".strip() if c_first else None
        ]
        for name in names_to_try:
            if name and name.lower().replace('.', '').replace('-', ' ').replace('  ', ' ').strip() == web_name.lower().replace('.', '').replace('-', ' ').replace('  ', ' ').strip():
                return cid
    return None

def update_player_from_csv(conn, row):
    web_name = row['Name'].strip()
    position = row['Position'].strip()
    position_map = {'GK': 1, 'DEF': 2, 'MID': 3, 'FWD': 4}
    element_type = position_map.get(position)
    if not element_type:
        print(f"Unknown position: {position} for {web_name}")
        return

    player_id = find_player_id(conn, web_name, element_type)
    if not player_id:
        print(f"No match for {web_name} ({position})")
        return

    update_fields = {
        'predicted_points_next5': row['Total'],
        'pp_next5_per_m': row['Points/£M'],
        'elite_selected_percent': row['Elite%'],
    }
    for i in range(1, 6):
        gw_col = f'GW{i}'
        db_col = f'pp_gw_{i}'
        update_fields[db_col] = row[gw_col]

    set_clause = ', '.join([f"{col} = ?" for col in update_fields])
    values = list(update_fields.values())
    values.append(player_id)
    sql = f"UPDATE elements SET {set_clause} WHERE id = ?"
    cur = conn.cursor()
    cur.execute(sql, values)
    conn.commit()

def update_player_xmins_from_csv(conn, row):
    web_name = row['Name'].strip()
    position = row['Position'].strip()
    position_map = {'GK': 1, 'DEF': 2, 'MID': 3, 'FWD': 4}
    element_type = position_map.get(position)
    if not element_type:
        print(f"Unknown position: {position} for {web_name}")
        return

    player_id = find_player_id(conn, web_name, element_type)
    if not player_id:
        print(f"No match for {web_name} ({position}) in xmins")
        return

    update_fields = {
        'predicted_xmins_next5': row['Total'],
        'pxm_next5_per_m': row['xMins/£M'],
        'elite_selected_percent': row['Elite%'],
    }
    for i in range(1, 6):
        gw_col = f'GW{i}'
        db_col = f'xmins_gw_{i}'
        update_fields[db_col] = row[gw_col]

    set_clause = ', '.join([f"{col} = ?" for col in update_fields])
    values = list(update_fields.values())
    values.append(player_id)
    sql = f"UPDATE elements SET {set_clause} WHERE id = ?"
    cur = conn.cursor()
    cur.execute(sql, values)
    conn.commit()

def main():
    # Run the expected data update script first
    update_script_path = os.path.join(os.path.dirname(__file__), '..', 'expected_data', 'ut_update_expected_data.py')
    print(f"Running {update_script_path} ...")
    subprocess.run(['python3', update_script_path], check=True)
    print("Expected data update script completed.")

    # --- Move any CSV and TXT files created in this folder to ../expected_data ---
    this_dir = os.path.dirname(os.path.abspath(__file__))
    expected_data_dir = os.path.abspath(os.path.join(this_dir, '..', 'expected_data'))
    for fname in os.listdir(this_dir):
        if fname.endswith('.csv') or fname.endswith('.txt'):
            src = os.path.join(this_dir, fname)
            dst = os.path.join(expected_data_dir, fname)
            shutil.move(src, dst)
            print(f"Moved {src} to {dst}")

    data = fetch_bootstrap()
    fixtures = fetch_fixtures()
    
    # Ensure the database is created in backend/database
    db_dir = os.path.join(os.path.dirname(__file__), '..', 'database')
    os.makedirs(db_dir, exist_ok=True)
    db_path = os.path.join(db_dir, "fpl_data.db")
    
    # --- Backup existing DB if it exists ---
    if os.path.exists(db_path):
        today_str = datetime.now().strftime("%d_%m_%Y")
        backup_path = os.path.join(db_dir, f"fpl_data.db.backup.{today_str}")
        shutil.copy2(db_path, backup_path)
        print(f"Backup created at {backup_path}")

    conn = sqlite3.connect(db_path)
    create_tables(conn)
    print(f"inserting events...")
    insert_events(conn, data["events"])
    print(f"inserting phases...")
    insert_phases(conn, data["phases"])
    print(f"inserting teams...")
    insert_teams(conn, data["teams"])
    print(f"inserting elements...")
    insert_elements(conn, data["elements"])
    print(f"inserting fixtures...")
    insert_fixtures(conn, fixtures)

    # Populate element summary tables
    element_ids = [e["id"] for e in data["elements"]]
    print(f"inserting element summary data for {len(element_ids)} element ids...")
    insert_element_summary_data(conn, element_ids)

    conn.close()
    print(f"Database created and populated at {db_path}.")

    # Update player data from scout_table.csv
    conn = sqlite3.connect(DB_PATH)
    with open(CSV_PATH, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            update_player_from_csv(conn, row)
    print("Scout table data populated.")

    # Update player xmins data from scout_table_xmins.csv
    with open(CSV_XMINS_PATH, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            update_player_xmins_from_csv(conn, row)
    conn.close()
    print("Scout table xmins data populated.")

if __name__ == "__main__":
    main()