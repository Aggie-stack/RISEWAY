"""
models.py – thin data-access layer on top of SQLite.

Each function accepts / returns plain dicts so the Flask routes stay clean.
Due-date arithmetic uses dateutil.relativedelta so that "1 month from Jan 31"
lands on Feb 28 / Mar 28 correctly.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, date, timedelta
from typing import Optional

import bcrypt
from dateutil.relativedelta import relativedelta

from database import get_db


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row) if row else {}


def _compute_due_date(date_paid: str, duration: int) -> str:
    """Return YYYY-MM-DD string for date_paid + duration months."""
    base = datetime.strptime(date_paid, "%Y-%m-%d").date()
    return (base + relativedelta(months=duration)).strftime("%Y-%m-%d")


def _renewal_no(payment_id: int) -> str:
    return f"REC-{str(payment_id).zfill(4)}"


def _admission_number(student_id: int) -> str:
    """Generate admission number from student ID."""
    return f"RTC-{str(student_id).zfill(3)}"


def _student_status(due_date: Optional[str]) -> str:
    """
    Active     → due_date is today or in the future
    Expired    → due_date is in the past
    No Payment → no payment record exists
    """
    if not due_date:
        return "No Payment"
    try:
        d = datetime.strptime(due_date, "%Y-%m-%d").date()
        return "Active" if d >= date.today() else "Expired"
    except ValueError:
        return "No Payment"


# ══════════════════════════════════════════════════════════════════════════════
# Auth / Users
# ══════════════════════════════════════════════════════════════════════════════

def create_user(username: str, hashed_password: str, role: str) -> int:
    """Insert a new user row. Returns the new user's id."""
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        (username, hashed_password, role),
    )
    user_id = cur.lastrowid
    conn.commit()
    conn.close()
    return user_id


