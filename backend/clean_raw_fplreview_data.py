import pandas as pd

# Read raw file
with open('raw_data.txt', 'r') as file:
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
        
        # Append cleaned row
        cleaned_rows.append([name] + data_parts)
    i += 1

# Define column names
columns = ['Name', 'xMins', 'GW1', 'GW2', 'GW3', 'GW4', 'GW5', 'Total', 'Points/£M', 'Elite%']

# Create DataFrame
df = pd.DataFrame(cleaned_rows, columns=columns)

# Save to CSV
df.to_csv('cleaned_fpl_data.csv', index=False)

print("Cleaned data saved to cleaned_fpl_data.csv")
