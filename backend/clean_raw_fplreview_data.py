import pandas as pd

def clean_raw_file(filename):
    with open(filename, 'r') as file:
        lines = [line.strip() for line in file.readlines() if line.strip()]

    cleaned_rows = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Check if this line is a player name (no digits)
        if not any(char.isdigit() for char in line):
            name = line
            i += 2  # Skip to data row (skip MD 14.5 etc.)
            data_line = lines[i].replace("Submit", "").strip()
            data_parts = data_line.split('\t')
            cleaned_rows.append([name] + data_parts)
        i += 1
    return cleaned_rows

# Define column names
columns = ['Name', 'xMins', 'GW1', 'GW2', 'GW3', 'GW4', 'GW5', 'Total', 'Points/£M', 'Elite%']

# Clean raw_data.txt
cleaned_rows_main = clean_raw_file('raw_data.txt')
df_main = pd.DataFrame(cleaned_rows_main, columns=columns)
df_main.to_csv('cleaned_fpl_data.csv', index=False)
print("Cleaned data saved to cleaned_fpl_data.csv")

# Clean raw_data_xmins.txt
cleaned_rows_xmins = clean_raw_file('raw_data_xmins.txt')
df_xmins = pd.DataFrame(cleaned_rows_xmins, columns=columns)
df_xmins.to_csv('cleaned_fpl_data_xmins.csv', index=False)
print("Cleaned data saved to cleaned_fpl_data_xmins.csv")
