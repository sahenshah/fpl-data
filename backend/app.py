# backend/app.py
from flask import Flask, jsonify, send_from_directory, make_response, request
from flask_cors import CORS
import requests
import os
import pandas as pd

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains on all routes

# Serve static files from backend/team-badges at /backend/team-badges/
BADGES_DIR = os.path.join(os.path.dirname(__file__), 'team-badges')

@app.route('/backend/team-badges/<path:filename>')
def team_badge(filename):
    response = make_response(send_from_directory(BADGES_DIR, filename))
    response.headers['Cache-Control'] = 'public, max-age=31536000'
    return response

@app.route('/api/hello')
def hello():
    return jsonify(message='Hello from Flask!')

@app.route('/api/bootstrap-static')
def bootstrap_static():
    """Fetch FPL bootstrap data from the official API and return as JSON."""
    url = 'https://fantasy.premierleague.com/api/bootstrap-static/'
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fixtures')
def fixtures():
    """Fetch FPL fixtures data from the official API and return as JSON."""
    url = 'https://fantasy.premierleague.com/api/fixtures/'
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/element-summary/<int:player_id>')
def element_summary(player_id):
    """Fetch FPL player summary data from the official API and return as JSON."""
    url = f'https://fantasy.premierleague.com/api/element-summary/{player_id}/'
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/event/<int:gw>/live')
def event_live(gw):
    """Fetch FPL live event data for a gameweek from the official API and return as JSON."""
    url = f'https://fantasy.premierleague.com/api/event/{gw}/live/'
    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

# Load CSV once at startup
fpl_data = pd.read_csv('cleaned_fpl_data.csv')
fpl_data_xmins = pd.read_csv('cleaned_fpl_data_xmins.csv')

@app.route('/api/csv-predicted-points')
def csv_predicted_points():
    player_name = request.args.get('name')
    gw = request.args.get('gw')  # e.g. 'GW1', 'GW2', etc.
    if not player_name or not gw:
        return jsonify({'error': 'Missing name or gw'}), 400
    row = fpl_data[fpl_data['Name'].str.lower() == player_name.lower()]
    if row.empty or gw not in fpl_data.columns:
        return jsonify({'predicted_points': None})
    predicted = float(row.iloc[0][gw])
    return jsonify({'predicted_points': predicted})

@app.route('/api/csv-predicted-xmins')
def csv_predicted_xmins():
    player_name = request.args.get('name')
    gw = request.args.get('gw')  # e.g. 'GW1', 'GW2', etc.
    if not player_name or not gw:
        return jsonify({'error': 'Missing name or gw'}), 400
    row = fpl_data_xmins[fpl_data_xmins['Name'].str.lower() == player_name.lower()]
    if row.empty or gw not in fpl_data_xmins.columns:
        return jsonify({'predicted_xmins': None})
    predicted = float(row.iloc[0][gw])
    return jsonify({'predicted_xmins': predicted})

@app.route('/api/player-csv-summary')
def player_csv_summary():
    player_name = request.args.get('name')
    if not player_name:
        return jsonify({'error': 'Missing name'}), 400
    # Normalize names for matching
    row = fpl_data[fpl_data['Name'].str.lower().str.replace('.', '') == player_name.lower().replace('.', '')]
    if row.empty:
        return jsonify({'total': None, 'points_per_m': None, 'elite_percent': None})
    r = row.iloc[0]
    return jsonify({
        'total': r['Total'],
        'points_per_m': r['Points/£M'],
        'elite_percent': r['Elite%']
    })

@app.route('/api/player-csv-xmins-summary')
def player_csv_xmins_summary():
    player_name = request.args.get('name')
    if not player_name:
        return jsonify({'error': 'Missing name'}), 400
    row = fpl_data_xmins[fpl_data_xmins['Name'].str.lower().str.replace('.', '') == player_name.lower().replace('.', '')]
    if row.empty:
        return jsonify({'total': None, 'xmins_per_m': None, 'elite_percent': None})
    r = row.iloc[0]
    return jsonify({
        'total': float(r['Total']) if pd.notnull(r['Total']) else None,
        'xmins_per_m': float(r['xMins/£M']) if pd.notnull(r['xMins/£M']) else None,
        'elite_percent': str(r['Elite%']) if pd.notnull(r['Elite%']) else None
    })

if __name__ == '__main__':
    app.run(debug=True)
