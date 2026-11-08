import os
from pathlib import Path

from tinydb import TinyDB


DEFAULT_DB_PATH = Path(__file__).parent / "data" / "suppliers.json"
DB_PATH = Path(os.environ.get("SUPPLIERS_DB_PATH", DEFAULT_DB_PATH))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
db = TinyDB(DB_PATH)
suppliers_table = db.table("suppliers")