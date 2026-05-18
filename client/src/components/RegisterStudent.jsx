import { useState } from "react";
import API from "../api";

const INITIAL_STUDENT = {
  admission_number: "",
  membership_no: "",
  name: "",
  phone: "",
  email: "",
  gender: "",
  mode: "",
  level: "",
  course: "",
  membership: false,
};

const INITIAL_PAYMENT = {
  amount: "",
  balance: "",
  date_paid: "",
  duration: "",
};

function RegisterStudent({ onStudentAdded }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [student, setStudent] = useState(INITIAL_STUDENT);
  const [payment, setPayment] = useState(INITIAL_PAYMENT);

  const [error, setError] = useState("");

  // ─────────────────────────────
  // HELPERS
  // ─────────────────────────────

  const setStudentField = (field, value) => {
    setStudent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const setPaymentField = (field, value) => {
    setPayment((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ─────────────────────────────
  // STEP VALIDATION
  // ─────────────────────────────

  const handleNext = () => {
    if (
      !student.admission_number ||
      !student.name ||
      !student.phone ||
      !student.gender ||
      !student.mode ||
      !student.level ||
      !student.course
    ) {
      setError("Please fill in all required student fields.");
      return;
    }

    if (student.membership && !student.membership_no) {
      setError("Please enter membership card number.");
      return;
    }

    setError("");
    setStep(2);
  };

  // ─────────────────────────────
  // REGISTER
  // ─────────────────────────────

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!payment.amount || !payment.date_paid || !payment.duration) {
      setError("Please fill in all payment fields.");
      return;
    }

    try {
      setSaving(true);

      // CREATE STUDENT
      const res = await API.post("/students", {
        ...student,
        membership: student.membership ? 1 : 0,
      });

      const studentId = res.data.id;

      if (!studentId) {
        setError("Student created but no ID returned.");
        return;
      }

      // CREATE PAYMENT (FIXED SAFE VERSION)
      await API.post("/payments", {
        student_id: studentId,
        amount: Number(payment.amount || 0),
        balance: Number(payment.balance || 0),
        date_paid: payment.date_paid,
        duration: Number(payment.duration || 0),
      });

      // RESET FORM
      setStudent(INITIAL_STUDENT);
      setPayment(INITIAL_PAYMENT);
      setStep(1);

      if (onStudentAdded) {
        onStudentAdded(studentId);
      }

    } catch (err) {
      console.error("Registration Error:", err);

      setError(
        err.response?.data?.error ||
        "Registration failed. Please try again."
      );

    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────
  // UI
  // ─────────────────────────────

  return (
    <div>
      <h2>Register Student</h2>

      {error && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
          padding: "10px 14px",
          borderRadius: 8,
          fontSize: 13,
          marginBottom: 12,
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister}>

        {/* ───────── STEP 1 ───────── */}
        {step === 1 && (
          <div className="form-box">

            <h3>Step 1 — Student Details</h3>

            <input
              type="text"
              placeholder="Admission Number *"
              value={student.admission_number}
              onChange={(e) =>
                setStudentField("admission_number", e.target.value)
              }
            />

            <input
              type="text"
              placeholder="Full Name *"
              value={student.name}
              onChange={(e) =>
                setStudentField("name", e.target.value)
              }
            />

            <input
              type="text"
              placeholder="Phone Number *"
              value={student.phone}
              onChange={(e) =>
                setStudentField("phone", e.target.value)
              }
            />

            <input
              type="email"
              placeholder="Email Address"
              value={student.email}
              onChange={(e) =>
                setStudentField("email", e.target.value)
              }
            />

            <select
              value={student.gender}
              onChange={(e) =>
                setStudentField("gender", e.target.value)
              }
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select
              value={student.mode}
              onChange={(e) =>
                setStudentField("mode", e.target.value)
              }
            >
              <option value="">Mode of Learning</option>
              <option value="online">Online</option>
              <option value="physical">Physical</option>
            </select>

            <select
              value={student.level}
              onChange={(e) =>
                setStudentField("level", e.target.value)
              }
            >
              <option value="">Select Level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <input
              type="text"
              placeholder="Course *"
              value={student.course}
              onChange={(e) =>
                setStudentField("course", e.target.value)
              }
            />

            <label>
              <input
                type="checkbox"
                checked={student.membership}
                onChange={(e) =>
                  setStudentField("membership", e.target.checked)
                }
              />
              Has Membership Card
            </label>

            {student.membership && (
              <input
                type="text"
                placeholder="Enter Membership Card Number"
                value={student.membership_no}
                onChange={(e) =>
                  setStudentField("membership_no", e.target.value)
                }
              />
            )}

            <div className="form-footer">
              <button type="button" onClick={handleNext}>
                Next → Payment
              </button>
            </div>

          </div>
        )}

        {/* ───────── STEP 2 ───────── */}
        {step === 2 && (
          <div className="form-box">

            <h3>Step 2 — Payment Details</h3>

            <input
              type="number"
              placeholder="Amount (KSh)"
              value={payment.amount}
              onChange={(e) =>
                setPaymentField("amount", e.target.value)
              }
            />

            <input
              type="number"
              placeholder="Balance (if any)"
              value={payment.balance}
              onChange={(e) =>
                setPaymentField("balance", e.target.value)
              }
            />

            <input
              type="date"
              value={payment.date_paid}
              onChange={(e) =>
                setPaymentField("date_paid", e.target.value)
              }
            />

            <input
              type="number"
              placeholder="Duration (Months)"
              value={payment.duration}
              onChange={(e) =>
                setPaymentField("duration", e.target.value)
              }
            />

            <div className="form-footer">
              <button type="button" onClick={() => setStep(1)}>
                ← Back
              </button>

              <button type="submit" disabled={saving}>
                {saving ? "Registering..." : "Register Student"}
              </button>
            </div>

          </div>
        )}

      </form>
    </div>
  );
}

export default RegisterStudent;