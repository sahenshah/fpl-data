from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from bs4 import BeautifulSoup
from selenium.webdriver.support.ui import Select
import time
import re
import random

# TEAM_ID = str(random.randint(1, 1000000))
TEAM_ID = 1

options = Options()
# options.add_argument("--headless")  # Comment this out for debugging
driver = webdriver.Chrome(options=options)
driver.get("https://fplreview.com/free-planner/#")

# Dismiss cookie popup if present
try:
    accept_btn = WebDriverWait(driver, 5).until(
        EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Accept All')]"))
    )
    accept_btn.click()
except Exception:
    pass

# Enter Team ID
WebDriverWait(driver, 10).until(
    EC.presence_of_element_located((By.ID, "liveTeamID"))
)
team_input = driver.find_element(By.ID, "liveTeamID")
team_input.clear()
team_input.send_keys(TEAM_ID)

# Submit the form (or click the button via JS)
try:
    form = driver.find_element(By.XPATH, "//form[@action='#teamProjections']")
    form.submit()
except Exception:
    load_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Load Page')]")
    driver.execute_script("arguments[0].click();", load_button)

# Wait for results to load
WebDriverWait(driver, 20).until(
    EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Projected Points Table')]"))
)

# Wait for the scout table to load initially
WebDriverWait(driver, 40).until(
    EC.presence_of_element_located((By.XPATH, "//table[@id='scout_table']//tbody//td"))
)

# Refresh the page
driver.refresh()

# Wait for the page and scout table to load again after refresh
WebDriverWait(driver, 20).until(
    EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Projected Points Table')]"))
)
WebDriverWait(driver, 40).until(
    EC.presence_of_element_located((By.XPATH, "//table[@id='scout_table']//tbody//td"))
)

# Now select "All Players" in the group dropdown
group_dropdown = Select(driver.find_element(By.ID, "myGroup"))
group_dropdown.select_by_visible_text("All Players")

# Wait for the table to reload with new data
WebDriverWait(driver, 40).until(
    EC.presence_of_element_located((By.XPATH, "//table[@id='scout_table']//tbody//td"))
)

# Wait for at least one row in the scout_table's tbody
def tbody_has_rows(driver):
    try:
        table = driver.find_element(By.ID, "scout_table")
        driver.execute_script("arguments[0].scrollIntoView(true);", table)
        tbody = table.find_element(By.TAG_NAME, "tbody")
        rows = tbody.find_elements(By.TAG_NAME, "tr")
        return len(rows) > 0
    except Exception:
        return False

try:
    WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.XPATH, "//table[@id='scout_table']//tbody//td"))
    )
except TimeoutException as e:
    print("Timeout waiting for scout_table cells:", e)
    driver.quit()
    exit(1)

# Scrape the data
html = driver.page_source
soup = BeautifulSoup(html, "html.parser")
scout_table = soup.find("table", {"id": "scout_table"})

# Scrape header row from the table
thead = scout_table.find("thead")
if thead:
    header_row = thead.find("tr")
    header_cells = header_row.find_all(["th", "td"])
    header_texts = [cell.get_text(strip=True) for cell in header_cells]
else:
    # If no thead, use the first row of tbody as header
    rows = scout_table.find("tbody").find_all("tr")
    if rows:
        header_cells = rows[0].find_all(["th", "td"])
        header_texts = [cell.get_text(strip=True) for cell in header_cells]
    else:
        header_texts = []

# If less than 5 columns, click the "Toggle Detailed Gameweek Data" checkbox and reload the table
if len(header_texts) < 5:
    print("Less than 5 columns detected, toggling detailed gameweek data...")
    checker = driver.find_element(By.ID, "checker")
    if not checker.is_selected():
        checker.click()
        # Wait for the table to reload
        WebDriverWait(driver, 40).until(
            EC.presence_of_element_located((By.XPATH, "//table[@id='scout_table']//tbody//td"))
        )
        # Re-parse the table after toggling
        html = driver.page_source
        soup = BeautifulSoup(html, "html.parser")
        scout_table = soup.find("table", {"id": "scout_table"})
        # Re-extract headers
        thead = scout_table.find("thead")
        if thead:
            header_row = thead.find("tr")
            header_cells = header_row.find_all(["th", "td"])
            header_texts = [cell.get_text(strip=True) for cell in header_cells]
        else:
            rows = scout_table.find("tbody").find_all("tr")
            if rows:
                header_cells = rows[0].find_all(["th", "td"])
                header_texts = [cell.get_text(strip=True) for cell in header_cells]
            else:
                header_texts = []
else:
    print(f"Header length: {len(header_texts)}")

# Skip all leading empty header cells
non_empty_headers = [h for h in header_texts if h.strip() != ""]
header_points = ["Name", "Position", "Price"] + non_empty_headers
header_points_line = ",".join(header_points) + "\n"
header_xmins = ["Name", "Position", "Price"] + non_empty_headers 
header_xmins_line = ",".join(header_xmins) + "\n"

