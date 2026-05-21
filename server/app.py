"""
Riseway Training College - Student Management System Backend
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask_restful import Api
from extensions import db, migrate

from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

import models


# ─────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────

app = Flask(__name__)


database_url = os.environ.get("DATABASE_URL")

if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url or "sqlite:///riseway.db"

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.json.compact = False

db.init_app(app)
migrate.init_app(app, db)

api = Api(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="https://riseway.vercel.app"
)

CORS(
    app,
    supports_credentials=True,
    origins=[
        "https://riseway.vercel.app"
    ],
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

SECRET_KEY = os.environ.get("JWT_SECRET", "riseway-secret-key-change-in-prod")
TOKEN_HOURS = 12


# ─────────────────────────────────────────────
# JWT HELPERS
# ─────────────────────────────────────────────

def make_token(user_id, role):
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def decode_token(token):
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])


def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")

        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401

        try:
            payload = decode_token(auth.split(" ")[1])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        request.user_id   = payload["sub"]
        request.user_role = payload["role"]

        return f(*args, **kwargs)

    return wrapper


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        @token_required
        def wrapper(*args, **kwargs):
            if request.user_role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator


# ─────────────────────────────────────────────
# DB INIT
# ─────────────────────────────────────────────

def init_db():
    print("INIT DB RUNNING")

    if not models.get_user_by_username("director"):
        users = [
            ("director", "@director2026", "director"),
            ("admin",    "@admin2026",    "admin"),
            ("recep",    "@recap2026",    "receptionist"),
        ]

        models.create_user(username, password,role)

        print("Seeded default users")
    else:
        print("Users already exist")


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    user = models.get_user_by_username(username)

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode(), user.password.encode()):
        return jsonify({"error": "Invalid credentials"}), 401

    token = make_token(user.id, user.role)

    return jsonify({
        "token": token,
        "role": user.role
    }), 200


@app.route("/api/change-password", methods=["POST"])
@token_required
def change_password():
    data = request.get_json() or {}

    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not old_password or not new_password:
        return jsonify({"error": "Both passwords required"}), 400

    user = models.get_user_by_id(request.user_id)

    if not user or not bcrypt.checkpw(old_password.encode(), user["password"].encode()):
        return jsonify({"error": "Current password is incorrect"}), 401

    hashed = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    models.update_user_password(request.user_id, hashed)

    return jsonify({"message": "Password updated"}), 200


# ─────────────────────────────────────────────
# STUDENTS
# ─────────────────────────────────────────────

@app.route("/api/students", methods=["GET"])
@token_required
def get_students():
    search = request.args.get("search", "").strip() or None
    data   = models.get_all_students(search=search)
    return jsonify(data), 200


@app.route("/api/students/<int:student_id>", methods=["GET"])
@token_required
def get_student(student_id):
    student = models.get_student_by_id(student_id)

    if not student:
        return jsonify({"error": "Student not found"}), 404

    return jsonify(student), 200

# ─────────────────────────────────────────────
# STUDENT BALANCE
# ─────────────────────────────────────────────

@app.route(
    "/api/students/balance-by-admission/<admission_number>",
    methods=["GET"]
)
@token_required
def get_balance_by_admission(admission_number):

    student = models.get_student_by_admission_number(
        admission_number
    )

    if not student:
        return jsonify({
            "balance": 0,
            "amount_paid": 0,
            "date_paid": None,
            "duration": 0,
        }), 200

    # TEMPORARY EXPECTED FEE
    expected_fee = 10000

    # GET STUDENT PAYMENTS
    payments = models.get_payments_by_student(student["id"])

    total_paid = sum(
        payment.get("amount", 0)
        for payment in payments
    )

    latest_payment = payments[-1] if payments else {}

    balance = max(expected_fee - total_paid, 0)

    return jsonify({
        "student_id": student["id"],
        "student_name": student["name"],
        "amount_paid": total_paid,
        "balance": balance,
        "date_paid": latest_payment.get("date_paid"),
        "duration": latest_payment.get("duration", 0),
    }), 200    


@app.route("/api/students", methods=["POST"])
@token_required
def create_student():
    data = request.get_json() or {}

    required = ["name", "gender", "mode", "level"]
    missing  = [f for f in required if not data.get(f)]

    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # create student FIRST (real DB insert)
    student = models.create_student(data)

    if not student:
        return jsonify({"error": "Failed to create student"}), 500

    # THEN emit real-time notification
    socketio.emit("new_student", {
        "message": f"New student registered: {student['name']}",
        "student": student
    })

    return jsonify(student), 201


@app.route("/api/students/<int:student_id>", methods=["PUT"])
@token_required
def update_student(student_id):
    data    = request.get_json() or {}
    updated = models.update_student(student_id, data)

    if not updated:
        return jsonify({"error": "Student not found"}), 404

    return jsonify(updated), 200


@app.route("/api/students/<int:student_id>", methods=["DELETE"])
@role_required("receptionist")
def delete_student(student_id):
    deleted = models.delete_student(student_id)

    if not deleted:
        return jsonify({"error": "Student not found"}), 404

    return jsonify({"message": "Deleted"}), 200


# ─────────────────────────────────────────────
# PAYMENTS
# ─────────────────────────────────────────────

@app.route("/api/payments/<int:student_id>", methods=["GET"])
@token_required
def get_payments(student_id):
    return jsonify(models.get_payments_by_student(student_id)), 200

@app.route("/api/payments", methods=["POST"])
@token_required
def create_payment():
    data = request.get_json() or {}

    # Resolve admission number → student ID
    raw_id = str(data.get("student_id", "")).strip()

    if raw_id and not raw_id.isdigit():
        student = models.get_student_by_admission_number(raw_id)

        if not student:
            return jsonify({
                "error": f"No student found with admission number '{raw_id}'"
            }), 404

        data["student_id"] = student["id"]

    # Ensure numeric student_id
    try:
        data["student_id"] = int(data["student_id"])
    except:
        return jsonify({"error": "Invalid student ID"}), 400

    # Validate required fields
    required = ["student_id", "amount", "date_paid", "duration"]

    if not all(data.get(f) for f in required):
        return jsonify({"error": "Missing payment fields"}), 400

    # Check old payments BEFORE inserting
    existing_payments = models.get_payments_by_student(
        data["student_id"]
    )

    # Create payment
    payment = models.create_payment(data)

    if not payment:
        return jsonify({"error": "Failed to create payment"}), 500

    # Get student
    student = models.get_student_by_id(data["student_id"])

    # Emit ONLY for renewals
    if existing_payments and student:
        socketio.emit("student_renewed", {
            "message": f"{student['name']} renewed subscription",
            "student": student
        })

    return jsonify(payment), 201


@app.route("/api/payments/upsert", methods=["POST"])
@token_required
def upsert_payment():
    data = request.get_json() or {}

    if not data.get("student_id"):
        return jsonify({"error": "student_id required"}), 400

    return jsonify(models.upsert_payment(data)), 200


@app.route("/api/payments/<int:payment_id>", methods=["PUT"])
@role_required("director", "admin")
def update_payment(payment_id):
    updated = models.update_payment(payment_id, request.get_json() or {})

    if not updated:
        return jsonify({"error": "Payment not found"}), 404

    return jsonify(updated), 200


@app.route("/api/payments/<int:payment_id>", methods=["DELETE"])
@role_required("director", "admin")
def delete_payment(payment_id):
    deleted = models.delete_payment(payment_id)

    if not deleted:
        return jsonify({"error": "Payment not found"}), 404

    return jsonify({"message": "Deleted"}), 200

@app.route("/api/students/<int:student_id>/balance", methods=["GET"])
@token_required
def get_student_balance(student_id):

    student = models.get_student_by_id(student_id)

    if not student:
        return jsonify({"error": "Student not found"}), 404

    expected_fee = 10000

    payments = models.get_payments_by_student(student_id)

    total_paid = sum(
        payment.get("amount", 0)
        for payment in payments
    )

    latest_payment = payments[-1] if payments else {}

    balance = max(expected_fee - total_paid, 0)

    return jsonify({
        "student_id": student["id"],
        "student_name": student["name"],
        "amount_paid": total_paid,
        "balance": balance,
        "date_paid": latest_payment.get("date_paid"),
        "duration": latest_payment.get("duration", 0),
    }), 200    


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
@role_required("director")
def dashboard():
    month = request.args.get("month")
    month = int(month) if month else None
    return jsonify(models.get_dashboard_stats(month=month)), 200


@app.route("/api/dashboard/courses", methods=["GET"])
@role_required("director")
def dashboard_courses():
    # FIX: pass month filter through so course stats respect monthly view
    month = request.args.get("month")
    month = int(month) if month else None
    return jsonify(models.get_course_stats(month=month)), 200


@app.route("/api/dashboard/recent-payments", methods=["GET"])
@role_required("director")
def recent_payments():
    days = request.args.get("days", "7")

    # FIX: "all" → None so get_recent_payments skips the date filter entirely
    if days == "all":
        days = None
    else:
        try:
            days = int(days)
        except ValueError:
            days = 7

    return jsonify(models.get_recent_payments(days=days)), 200


@app.route("/api/dashboard/renewals-due", methods=["GET"])
@role_required("director")
def renewals_due():
    return jsonify(models.get_renewals_due()), 200


# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────

if __name__ == "__main__":

    with app.app_context():
        db.create_all()
        init_db()

    socketio.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
    