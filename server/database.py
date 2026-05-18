"""
database.py – SQLite connection factory.

get_db() returns a new connection with row_factory set so that rows
behave like dicts (column access by name).
"""

import sqlite3
import os

DB_PATH = os.environ.get("DB_PATH", "riseway.db")


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def create_tables() -> None:
    """Create all tables if they don't already exist."""
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT    NOT NULL UNIQUE,
            password TEXT    NOT NULL,
            role     TEXT    NOT NULL DEFAULT 'receptionist'
        );

        CREATE TABLE IF NOT EXISTS students (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            admission_number TEXT UNIQUE,
            membership_card_number TEXT,
            name       TEXT    NOT NULL,
            phone      TEXT,
            email      TEXT    DEFAULT '',
            gender     TEXT,
            mode       TEXT,
            level      TEXT,
            course     TEXT,
            membership INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS payments (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            amount     REAL    NOT NULL,
            date_paid  TEXT    NOT NULL,
            duration   INTEGER NOT NULL,
            due_date   TEXT    NOT NULL,
            renewal_no TEXT    DEFAULT ''
        );
        """
    )
    conn.commit()
    conn.close()