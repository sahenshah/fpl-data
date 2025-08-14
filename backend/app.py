# backend/app.py
from flask import Flask, jsonify, send_from_directory, make_response, request
from flask_cors import CORS
import requests
import os
import pandas as pd
import sqlalchemy
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains on all routes

# Serve static files from backend/team-badges at /backend/team-badges/
BADGES_DIR = os.path.join(os.path.dirname(__file__), 'team-badges')

# Serve React static files
FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(__file__), '.', 'dist')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    if path != "" and os.path.exists(os.path.join(FRONTEND_BUILD_DIR, path)):
        return send_from_directory(FRONTEND_BUILD_DIR, path)
    else:
        return send_from_directory(FRONTEND_BUILD_DIR, 'index.html')

# FPL API endpoints
FPL_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

@app.route('/api/bootstrap-static')
def bootstrap_static():
    """Fetch FPL bootstrap data from the official API and return as JSON."""
    url = 'https://fantasy.premierleague.com/api/bootstrap-static/'
    try:
        response = requests.get(url, headers=FPL_HEADERS, timeout=15)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fixtures')
def api_fixtures():
    """Fetch FPL fixtures data from the official API and return as JSON."""
    url = 'https://fantasy.premierleague.com/api/fixtures/'
    try:
        response = requests.get(url, headers=FPL_HEADERS, timeout=15)
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
        response = requests.get(url, headers=FPL_HEADERS, timeout=15)
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
        response = requests.get(url, headers=FPL_HEADERS, timeout=15)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/entry/<int:team_id>')
def entry(team_id):
    """Fetch FPL entry (team) data from the official API and return as JSON."""
    url = f'https://fantasy.premierleague.com/api/entry/{team_id}/'
    try:
        response = requests.get(url, headers=FPL_HEADERS, timeout=15)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/entry/<int:team_id>/history')
def entry_history(team_id):
    """Fetch FPL entry (team) history data from the official API and return as JSON."""
    url = f'https://fantasy.premierleague.com/api/entry/{team_id}/history/'
    try:
        response = requests.get(url, headers=FPL_HEADERS, timeout=15)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.RequestException as e:
        return jsonify({'error': str(e)}), 500

# fpl_data.db endpoints
engine = sqlalchemy.create_engine('sqlite:///database/fpl_data.db')

@app.route('/api/fpl_data/players')
def players():
    """Fetch player data from the fpl_data.db SQLite database and return as JSON."""
    try:
        df = pd.read_sql('SELECT * FROM elements', engine)
        data = df.to_dict(orient='records')
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fpl_data/teams')
def teams():
    """Fetch team data from the fpl_data.db SQLite database and return as JSON."""
    try:
        df = pd.read_sql('SELECT * FROM teams', engine)
        data = df.to_dict(orient='records')
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fpl_data/events')
def events():
    """Fetch event data from the fpl_data.db SQLite database and return as JSON."""
    try:
        df = pd.read_sql('SELECT * FROM events', engine)
        data = df.to_dict(orient='records')
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fpl_data/element-summary-fixtures/<int:player_id>')
def element_summary_fixtures(player_id):
    """Fetch detailed player data from the fpl_data.db SQLite database and return as JSON."""
    try:
        df = pd.read_sql(f'SELECT * FROM element_summary_fixtures WHERE element_id = {player_id}', engine)
        if df.empty:
            return jsonify({'error': 'Player not found'}), 404
        data = df.to_dict(orient='records')
        return jsonify({'fixtures': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fpl_data/element-summary-history/<int:player_id>')
def element_summary_history(player_id):
    """Fetch detailed player history from the fpl_data.db SQLite database and return as JSON."""
    try:
        df = pd.read_sql(f'SELECT * FROM element_summary_history_past WHERE element_id = {player_id}', engine)
        if df.empty:
            return jsonify({'error': 'Player not found'}), 404
        data = df.to_dict(orient='records')
        return jsonify({'history_past': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fpl_data/fixtures')
def db_fixtures():
    """Fetch fixture data from the fpl_data.db SQLite database and return as JSON."""
    try:
        df = pd.read_sql('SELECT * FROM fixtures', engine)
        data = df.to_dict(orient='records')
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fpl_data/bootstrap-static')
def db_bootstrap_static():
    """Return bootstrap-static-like data from the local fpl_data.db database."""
    try:
        teams = pd.read_sql('SELECT * FROM teams', engine).replace({np.nan: None}).to_dict(orient='records')
        elements = pd.read_sql('SELECT * FROM elements', engine).replace({np.nan: None}).to_dict(orient='records')
        events = pd.read_sql('SELECT * FROM events', engine).replace({np.nan: None}).to_dict(orient='records')
        phases = pd.read_sql('SELECT * FROM phases', engine).replace({np.nan: None}).to_dict(orient='records')
        data = {
            "teams": teams,
            "elements": elements,
            "events": events,
            "phases": phases,
            "total_players": len(elements)
        }
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)