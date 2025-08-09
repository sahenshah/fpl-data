import pandas as pd
import glob
import os

archive_dir = "../archive"

# --- Update scout_table_master.csv ---
master_path = "scout_table_master.csv"
csv_files = glob.glob(os.path.join(archive_dir, "scout_table_*.csv"))
if not csv_files:
    print("No scout_table_*.csv files found in archive.")
else:
    latest_csv = max(csv_files, key=os.path.getctime)
    print(f"Using latest file: {latest_csv}")

    latest_df = pd.read_csv(latest_csv)
    try:
        master_df = pd.read_csv(master_path)
    except FileNotFoundError:
        print("Master file not found, creating new master from latest.")
        latest_df.to_csv(master_path, index=False)
    else:
        # Add any new columns from latest to master
        for col in latest_df.columns:
            if col not in master_df.columns:
                master_df[col] = None

        # Add any columns from master to latest (to align)
        for col in master_df.columns:
            if col not in latest_df.columns:
                latest_df[col] = None

        # Set index to Name for easy update
        master_df.set_index("Name", inplace=True)
        latest_df.set_index("Name", inplace=True)

        # Update existing rows and columns
        for name in latest_df.index:
            if name in master_df.index:
                for col in latest_df.columns:
                    master_df.at[name, col] = latest_df.at[name, col]
            else:
                # New player, add to master
                master_df.loc[name] = latest_df.loc[name]

        # Reset index and save
        master_df.reset_index(inplace=True)
        master_df.to_csv(master_path, index=False)
        print(f"Master CSV updated: {master_path}")

# --- Update scout_table_xmins_master.csv ---
xmins_master_path = "scout_table_xmins_master.csv"
xmins_csv_files = glob.glob(os.path.join(archive_dir, "scout_table_xmins_*.csv"))
if not xmins_csv_files:
    print("No scout_table_xmins_*.csv files found in archive.")
else:
    latest_xmins_csv = max(xmins_csv_files, key=os.path.getctime)
    print(f"Using latest xmins file: {latest_xmins_csv}")

    latest_xmins_df = pd.read_csv(latest_xmins_csv)
    try:
        xmins_master_df = pd.read_csv(xmins_master_path)
    except FileNotFoundError:
        print("Xmins master file not found, creating new master from latest.")
        latest_xmins_df.to_csv(xmins_master_path, index=False)
    else:
        # Add any new columns from latest to master
        for col in latest_xmins_df.columns:
            if col not in xmins_master_df.columns:
                xmins_master_df[col] = None

        # Add any columns from master to latest (to align)
        for col in xmins_master_df.columns:
            if col not in latest_xmins_df.columns:
                latest_xmins_df[col] = None

        xmins_master_df.set_index("Name", inplace=True)
        latest_xmins_df.set_index("Name", inplace=True)
        for name in latest_xmins_df.index:
            if name in xmins_master_df.index:
                for col in latest_xmins_df.columns:
                    xmins_master_df.at[name, col] = latest_xmins_df.at[name, col]
            else:
                xmins_master_df.loc[name] = latest_xmins_df.loc[name]
        xmins_master_df.reset_index(inplace=True)
        xmins_master_df.to_csv(xmins_master_path, index=False)
        print(f"Xmins master CSV updated: {xmins_master_path}")