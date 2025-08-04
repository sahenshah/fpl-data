# backend/app.py
from flask import Flask, jsonify, send_from_directory, make_response
from flask_cors import CORS
import requests
import os

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

if __name__ == '__main__':
    app.run(debug=True)
