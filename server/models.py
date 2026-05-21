"""
models.py – SQLAlchemy-powered data layer.

Fully compatible with:
- Flask-SQLAlchemy
- PostgreSQL
- SQLite
- Render deployment

No raw SQLite connections are used.
"""

from __future__ import annotations

from datetime import datetime, date
from typing import Optional

import bcrypt
from dateutil.relativedelta import relativedelta

from extensions import db


# ══════════════════════════════════════════════════════════════════════════════
# Models
# ══════════════════════════════════════════════════════════════════════════════

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    username = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.String(50),
        nullable=False
    )

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
        }


class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)

    admission_number = db.Column(
        db.String(100),
        unique=True
    )

    name = db.Column(
        db.String(255),
        nullable=False
    )

    phone = db.Column(db.String(50))

    email = db.Column(
        db.String(120),
        default=""
    )

    gender = db.Column(db.String(20))

    mode = db.Column(db.String(50))

    level = db.Column(db.String(50))

    course = db.Column(db.String(100))

    membership = db.Column(
        db.Boolean,
        default=False
    )

    membership_no = db.Column(db.String(100))

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    payments = db.relationship(
        "Payment",
        backref="student",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        latest_payment = (
            Payment.query
            .filter_by(student_id=self.id)
            .order_by(Payment.id.desc())
            .first()
        )

        due_date = latest_payment.due_date if latest_payment else None

        return {
            "id": self.id,
            "admission_number": self.admission_number,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "gender": self.gender,
            "mode": self.mode,
            "level": self.level,
            "course": self.course,
            "membership": self.membership,
            "membership_no": self.membership_no,

            "amount": latest_payment.amount if latest_payment else None,
            "date_paid": latest_payment.date_paid if latest_payment else None,
            "duration": latest_payment.duration if latest_payment else None,
            "due_date": latest_payment.due_date if latest_payment else None,
            "renewal_no": latest_payment.renewal_no if latest_payment else None,

            "status": _student_status(due_date),
            "created_at": self.created_at.isoformat(),
        }


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)

    student_id = db.Column(
        db.Integer,
        db.ForeignKey("students.id"),
        nullable=False
    )

    amount = db.Column(
        db.Float,
        nullable=False
    )

    date_paid = db.Column(
        db.String(20),
        nullable=False
    )

    duration = db.Column(
        db.Integer,
        nullable=False
    )

    due_date = db.Column(
        db.String(20),
        nullable=False
    )

    renewal_no = db.Column(
        db.String(100),
        default=""
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "amount": self.amount,
            "date_paid": self.date_paid,
            "duration": self.duration,
            "due_date": self.due_date,
            "renewal_no": self.renewal_no,
        }


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _compute_due_date(date_paid: str, duration: int) -> str:
    """
    Return YYYY-MM-DD string for:
    date_paid + duration months
    """
    base = datetime.strptime(
        date_paid,
        "%Y-%m-%d"
    ).date()

    return (
        base + relativedelta(months=duration)
    ).strftime("%Y-%m-%d")


def _renewal_no(payment_id: int) -> str:
    return f"REC-{str(payment_id).zfill(4)}"


def _admission_number(student_id: int) -> str:
    return f"RTC-{str(student_id).zfill(3)}"


def _student_status(due_date: Optional[str]) -> str:
    """
    Active     → due_date is today or future
    Expired    → due_date passed
    No Payment → no payment exists
    """

    if not due_date:
        return "No Payment"

    try:
        d = datetime.strptime(
            due_date,
            "%Y-%m-%d"
        ).date()

        if d >= date.today():
            return "Active"

        return "Expired"

    except ValueError:
        return "No Payment"


# ══════════════════════════════════════════════════════════════════════════════
# Auth / Users
# ══════════════════════════════════════════════════════════════════════════════

def create_user(username: str, password: str, role: str):
    hashed = bcrypt.hashpw(
        password.encode(),
        bcrypt.gensalt()
    ).decode()

    user = User(
        username=username,
        password=hashed,
        role=role
    )

    db.session.add(user)
    db.session.commit()

    return user.to_dict()


def get_user_by_username(username: str):
    user = User.query.filter_by(
        username=username
    ).first()

    return user


def get_user_by_id(user_id: int):
    user = User.query.get(user_id)

    return user


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        plain.encode(),
        hashed.encode()
    )


def update_user_password(user_id: int, new_password: str):
    user = User.query.get(user_id)

    if not user:
        return False

    hashed = bcrypt.hashpw(
        new_password.encode(),
        bcrypt.gensalt()
    ).decode()

    user.password = hashed

    db.session.commit()

    return True


# ══════════════════════════════════════════════════════════════════════════════
# Students
# ══════════════════════════════════════════════════════════════════════════════

