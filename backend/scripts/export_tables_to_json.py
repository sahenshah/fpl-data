import pandas as pd
import sqlalchemy
import os
import numpy as np
import json

engine = sqlalchemy.create_engine('sqlite:///../database/fpl_data.db')
output_dir = 'static_json'
os.makedirs(output_dir, exist_ok=True)

tables = [
    'elements',
    'teams',
    'events',
    'phases',
    'fixtures',
    'element_summary_fixtures',
    'element_summary_history_past',
    'element_summary_history'
]

for table in tables:
    try:
        df = pd.read_sql(f'SELECT * FROM {table}', engine)
        data = df.replace({np.nan: None}).to_dict(orient='records')
        with open(os.path.join(output_dir, f'{table}.json'), 'w') as f:
            json.dump(data, f, indent=2)
        print(f"Exported {table} to {output_dir}/{table}.json")
    except Exception as e:
        print(f"Error exporting {table}: {e}")

# Export last_predicted_gw.json using the same logic as the Flask endpoint
try:
    with engine.connect() as conn:
        columns = pd.read_sql("PRAGMA table_info(elements)", conn)
    pp_gw_cols = [col for col in columns['name'] if col.startswith('pp_gw_')]
    gw_numbers = sorted(
        [int(col.split('_')[-1]) for col in pp_gw_cols if col.split('_')[-1].isdigit()],
        reverse=True
    )
    last_predicted_gw = None
    with engine.connect() as conn:
        for gw in gw_numbers:
            col = f"pp_gw_{gw}"
            result = conn.execute(sqlalchemy.text(f"SELECT 1 FROM elements WHERE {col} IS NOT NULL LIMIT 1")).fetchone()
            if result:
                last_predicted_gw = gw
                break
    last_predicted_gw_data = {"last_predicted_gw": last_predicted_gw}
    with open(os.path.join(output_dir, 'last_predicted_gw.json'), 'w') as f:
        json.dump(last_predicted_gw_data, f, indent=2)
    print(f"Exported last_predicted_gw to {output_dir}/last_predicted_gw.json")
except Exception as e:
    print(f"Error exporting last_predicted_gw: {e}")