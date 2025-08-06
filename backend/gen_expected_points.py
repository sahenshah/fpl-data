from flask import Flask, jsonify
import requests
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

app = Flask(__name__)

bootstrap = requests.get('https://fantasy.premierleague.com/api/bootstrap-static/').json()
players = pd.DataFrame(bootstrap['elements'])
teams = pd.DataFrame(bootstrap['teams'])

# Collect per-fixture history for each player
history_rows = []
future_rows = []

for _, player in players.iterrows():
    summary = requests.get(f'https://fantasy.premierleague.com/api/element-summary/{player["id"]}/').json()
    # Historical data for training
    for h in summary['history']:
        history_rows.append({
            'player_id': player['id'],
            'fixture_id': h['fixture'],
            'web_name': player['web_name'],
            'element_type': player['element_type'],
            'team': player['team'],
            'opponent_team': h['opponent_team'],
            'is_home': h['was_home'],
            'difficulty': h['difficulty'],
            'kickoff_time': h['kickoff_time'],
            'form': float(player['form']),
            'now_cost': player['now_cost'],
            'minutes': h['minutes'],
            'goals_scored': h['goals_scored'],
            'assists': h['assists'],
            'clean_sheets': h['clean_sheets'],
            'points': h['total_points'],  # target for training
        })
    # Future fixtures for prediction
    for f in summary['fixtures']:
        future_rows.append({
            'player_id': player['id'],
            'fixture_id': f['id'],
            'web_name': player['web_name'],
            'element_type': player['element_type'],
            'team': player['team'],
            'opponent_team': f['team_a'] if f['is_home'] else f['team_h'],
            'is_home': f['is_home'],
            'difficulty': f['difficulty'],
            'kickoff_time': f['kickoff_time'],
            'form': float(player['form']),
            'now_cost': player['now_cost'],
            'minutes': 0,  # unknown for future
            'goals_scored': 0,
            'assists': 0,
            'clean_sheets': 0,
        })

history_df = pd.DataFrame(history_rows)
future_df = pd.DataFrame(future_rows)

# Merge team strengths for both history and future
for df in [history_df, future_df]:
    df.merge(
        teams[['id', 'strength', 'name', 'short_name']],
        left_on='team', right_on='id', suffixes=('', '_team')
    )
    df.rename(columns={'strength': 'strength_team'}, inplace=True)
    df.drop(columns=['id'], inplace=True)
    df.merge(
        teams[['id', 'strength', 'name', 'short_name']],
        left_on='opponent_team', right_on='id', suffixes=('', '_opponent')
    )
    df.rename(columns={'strength': 'strength_opponent'}, inplace=True)
    df.fillna(0, inplace=True)

features = [
    'form', 'now_cost', 'element_type', 'difficulty', 'is_home',
    'strength_team', 'strength_opponent', 'minutes', 'goals_scored', 'assists', 'clean_sheets'
]
X = history_df[features]
y = history_df['points']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Predict for future fixtures
future_df['predicted_points'] = model.predict(future_df[features])

# Save predictions to CSV
future_df[['player_id', 'fixture_id', 'predicted_points']].to_csv('predicted_points.csv', index=False)