# Now use header_points_line as the header for both txt and csv
with open("scout_table.txt", "w", encoding="utf-8") as txt_file, \
     open("scout_table.csv", "w", encoding="utf-8") as csv_file:
    txt_file.write(header_points_line)
    csv_file.write(header_points_line)
    # Scrape data rows
    rows = scout_table.find("tbody").find_all("tr")
    for row in rows:
        cells = row.find_all(["th", "td"])
        cell_texts = [cell.get_text(strip=True) for cell in cells]
        txt_file.write("\t".join(cell_texts) + "\n")
        line = ",".join(cell_texts).rstrip(",") + "\n"
        csv_file.write(line)

# Click the "xMins" button to change the view
xmins_button = driver.find_element(By.ID, "XMINopt")
driver.execute_script("arguments[0].click();", xmins_button)

# Wait for the scout table to reload (wait for any <td> to appear)
WebDriverWait(driver, 40).until(
    EC.presence_of_element_located((By.XPATH, "//table[@id='scout_table']//tbody//td"))
)

# Scrape the scout table again
html_xmins = driver.page_source
soup_xmins = BeautifulSoup(html_xmins, "html.parser")
scout_table_xmins = soup_xmins.find("table", {"id": "scout_table"})

if scout_table_xmins:
    with open("scout_table_xmins.txt", "w", encoding="utf-8") as txt_file:
        # Scrape header row
        thead_xmins = scout_table_xmins.find("thead")
        if thead_xmins:
            header_row_xmins = thead_xmins.find("tr")
            header_cells_xmins = header_row_xmins.find_all(["th", "td"])
            header_texts_xmins = [cell.get_text(strip=True) for cell in header_cells_xmins]
            txt_file.write("\t".join(header_texts_xmins) + "\n")
        # Scrape data rows
        rows = scout_table_xmins.find("tbody").find_all("tr")
        for row in rows:
            cells = row.find_all(["th", "td"])
            cell_texts = [cell.get_text(strip=True) for cell in cells]
            txt_file.write("\t".join(cell_texts) + "\n")
else:
    with open("scout_table_xmins.txt", "w", encoding="utf-8") as txt_file:
        txt_file.write("Table not found after xMins click.")

def clean_row(cells):
    # Remove leading empty cell if present
    if cells and cells[0] == '':
        cells = cells[1:]
    if not cells or not cells[0].strip():
        return None
    first = cells[0]
    # Match Unicode names, position, and price
    match = re.match(r"([^\d,]+?)(MD|FW|DF|GK)\s*([\d\.]+)", first, re.UNICODE)
    position_map = {
        "GK": "GK",
        "DF": "DEF",
        "MD": "MID",
        "FW": "FWD"
    }
    if match:
        name = match.group(1).strip()
        position = position_map.get(match.group(2), match.group(2))
        price = match.group(3)
    else:
        # fallback: try to split manually
        name = first.strip()
        position = ""
        price = ""
    # The rest of the columns
    data = cells[1:]
    # Remove trailing % from Elite% column if present
    if data and data[-1].endswith('%'):
        data[-1] = data[-1].rstrip('%')
    return [name, position, price] + data

# Scrape and clean the first table
if scout_table:
    rows_added = 0
    with open("scout_table.txt", "w", encoding="utf-8") as txt_file, \
         open("scout_table.csv", "w", encoding="utf-8") as csv_file:
        txt_file.write(header_points_line)
        csv_file.write(header_points_line)
        rows = scout_table.find("tbody").find_all("tr")
        for row in rows:
            cells = [cell.get_text(strip=True) for cell in row.find_all(["th", "td"])]
            cleaned = clean_row(cells)
            if cleaned:
                line = ",".join(cleaned).rstrip(",") + "\n"
                txt_file.write(line)
                csv_file.write(line)
                rows_added += 1
    print(f"Added {rows_added} rows to scout_table.txt and scout_table.csv")

# Scrape and clean the xMins table
if scout_table_xmins:
    rows_added_xmins = 0
    with open("scout_table_xmins.txt", "w", encoding="utf-8") as txt_file, \
         open("scout_table_xmins.csv", "w", encoding="utf-8") as csv_file:
        txt_file.write(header_xmins_line)
        csv_file.write(header_xmins_line)
        rows = scout_table_xmins.find("tbody").find_all("tr")
        for row in rows:
            cells = [cell.get_text(strip=True) for cell in row.find_all(["th", "td"])]
            cleaned = clean_row(cells)
            if cleaned:
                line = ",".join(cleaned).rstrip(",") + "\n"
                txt_file.write(line)
                csv_file.write(line)
                rows_added_xmins += 1
    print(f"Added {rows_added_xmins} rows to scout_table_xmins.txt and scout_table_xmins.csv")

driver.quit()
