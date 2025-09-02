## Update Site Data Process ##

1. cd ../expected_data

2. mv projections.csv ../archive/projection_backup_DD_MM_YYYY.csv

3. Download projections.csv from solio analytics to backend/expected_data

4. run: python3 populate_fpl_database.py
    - press y to run scraper and update scout tables from fpl_review when prompted (N to skip)
    - press y to update database with element data from fpl api when prompted (N to skip)

5. run: python3 export_tables_to_json.py

6. manually move static_json folder from current folder to frontend/public folder
