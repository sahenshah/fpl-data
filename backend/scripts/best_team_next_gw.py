import sqlite3
import pandas as pd
import pulp
import sys

DB_PATH = '../database/fpl_data.db'
POSITION_MAP = {1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD'}

def get_next_gw(conn):
    cur = conn.cursor()
    cur.execute("SELECT MIN(id) FROM events WHERE finished = 0")
    row = cur.fetchone()
    if row and row[0]:
        return row[0]
    else:
        print("No upcoming gameweek found in events table.")
        sys.exit(1)

def fetch_players_df(conn, gw):
    col = f"pp_gw_{gw}"
    df = pd.read_sql_query(
        f"""
        SELECT id, web_name, element_type, team, now_cost, {col} as predicted_points
        FROM elements
        WHERE {col} IS NOT NULL
        """, conn
    )
    df["position"] = df["element_type"].map(POSITION_MAP)
    df["price"] = df["now_cost"] / 10.0
    df["name"] = df["web_name"]
    return df[["id", "name", "team", "position", "price", "predicted_points"]].reset_index(drop=True)

def build_optimal_team_with_captain(players, budget=100.0):
    # players: DataFrame with [name, team, position, price, predicted_points]
    x = pulp.LpVariable.dicts("select", players.index, 0, 1, cat="Binary")  # Squad
    y = pulp.LpVariable.dicts("start", players.index, 0, 1, cat="Binary")   # Starters
    c = pulp.LpVariable.dicts("captain", players.index, 0, 1, cat="Binary") # Captain
    v = pulp.LpVariable.dicts("vice", players.index, 0, 1, cat="Binary")    # Vice

    prob = pulp.LpProblem("FPL_Team_Selection", pulp.LpMaximize)

    # Objective: predicted points with captain boost
    prob += pulp.lpSum(players.loc[i, "predicted_points"] * y[i] for i in players.index) + \
            pulp.lpSum(players.loc[i, "predicted_points"] * c[i] for i in players.index)

    # Budget constraint
    prob += pulp.lpSum(players.loc[i, "price"] * x[i] for i in players.index) <= budget

    # Squad size
    prob += pulp.lpSum(x[i] for i in players.index) == 15

    # Position constraints
    for pos, num in {"GK":2, "DEF":5, "MID":5, "FWD":3}.items():
        prob += pulp.lpSum(x[i] for i in players.index if players.loc[i, "position"] == pos) == num

    # Club constraint
    for team in players["team"].unique():
        prob += pulp.lpSum(x[i] for i in players.index if players.loc[i, "team"] == team) <= 3

    # Starting XI
    prob += pulp.lpSum(y[i] for i in players.index) == 11
    prob += pulp.lpSum(y[i] for i in players.index if players.loc[i, "position"] == "GK") == 1
    prob += pulp.lpSum(y[i] for i in players.index if players.loc[i, "position"] == "DEF") >= 3
    prob += pulp.lpSum(y[i] for i in players.index if players.loc[i, "position"] == "FWD") >= 1

    # Starters must be selected
    for i in players.index:
        prob += y[i] <= x[i]

    # Captain & Vice constraints
    prob += pulp.lpSum(c[i] for i in players.index) == 1
    prob += pulp.lpSum(v[i] for i in players.index) == 1

    for i in players.index:
        prob += c[i] <= y[i]   # captain must be starter
        prob += v[i] <= y[i]   # vice must be starter
        prob += c[i] + v[i] <= 1  # cannot be both

    # Solve
    prob.solve(pulp.PULP_CBC_CMD(msg=False))

    squad = [players.loc[i, "name"] for i in players.index if pulp.value(x[i]) == 1]
    starters = [players.loc[i, "name"] for i in players.index if pulp.value(y[i]) == 1]
    captain = [players.loc[i, "name"] for i in players.index if pulp.value(c[i]) == 1][0]
    vice = [players.loc[i, "name"] for i in players.index if pulp.value(v[i]) == 1][0]

    return squad, starters, captain, vice

def main():
    conn = sqlite3.connect(DB_PATH)
    gw = get_next_gw(conn)
    print(f"Building best team for GW{gw}...")

    players = fetch_players_df(conn, gw)
    if players.empty:
        print("No player data found for next gameweek.")
        sys.exit(1)

    squad, starters, captain, vice = build_optimal_team_with_captain(players)

    print("\nBest Squad (15):")
    for name in squad:
        row = players[players["name"] == name].iloc[0]
        print(f"{row['position']:>3} {row['name']:<18} £{row['price']:.1f} pts:{row['predicted_points']:.2f}")

    print("\nStarting 11:")
    for name in starters:
        row = players[players["name"] == name].iloc[0]
        print(f"{row['position']:>3} {row['name']:<18} £{row['price']:.1f} pts:{row['predicted_points']:.2f}")

    print(f"\nCaptain: {captain}")
    print(f"Vice: {vice}")

    total_cost = players[players["name"].isin(squad)]["price"].sum()
    total_points = players[players["name"].isin(starters)]["predicted_points"].sum() + \
                   players[players["name"] == captain]["predicted_points"].values[0]
    print(f"\nTotal cost: £{total_cost:.1f}m")
    print(f"Starting 11 points (with captain): {total_points:.2f}")

if __name__ == "__main__":
    main()