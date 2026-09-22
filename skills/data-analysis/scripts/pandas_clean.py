"""
Safe snippet for basic pandas cleaning. Copy and adapt for your dataset.
Run: python pandas_clean.py  (ensure pandas is installed)
"""
import sys

import pandas as pd

try:
    # Load (adjust path and kwargs as needed)
    df = pd.read_csv("data.csv")  # or read_json, read_excel
except FileNotFoundError:
    print("Error: data.csv not found. Make sure the file exists.", file=sys.stderr)
    sys.exit(1)
except PermissionError:
    print("Error: Permission denied when reading data.csv.", file=sys.stderr)
    sys.exit(1)
except pd.errors.ParserError as e:
    print(f"Error: Could not parse data.csv: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error: Unexpected error reading data.csv: {e}", file=sys.stderr)
    sys.exit(1)

print("df_shape", df.shape)
print("df_dtypes", df.dtypes)

# Drop fully null columns
df = df.dropna(axis=1, how="all")
print("df_shape_after_drop_all_null_cols", df.shape)

# Fill or drop nulls in key columns (customise columns)
# df = df.dropna(subset=["required_col"])
# df["optional_col"] = df["optional_col"].fillna(0)

# Normalise column names (optional)
df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
print("df_columns", list(df.columns))

# Deduplicate (optional)
before = len(df)
df = df.drop_duplicates()
print("rows_dropped_duplicates", before - len(df))

# Sample output
print("df_head", df.head())