def create_student(data: dict):
    student = Student(
        name=data["name"],
        phone=data.get("phone", ""),
        email=data.get("email", ""),
        gender=data.get("gender"),
        mode=data.get("mode"),
        level=data.get("level"),
        course=data.get("course", ""),
        membership=data.get("membership", False),
        membership_no=data.get("membership_no", "")
    )

    db.session.add(student)
    db.session.commit()

    student.admission_number = _admission_number(student.id)

    db.session.commit()

    return student.to_dict()


def get_all_students(search: Optional[str] = None):
    query = Student.query

    if search:
        search_term = f"%{search}%"

        query = query.filter(
            db.or_(
                Student.name.ilike(search_term),
                Student.phone.ilike(search_term),
                Student.course.ilike(search_term),
                Student.admission_number.ilike(search_term)
            )
        )

    students = (
        query
        .order_by(Student.id.desc())
        .all()
    )

    return [student.to_dict() for student in students]


def get_student_by_id(student_id: int):
    student = Student.query.get(student_id)

    return student.to_dict() if student else None


def get_student_by_admission_number(admission_number: str):
    student = Student.query.filter_by(
        admission_number=admission_number
    ).first()

    return student.to_dict() if student else None


def update_student(student_id: int, data: dict):
    student = Student.query.get(student_id)

    if not student:
        return None

    student.name = data.get(
        "name",
        student.name
    )

    student.phone = data.get(
        "phone",
        student.phone
    )

    student.email = data.get(
        "email",
        student.email
    )

    student.gender = data.get(
        "gender",
        student.gender
    )

    student.mode = data.get(
        "mode",
        student.mode
    )

    student.level = data.get(
        "level",
        student.level
    )

    student.course = data.get(
        "course",
        student.course
    )

    student.membership = data.get(
        "membership",
        student.membership
    )

    student.membership_no = data.get(
        "membership_no",
        student.membership_no
    )

    db.session.commit()

    return student.to_dict()


def delete_student(student_id: int):
    student = Student.query.get(student_id)

    if not student:
        return False

    db.session.delete(student)
    db.session.commit()

    return True


# ══════════════════════════════════════════════════════════════════════════════
# Payments
# ══════════════════════════════════════════════════════════════════════════════

def create_payment(data: dict):
    student_id = int(data["student_id"])

    amount = float(data["amount"])

    date_paid = data["date_paid"]

    duration = int(data["duration"])

    due_date = _compute_due_date(
        date_paid,
        duration
    )

    payment = Payment(
        student_id=student_id,
        amount=amount,
        date_paid=date_paid,
        duration=duration,
        due_date=due_date,
    )

    db.session.add(payment)
    db.session.commit()

    payment.renewal_no = _renewal_no(payment.id)

    db.session.commit()

    student = Student.query.get(student_id)

    return {
        "id": payment.id,
        "renewal_no": payment.renewal_no,
        "student_id": student_id,
        "student_name": student.name if student else "",
        "admission_number": student.admission_number if student else "",
        "course": student.course if student else "",
        "amount": payment.amount,
        "date_paid": payment.date_paid,
        "duration": payment.duration,
        "due_date": payment.due_date,
    }


def get_payments_by_student(student_id: int):
    payments = (
        Payment.query
        .filter_by(student_id=student_id)
        .order_by(Payment.id.desc())
        .all()
    )

    results = []

    for payment in payments:
        student = Student.query.get(payment.student_id)

        results.append({
            "id": payment.id,
            "student_id": payment.student_id,
            "student_name": student.name if student else "",
            "course": student.course if student else "",
            "admission_number": student.admission_number if student else "",
            "amount": payment.amount,
            "date_paid": payment.date_paid,
            "duration": payment.duration,
            "due_date": payment.due_date,
            "renewal_no": payment.renewal_no,
        })

    return results


def update_payment(payment_id: int, data: dict):
    payment = Payment.query.get(payment_id)

    if not payment:
        return None

    payment.amount = float(
        data.get("amount", payment.amount)
    )

    payment.date_paid = data.get(
        "date_paid",
        payment.date_paid
    )

    payment.duration = int(
        data.get("duration", payment.duration)
    )

    payment.due_date = _compute_due_date(
        payment.date_paid,
        payment.duration
    )

    db.session.commit()

    return payment.to_dict()


def delete_payment(payment_id: int):
    payment = Payment.query.get(payment_id)

    if not payment:
        return False

    db.session.delete(payment)
    db.session.commit()

    return True


