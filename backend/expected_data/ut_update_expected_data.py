import shutil
import os
from datetime import datetime
import subprocess

# Always place CSV files in backend/expected_data/
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
expected_data_dir = os.path.join(project_root, "expected_data")
csv1 = os.path.join(expected_data_dir, "scout_table.csv")
csv2 = os.path.join(expected_data_dir, "scout_table_xmins.csv")
archive_dir = os.path.join(project_root, "archive")

# Ensure archive directory exists
os.makedirs(archive_dir, exist_ok=True)

# Date string
date_str = datetime.now().strftime("%d_%m_%Y")

# Archive filenames
csv1_archive = os.path.join(archive_dir, f"scout_table_{date_str}.csv")
csv2_archive = os.path.join(archive_dir, f"scout_table_xmins_{date_str}.csv")

# Archive the files if they exist
if os.path.exists(csv1):
    shutil.copy2(csv1, csv1_archive)
    print(f"Archived {csv1} to {csv1_archive}")
else:
    print(f"{csv1} not found, skipping archive.")

if os.path.exists(csv2):
    shutil.copy2(csv2, csv2_archive)
    print(f"Archived {csv2} to {csv2_archive}")
else:
    print(f"{csv2} not found, skipping archive.")

# Run the scraper
scraper_path = os.path.join(expected_data_dir, "scrape_fpl_review.py")
print("Running scrape_fpl_review.py...")
subprocess.run(["python3", scraper_path], check=True)