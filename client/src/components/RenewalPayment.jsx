import { useState } from "react";
import API from "../api";
import { QRCodeSVG } from "qrcode.react";

const INITIAL_PAYMENT = {
  amount: "",
  balance: "",   // ✅ ADDED
  date_paid: "",
  duration: "",
};

function RenewalPayment({ onRenewalAdded }) {
  const [step, setStep] = useState(1);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [student, setStudent] = useState(null);
  const [payment, setPayment] = useState(INITIAL_PAYMENT);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [balance, setBalance] = useState(null);

  const setPaymentField = (field, value) =>
    setPayment((prev) => ({ ...prev, [field]: value }));

  // ── Fetch Balance ──
  const fetchBalance = async (studentId) => {
    try {
      const res = await API.get(`/students/${studentId}/balance`);
      setBalance(res.data.balance);
    } catch (err) {
      console.error("Balance error", err);
      setBalance(null);
    }
  };

  // ── Step 1: Search Student ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter an admission number or name.");
      return;
    }

    setError("");
    setStudent(null);
    setBalance(null);

    try {
      setSearching(true);

      const res = await API.get(
        `/students?search=${encodeURIComponent(searchQuery.trim())}`
      );

      const data = Array.isArray(res.data) ? res.data[0] : res.data;

      if (!data) {
        setError("No student found.");
        return;
      }

      setStudent(data);
      setStep(2);

      fetchBalance(data.id);
    } catch (err) {
      console.error("Search error:", err.response?.data);
      setError(err.response?.data?.error || "Student not found.");
    } finally {
      setSearching(false);
    }
  };

  // ── Step 2: Submit Renewal ──
  const handleRenew = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!student) {
      setError("No student selected");
      return;
    }

    if (!payment.amount || !payment.date_paid || !payment.duration) {
      setError("Please fill in all payment fields.");
      return;
    }

    try {
      setSaving(true);

      await API.post("/payments", {
        student_id: student.id,
        amount: Number(payment.amount),
        balance: Number(payment.balance || 0), // ✅ ADDED SAFE BALANCE
        date_paid: payment.date_paid,
        duration: Number(payment.duration),
      });

      setSuccess(
        `Renewal recorded for ${student.name} (ID: ${student.id}).`
      );

      setPayment(INITIAL_PAYMENT);
      setSearchQuery("");
      setStudent(null);
      setStep(1);
      setBalance(null);

      if (onRenewalAdded) onRenewalAdded(student.id);
    } catch (err) {
      console.error("Renewal error:", err.response?.data);
      setError(err.response?.data?.error || "Renewal failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setStudent(null);
    setSearchQuery("");
    setPayment(INITIAL_PAYMENT);
    setError("");
    setSuccess("");
    setBalance(null);
  };

  return (
    <div>
      <h2>Renewal Payment</h2>

      {/* SUCCESS */}
      {success && (
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#15803d",
          padding: "10px 14px",
          borderRadius: 8,
          marginBottom: 12
        }}>
          {success}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
          padding: "10px 14px",
          borderRadius: 8,
          marginBottom: 12
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRenew}>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="form-box">
            <h3>Step 1 — Find Student</h3>

            <input
              placeholder="Admission Number or Full Name *"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleSearch())
              }
            />

            <div className="form-footer">
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? "Searching..." : "Search →"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && student && (
          <div className="form-box">
            <h3>Step 2 — Renewal Payment</h3>

            {/* STUDENT CARD */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              padding: 12,
              borderRadius: 8,
              marginBottom: 12
            }}>
              <div style={{ fontWeight: 700 }}>{student.name}</div>
              <div>ID: {student.id} · {student.course} · {student.level}</div>
              <div>{student.phone} {student.email && `· ${student.email}`}</div>
              <div>Admission No: {student.admission_number}</div>
            </div>

            {/* BALANCE */}
            {balance !== null && (
              <div style={{
                marginBottom: 12,
                padding: 10,
                borderRadius: 8,
                background: balance > 0 ? "#fef2f2" : "#ecfdf5",
                color: balance > 0 ? "#b91c1c" : "#16a34a",
                fontWeight: 600
              }}>
                Balance: KSh {balance}
              </div>
            )}

            <input
              type="number"
              placeholder="Amount (KSh)"
              value={payment.amount}
              onChange={(e) => setPaymentField("amount", e.target.value)}
            />

            {/* ✅ ADDED BALANCE INPUT (MANUAL ENTRY) */}
            <input
              type="number"
              placeholder="Balance (if any)"
              value={payment.balance}
              onChange={(e) => setPaymentField("balance", e.target.value)}
            />

            <input
              type="date"
              value={payment.date_paid}
              onChange={(e) => setPaymentField("date_paid", e.target.value)}
            />

            <input
              type="number"
              placeholder="Duration (Months)"
              value={payment.duration}
              onChange={(e) => setPaymentField("duration", e.target.value)}
            />

            <div className="form-footer">
              <button type="button" onClick={handleReset}>
                ← Back
              </button>

              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Record Renewal"}
              </button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}

export default RenewalPayment;