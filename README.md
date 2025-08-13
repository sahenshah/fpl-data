# FPL Data Dashboard

This project is a Fantasy Premier League (FPL) data dashboard built with React and Python (Flask). It visualizes both historical player statistics and predicted metrics for upcoming gameweeks, using a pre-populated SQLite database (`fpl_data.db`) as the data source for the backend API and frontend.

## Features

- Interactive player table with sorting, filtering, and search
- Predicted points chart for selected or filtered players
- Player detail modal with team badge and stats
- Main data gathered from FPL API
- Data enrichment from backend CSVs via scripts
- Responsive design for desktop and mobile

## Tech Stack

- **Frontend:** React, TypeScript, MUI (Material UI), MUI X Charts
- **Backend:** Python, Flask, Pandas
- **Data:** `fpl_data.db` (populated from CSVs and FPL API via scripts)

## How It Works

1. **Data Population:**  
   Scripts are used to fetch and process data from the FPL API and CSV files, then populate the `fpl_data.db` SQLite database.
2. **Backend:**  
   The Flask backend serves API endpoints that read from `fpl_data.db`.
3. **Frontend:**  
   The React frontend fetches data from the backend API and displays interactive tables, charts, and player details.

## Setup

### Backend

1. **Install dependencies:**
    ```sh
    pip install -r requirements.txt
    ```
2. **Populate the database:**  
   Run the scripts to fetch/process data and build `fpl_data.db`:
    ```sh
    python backend/scripts/populate_fpl_database.py
    ```
3. **Run the Flask server:**
    ```sh
    python backend/app.py
    ```

### Frontend

1. **Install dependencies:**
    ```sh
    npm install
    ```
2. **Start the React app:**
    ```sh
    npm start
    ```
3. **(Optional) Run in dev mode:**
    ```sh
    npm run dev
    ```

## Usage

- Filter players by position, team, minutes, cost, or name.
- Click a player for detailed stats and fixture projections.
- View predicted points for the next 5 gameweeks in the chart above the table.

## API Endpoints

- `/api/fpl_data/events`  
- `/api/fpl_data/element-summary-fixtures/<player_id>`  
- `/api/fpl_data/element-summary-history/<player_id>`  
- `/api/fpl_data/fixtures`  
- ...and more (see backend code for full list)

All endpoints read from the pre-populated `fpl_data.db` database.

## Customization

- Update or add new data to the CSVs or scripts, then re-run the population scripts to refresh the database.
- Adjust chart and table columns in the frontend as needed.

## Notes

- The app **only reads** from the database at runtime.  
- To update data, re-run the population scripts to rebuild `fpl_data.db`.

## License

MIT