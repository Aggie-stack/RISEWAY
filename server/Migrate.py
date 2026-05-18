"""
migrate.py — run once to add admission_number and membership_no to the students table.

Usage:
    python migrate.py
"""

from database import get_db

def run():
    conn = get_db()

    # Add columns if they don't already exist (safe to re-run)
    for col, definition in [
        ("admission_number",  "TEXT DEFAULT ''"),
        ("membership_no", "TEXT DEFAULT ''"),
    ]:
        try:
            conn.execute(f"ALTER TABLE students ADD COLUMN {col} {definition}")
            print(f"✅ Added column: {col}")
        except Exception as e:
            # Column already exists — skip silently
            print(f"⚠️  Skipped {col}: {e}")

    # Backfill admission_number for all existing students that don't have one
    rows = conn.execute(
        "SELECT id FROM students WHERE admission_number IS NULL OR admission_number = ''"
    ).fetchall()

    for row in rows:
        adm = f"RTC-{str(row['id']).zfill(4)}"
        conn.execute(
            "UPDATE students SET admission_number = ? WHERE id = ?",
            (adm, row["id"]),
        )

    conn.commit()
    conn.close()
    print(f"✅ Backfilled admission_number for {len(rows)} existing student(s).")
    print("Migration complete.")

if __name__ == "__main__":
    run()