# FPL Data Dashboard

This project is a Fantasy Premier League (FPL) data dashboard built with React and Python (Flask) that visualizes both historical player statistics and predicted metrics for upcoming gameweeks, with projected points aggregated and evaluated from reputable online sources.

## Features

- Interactive player table with sorting, filtering, and search
- Predicted points chart for selected or filtered players
- Player detail modal with team badge and stats
- Data enrichment from backend CSV via API
- Responsive design for desktop and mobile

## Tech Stack

- **Frontend:** React, TypeScript, MUI (Material UI), MUI X Charts
- **Backend:** Python, Flask, Pandas
- **Data:** `scout_table.csv, scout_table_xmins.csv` (player stats and predictions)

## Setup

### Backend

1. Install dependencies:
    ```sh
    pip install flask pandas
    ```
2. Run ut_update_expected_data.py
    ```sh
    cd expected_data
    python ut_update_expected_data.py
    ```

3. Run the Flask server:
    ```sh
    python app.py
    ```

### Frontend

1. Install dependencies:
    ```sh
    npm install
    ```
2. Start the React app:
    ```sh
    npm start
    ```

## Usage

- Filter players by position, team, minutes, cost, or name.
- Click a player for detailed stats.
- View predicted points for the next 5 gameweeks in the chart above the table.

## API Endpoints

- `/api/csv-predicted-points?name=<player_name>&gw=<GW>`  
  Returns predicted points for a player for a specific gameweek.
- `/api/player-csv-summary?name=<player_name>`  
  Returns summary stats for a player.

## Customization

- Update `cleaned_fpl_data.csv` with new player data or predictions.
- Adjust chart and table columns in the frontend as needed.

## License

MIT

---
```# FPL Data Dashboard

This project is a Fantasy Premier League (FPL) data dashboard built with React and Python (Flask). It visualizes player statistics and predicted points for upcoming gameweeks using data from a cleaned CSV file.

## Features

- Interactive player table with sorting, filtering, and search
- Predicted points chart for selected or filtered players
- Player detail modal with team badge and stats
- Data enrichment from backend CSV via API
- Responsive design for desktop and mobile

## Tech Stack

- **Frontend:** React, TypeScript, MUI (Material UI), MUI X Charts
- **Backend:** Python, Flask, Pandas
- **Data:** `cleaned_fpl_data.csv` (player stats and predictions)

## Setup

### Backend

1. Install dependencies:
    ```sh
    pip install flask pandas
    ```
2. Run script to populate expected data
    ```sh
    python3 ./expected_data/ut_update_expected_data.py
    ```

3. Run the Flask server:
    ```sh
    python3 app.py
    ```

### Frontend

1. Install dependencies:
    ```sh
    npm install
    ```
2. Start the React app:
    ```sh
    npm start
    ```

## Usage

- Filter players by position, team, minutes, cost, or name.
- Click a player for detailed stats.
- View predicted points for the next 5 gameweeks in the chart above the table.

## API Endpoints

- `/api/csv-predicted-points?name=<player_name>&gw=<GW>`  
  Returns predicted points for a player for a specific gameweek.
- `/api/player-csv-summary?name=<player_name>`  
  Returns summary stats for a player.

## Customization

- Update `cleaned_fpl_data.csv` with new player data or predictions.
- Adjust chart and table columns in the frontend as needed.

## License

MIT