def get_user_by_username(username: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def update_user_password(user_id: int, new_hashed: str) -> None:
    """Store an already-hashed password (hashing is done in the caller)."""
    conn = get_db()
    conn.execute(
        "UPDATE users SET password = ? WHERE id = ?", (new_hashed, user_id)
    )
    conn.commit()
    conn.close()


def get_user_by_id(user_id: int) -> Optional[dict]:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


# ══════════════════════════════════════════════════════════════════════════════
# Students
# ══════════════════════════════════════════════════════════════════════════════

def _enrich_student(row: dict) -> dict:
    """Attach the latest payment data and computed status to a student row."""
    conn = get_db()
    pay = conn.execute(
        """
        SELECT id, amount, date_paid, duration, due_date, renewal_no
        FROM   payments
        WHERE  student_id = ?
        ORDER  BY id DESC
        LIMIT  1
        """,
        (row["id"],),
    ).fetchone()
    conn.close()

    pay = _row_to_dict(pay) if pay else {}
    row["payment_id"] = pay.get("id")
    row["amount"]     = pay.get("amount")
    row["date_paid"]  = pay.get("date_paid")
    row["duration"]   = pay.get("duration")
    row["due_date"]   = pay.get("due_date")
    row["renewal_no"] = pay.get("renewal_no")
    row["status"]     = _student_status(pay.get("due_date"))

    # Backfill admission_number for older rows that don't have one stored yet
    if not row.get("admission_number"):
        row["admission_number"] = _admission_number(row["id"])

    return row


def create_student(data: dict) -> Optional[dict]:
    conn = get_db()
    cur = conn.execute(
        """
        INSERT INTO students
            (admission_number, name, phone, email, gender, mode, level, course, membership, membership_no)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.get("admission_number"),
            data["name"],
            data.get("phone", ""),
            data.get("email", ""),
            data.get("gender"),
            data.get("mode"),
            data.get("level"),
            data.get("course", ""),
            1 if data.get("membership") else 0,
            data.get("membership_no", "") if data.get("membership") else "",
        ),
    )
    student_id = cur.lastrowid

    # Write the auto-generated admission number back to the row
    admission_number = _admission_number(student_id)
    conn.execute(
        "UPDATE students SET admission_number = ? WHERE id = ?",
        (admission_number, student_id),
    )
    conn.commit()
    conn.close()
    return get_student_by_id(student_id)


def get_all_students(search: Optional[str] = None) -> list[dict]:
    conn = get_db()
    if search:
        rows = conn.execute(
            """
            SELECT * FROM students
            WHERE  name         LIKE ? OR
                   phone        LIKE ? OR
                   course       LIKE ? OR
                   admission_number LIKE ?
            ORDER  BY id DESC
            """,
            (f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%"),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM students ORDER BY id DESC"
        ).fetchall()
    conn.close()
    return [_enrich_student(dict(r)) for r in rows]


def get_student_by_id(student_id: int) -> Optional[dict]:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM students WHERE id = ?", (student_id,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return _enrich_student(dict(row))


def get_student_by_admission_number(admission_number: str) -> Optional[dict]:
    """Look up a student by their admission number (e.g. RTC-001)."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM students WHERE admission_number = ?", (admission_number,)
    ).fetchone()
    conn.close()
    if not row:
        return None
    return _enrich_student(dict(row))


def update_student(student_id: int, data: dict) -> Optional[dict]:
    conn = get_db()
    conn.execute(
        """
        UPDATE students
        SET admission_number=?, name=?, phone=?, email=?, gender=?, mode=?, level=?,
            course=?, membership=?, membership_no=?
        WHERE id=?
        """,
        (
            data.get("admission_number"),
            data.get("name"),
            data.get("phone", ""),
            data.get("email", ""),
            data.get("gender"),
            data.get("mode"),
            data.get("level"),
            data.get("course"),
            1 if data.get("membership") else 0,
            data.get("membership_no", "") if data.get("membership") else "",
            student_id,
        ),
    )
    conn.commit()
    conn.close()
    return get_student_by_id(student_id)


def delete_student(student_id: int) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


# ══════════════════════════════════════════════════════════════════════════════
# Payments
# ══════════════════════════════════════════════════════════════════════════════

def create_payment(data: dict) -> dict:
    """
    Insert a new payment. Returns the full payment row plus student metadata
    so the receipt can be built directly from the response.
    """
    student_id = int(data["student_id"])
    amount     = float(data["amount"])
    date_paid  = data["date_paid"]
    duration   = int(data["duration"])
    due_date   = _compute_due_date(date_paid, duration)

    conn = get_db()

    cur = conn.execute(
        """
        INSERT INTO payments (student_id, amount, date_paid, duration, due_date, renewal_no)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (student_id, amount, date_paid, duration, due_date, ""),
    )
    payment_id = cur.lastrowid
    renewal_no = _renewal_no(payment_id)
    conn.execute(
        "UPDATE payments SET renewal_no = ? WHERE id = ?",
        (renewal_no, payment_id),
    )
    conn.commit()

    student = conn.execute(
        "SELECT name, course, admission_number FROM students WHERE id = ?", (student_id,)
    ).fetchone()
    conn.close()

    student_name     = student["name"]             if student else ""
    course           = student["course"]           if student else ""
    admission_number = student["admission_number"] if student else ""

    return {
        "id":               payment_id,
        "renewal_no":       renewal_no,
        "student_id":       student_id,
        "student_name":     student_name,
        "admission_number": admission_number,
        "course":           course,
        "amount":           amount,
        "date_paid":        date_paid,
        "duration":         duration,
        "due_date":         due_date,
    }


def get_payments_by_student(student_id: int) -> list[dict]:
    conn = get_db()
    rows = conn.execute(
        """
        SELECT p.*, s.name AS student_name, s.course, s.admission_number
        FROM   payments p
        JOIN   students s ON s.id = p.student_id
        WHERE  p.student_id = ?
        ORDER  BY p.id DESC
        """,
        (student_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_payment(payment_id: int, data: dict) -> Optional[dict]:
    conn = get_db()
    row = conn.execute(
        "SELECT duration, date_paid FROM payments WHERE id = ?", (payment_id,)
    ).fetchone()
    if not row:
        conn.close()
        return None

    date_paid = data.get("date_paid", row["date_paid"])
    duration  = int(data.get("duration", row["duration"]))
    amount    = float(data["amount"]) if "amount" in data else None
    due_date  = _compute_due_date(date_paid, duration)

    if amount is not None:
        conn.execute(
            "UPDATE payments SET amount=?, date_paid=?, duration=?, due_date=? WHERE id=?",
            (amount, date_paid, duration, due_date, payment_id),
        )
    else:
        conn.execute(
            "UPDATE payments SET date_paid=?, duration=?, due_date=? WHERE id=?",
            (date_paid, duration, due_date, payment_id),
        )

    conn.commit()
    result = conn.execute(
        "SELECT * FROM payments WHERE id = ?", (payment_id,)
    ).fetchone()
    conn.close()
    return _row_to_dict(result)


def delete_payment(payment_id: int) -> bool:
    conn = get_db()
    cur = conn.execute("DELETE FROM payments WHERE id = ?", (payment_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0


def get_recent_payments(days=7):
    """
    Return recent payments.
    - days=None → all payments ever (no date filter)
    - days=int  → payments in the last N days
    """
    conn = get_db()

    if days is None:
        rows = conn.execute(
            """
            SELECT
                p.id,
                p.student_id,
                s.name   AS student_name,
                s.course,
                p.amount,
                p.date_paid,
                p.duration,
                p.due_date,
                p.renewal_no
            FROM payments p
            JOIN students s ON s.id = p.student_id
            ORDER BY p.date_paid DESC
            """
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT
                p.id,
                p.student_id,
                s.name   AS student_name,
                s.course,
                p.amount,
                p.date_paid,
                p.duration,
                p.due_date,
                p.renewal_no
            FROM payments p
            JOIN students s ON s.id = p.student_id
            WHERE date(p.date_paid) >= date('now', ?)
            ORDER BY p.date_paid DESC
            """,
            (f"-{days} days",),
        ).fetchall()

    conn.close()
    return [dict(r) for r in rows]


def upsert_payment(data: dict) -> dict:
    """
    If data contains a truthy 'id', update that payment.
    Otherwise create a new one.
    """
    payment_id = data.get("id")
    if payment_id:
        result = update_payment(int(payment_id), data)
        return result or {}
    return create_payment(data)


# ══════════════════════════════════════════════════════════════════════════════
# Dashboard
# ══════════════════════════════════════════════════════════════════════════════

def get_dashboard_stats(month: Optional[int] = None) -> dict:
    conn  = get_db()
    today = date.today()

    mo_str = f"{int(month):02d}" if month else None

    # ── Total students ────────────────────────────────────────────────────────
    if month:
        total_students = conn.execute(
            """
            SELECT COUNT(DISTINCT s.id)
            FROM   students s
            JOIN   payments p ON p.student_id = s.id
            WHERE  strftime('%m', p.date_paid) = ?
            """,
            (mo_str,),
        ).fetchone()[0]
    else:
        total_students = conn.execute(
            "SELECT COUNT(*) FROM students"
        ).fetchone()[0]

    # ── Active / Expired ──────────────────────────────────────────────────────
    if month:
        latest_payments = conn.execute(
            """
            SELECT student_id, MAX(due_date) AS due_date
            FROM   payments
            WHERE  strftime('%m', date_paid) = ?
            GROUP  BY student_id
            """,
            (mo_str,),
        ).fetchall()
    else:
        latest_payments = conn.execute(
            """
            SELECT student_id, MAX(due_date) AS due_date
            FROM   payments
            GROUP  BY student_id
            """
        ).fetchall()

    active_count  = sum(
        1 for r in latest_payments
        if datetime.fromisoformat(r["due_date"]).date() >= today
    )
    expired_count = sum(
        1 for r in latest_payments
        if datetime.fromisoformat(r["due_date"]).date() < today
    )

    # ── Gender counts ─────────────────────────────────────────────────────────
    if month:
        male_students = conn.execute(
            """
            SELECT COUNT(DISTINCT s.id)
            FROM   students s
            JOIN   payments p ON p.student_id = s.id
            WHERE  s.gender = 'Male'
            AND    strftime('%m', p.date_paid) = ?
            """,
            (mo_str,),
        ).fetchone()[0]

        female_students = conn.execute(
            """
            SELECT COUNT(DISTINCT s.id)
            FROM   students s
            JOIN   payments p ON p.student_id = s.id
            WHERE  s.gender = 'Female'
            AND    strftime('%m', p.date_paid) = ?
            """,
            (mo_str,),
        ).fetchone()[0]
    else:
        male_students = conn.execute(
            "SELECT COUNT(*) FROM students WHERE gender = 'Male'"
        ).fetchone()[0]
        female_students = conn.execute(
            "SELECT COUNT(*) FROM students WHERE gender = 'Female'"
        ).fetchone()[0]

    # ── Total income ──────────────────────────────────────────────────────────
    if month:
        total_income = conn.execute(
            "SELECT COALESCE(SUM(amount),0) FROM payments WHERE strftime('%m', date_paid) = ?",
            (mo_str,),
        ).fetchone()[0]
    else:
        total_income = conn.execute(
            "SELECT COALESCE(SUM(amount),0) FROM payments"
        ).fetchone()[0]

    # ── Monthly income bars ───────────────────────────────────────────────────
    if month:
        monthly_rows = conn.execute(
            """
            SELECT strftime('%m', date_paid) AS mo,
                   SUM(amount)              AS total
            FROM   payments
            WHERE  strftime('%m', date_paid) = ?
            GROUP  BY mo
            """,
            (mo_str,),
        ).fetchall()
    else:
        monthly_rows = conn.execute(
            """
            SELECT strftime('%m', date_paid) AS mo,
                   SUM(amount)              AS total
            FROM   payments
            GROUP  BY mo
            ORDER  BY mo
            """
        ).fetchall()

    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    classes = [
        {"name": month_names[int(r["mo"]) - 1], "income": r["total"]}
        for r in monthly_rows
    ]

    # ── Mode of study ─────────────────────────────────────────────────────────
    if month:
        mode_rows = conn.execute(
            """
            SELECT s.mode AS name, COUNT(DISTINCT s.id) AS value
            FROM   students s
            JOIN   payments p ON p.student_id = s.id
            WHERE  s.mode IS NOT NULL
            AND    strftime('%m', p.date_paid) = ?
            GROUP  BY s.mode
            """,
            (mo_str,),
        ).fetchall()
    else:
        mode_rows = conn.execute(
            """
            SELECT mode AS name, COUNT(*) AS value
            FROM   students
            WHERE  mode IS NOT NULL
            GROUP  BY mode
            """
        ).fetchall()

    mode_gender = [dict(r) for r in mode_rows]

    # ── Student levels ────────────────────────────────────────────────────────
    if month:
        level_rows = conn.execute(
            """
            SELECT s.level AS name, COUNT(DISTINCT s.id) AS value
            FROM   students s
            JOIN   payments p ON p.student_id = s.id
            WHERE  s.level IS NOT NULL
            AND    strftime('%m', p.date_paid) = ?
            GROUP  BY s.level
            """,
            (mo_str,),
        ).fetchall()
    else:
        level_rows = conn.execute(
            """
            SELECT level AS name, COUNT(*) AS value
            FROM   students
            WHERE  level IS NOT NULL
            GROUP  BY level
            """
        ).fetchall()

    level_gender = [dict(r) for r in level_rows]

    conn.close()

    return {
        "total_students":   total_students,
        "total_income":     total_income,
        "active_students":  active_count,
        "expired_students": expired_count,
        "male_students":    male_students,
        "female_students":  female_students,
        "classes":          classes,
        "mode_gender":      mode_gender,
        "level_gender":     level_gender,
    }


def get_course_stats(month: Optional[int] = None) -> list[dict]:
    """
    Enrolment counts per course.
    - month=None → all students ever
    - month=int  → students who paid in that month
    Returns rows with keys: name, count
    """
    conn = get_db()

    if month:
        mo_str = f"{int(month):02d}"
        rows = conn.execute(
            """
            SELECT
                s.course             AS name,
                COUNT(DISTINCT s.id) AS count
            FROM students s
            JOIN payments p ON p.student_id = s.id
            WHERE s.course IS NOT NULL
            AND   s.course != ''
            AND   strftime('%m', p.date_paid) = ?
            GROUP BY s.course
            ORDER BY count DESC
            """,
            (mo_str,),
        ).fetchall()
    else:
        rows = conn.execute(
            """
            SELECT
                course   AS name,
                COUNT(*) AS count
            FROM students
            WHERE course IS NOT NULL
            AND   course != ''
            GROUP BY course
            ORDER BY count DESC
            """
        ).fetchall()

    conn.close()
    return [dict(r) for r in rows]


def get_renewals_due() -> list[dict]:
    """
    Students whose latest payment due_date falls between today and
    7 days from now (strictly upcoming, not already expired).
    """
    conn = get_db()

    rows = conn.execute(
        """
        SELECT
            s.id             AS student_id,
            s.name           AS student_name,
            s.admission_number,
            s.course,
            p.due_date,
            p.amount,
            p.renewal_no
        FROM payments p
        JOIN students s ON s.id = p.student_id
        WHERE p.due_date BETWEEN date('now') AND date('now', '+7 days')
        ORDER BY p.due_date ASC
        """
    ).fetchall()

    conn.close()
    return [dict(r) for r in rows]