def get_recent_payments(days=7):
    query = Payment.query

    if days is not None:
        cutoff = date.today()

        payments = (
            query
            .order_by(Payment.id.desc())
            .all()
        )

        filtered = []

        for payment in payments:
            try:
                paid_date = datetime.strptime(
                    payment.date_paid,
                    "%Y-%m-%d"
                ).date()

                delta = (cutoff - paid_date).days

                if delta <= days:
                    filtered.append(payment)

            except Exception:
                continue

        payments = filtered

    else:
        payments = (
            query
            .order_by(Payment.id.desc())
            .all()
        )

    results = []

    for payment in payments:
        student = Student.query.get(payment.student_id)

        results.append({
            "id": payment.id,
            "student_id": payment.student_id,
            "student_name": student.name if student else "",
            "course": student.course if student else "",
            "amount": payment.amount,
            "date_paid": payment.date_paid,
            "duration": payment.duration,
            "due_date": payment.due_date,
            "renewal_no": payment.renewal_no,
        })

    return results


def upsert_payment(data: dict):
    payment_id = data.get("id")

    if payment_id:
        result = update_payment(
            int(payment_id),
            data
        )

        return result or {}

    return create_payment(data)


# ══════════════════════════════════════════════════════════════════════════════
# Dashboard
# ══════════════════════════════════════════════════════════════════════════════

def get_dashboard_stats(month: Optional[int] = None):
    query_students = Student.query
    query_payments = Payment.query

    if month:
        month_str = f"{int(month):02d}"

        payments = [
            p for p in query_payments.all()
            if p.date_paid[5:7] == month_str
        ]

        student_ids = list(
            set([p.student_id for p in payments])
        )

        total_students = len(student_ids)

    else:
        payments = query_payments.all()

        total_students = query_students.count()

    total_income = sum(
        payment.amount for payment in payments
    )

    latest_per_student = {}

    for payment in payments:
        latest_per_student[payment.student_id] = payment

    active_students = 0
    expired_students = 0

    for payment in latest_per_student.values():
        status = _student_status(payment.due_date)

        if status == "Active":
            active_students += 1

        elif status == "Expired":
            expired_students += 1

    if month:
        male_students = Student.query.filter_by(
            gender="Male"
        ).count()

        female_students = Student.query.filter_by(
            gender="Female"
        ).count()

    else:
        male_students = Student.query.filter_by(
            gender="Male"
        ).count()

        female_students = Student.query.filter_by(
            gender="Female"
        ).count()

    month_names = [
        "Jan", "Feb", "Mar", "Apr",
        "May", "Jun", "Jul", "Aug",
        "Sep", "Oct", "Nov", "Dec"
    ]

    monthly_income = {}

    for payment in Payment.query.all():
        month_no = int(payment.date_paid[5:7])

        monthly_income.setdefault(month_no, 0)

        monthly_income[month_no] += payment.amount

    classes = [
        {
            "name": month_names[m - 1],
            "income": income
        }
        for m, income in monthly_income.items()
    ]

    mode_counts = {}

    for student in Student.query.all():
        if student.mode:
            mode_counts.setdefault(student.mode, 0)
            mode_counts[student.mode] += 1

    mode_gender = [
        {"name": k, "value": v}
        for k, v in mode_counts.items()
    ]

    level_counts = {}

    for student in Student.query.all():
        if student.level:
            level_counts.setdefault(student.level, 0)
            level_counts[student.level] += 1

    level_gender = [
        {"name": k, "value": v}
        for k, v in level_counts.items()
    ]

    return {
        "total_students": total_students,
        "total_income": total_income,
        "active_students": active_students,
        "expired_students": expired_students,
        "male_students": male_students,
        "female_students": female_students,
        "classes": classes,
        "mode_gender": mode_gender,
        "level_gender": level_gender,
    }


def get_course_stats(month: Optional[int] = None):
    students = Student.query.all()

    if month:
        month_str = f"{int(month):02d}"

        valid_student_ids = set()

        for payment in Payment.query.all():
            if payment.date_paid[5:7] == month_str:
                valid_student_ids.add(payment.student_id)

        students = [
            s for s in students
            if s.id in valid_student_ids
        ]

    counts = {}

    for student in students:
        if student.course:
            counts.setdefault(student.course, 0)
            counts[student.course] += 1

    return [
        {
            "name": course,
            "count": count
        }
        for course, count in counts.items()
    ]


def get_renewals_due():
    today = date.today()

    upcoming = []

    payments = Payment.query.all()

    for payment in payments:
        try:
            due = datetime.strptime(
                payment.due_date,
                "%Y-%m-%d"
            ).date()

            delta = (due - today).days

            if 0 <= delta <= 7:
                student = Student.query.get(
                    payment.student_id
                )

                upcoming.append({
                    "student_id": payment.student_id,
                    "student_name": student.name if student else "",
                    "admission_number": (
                        student.admission_number
                        if student else ""
                    ),
                    "course": (
                        student.course
                        if student else ""
                    ),
                    "due_date": payment.due_date,
                    "amount": payment.amount,
                    "renewal_no": payment.renewal_no,
                })

        except Exception:
            continue

    upcoming.sort(
        key=lambda x: x["due_date"]
    )

    return upcoming