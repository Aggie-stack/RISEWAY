// ─── EditStudentRegistration ──────────────────────────────────────────────────

function EditStudentRegistration({
  editStudent,
  setEditStudent,
  editStep,
  setEditStep,
  paymentData,
  setPaymentData,
  handleUpdateStudent,
  handleSaveAll,
}) {
  const set = (field, value) =>
    setEditStudent((prev) => ({ ...prev, [field]: value }));

  const setPayment = (field, value) =>
    setPaymentData((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="modal-overlay">
      <div className="modal-content">

        {/* ── Step 1: Student Details ── */}
        {editStep === 1 && (
          <>
            <h3>Edit Registration — Student Details</h3>

            {/* Admission number — read-only, auto-assigned */}
            {editStudent.admission_nubmer && (
              <div style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                color: "#1d4ed8",
                fontWeight: 600,
                marginBottom: 4,
              }}>
                Admission No: {editStudent.admission_number}
              </div>
            )}

            <input
              placeholder="Full Name"
              value={editStudent.name || ""}
              onChange={(e) => set("name", e.target.value)}
            />
            <input
              placeholder="Email Address"
              type="email"
              value={editStudent.email || ""}
              onChange={(e) => set("email", e.target.value)}
            />

            <select
              value={editStudent.gender || ""}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>

            <select
              value={editStudent.mode || ""}
              onChange={(e) => set("mode", e.target.value)}
            >
              <option value="">Mode of Learning</option>
              <option value="online">Online</option>
              <option value="physical">Physical</option>
            </select>

            <select
              value={editStudent.level || ""}
              onChange={(e) => set("level", e.target.value)}
            >
              <option value="">Level</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <input
              placeholder="Phone No"
              value={editStudent.phone || ""}
              onChange={(e) => set("phone", e.target.value)}
            />
            <input
              placeholder="Course"
              value={editStudent.course || ""}
              onChange={(e) => set("course", e.target.value)}
            />

            <label className="checkbox">
              <input
                type="checkbox"
                checked={!!editStudent.membership}
                onChange={(e) => {
                  set("membership", e.target.checked);
                  // Clear membership number if card is removed
                  if (!e.target.checked) set("membership_no", "");
                }}
              />
              Has Membership Card
            </label>

            {/* Membership number — only shown when membership is checked */}
            {!!editStudent.membership && (
              <input
                placeholder="Membership Card Number"
                value={editStudent.membership_no || ""}
                onChange={(e) => set("membership_no", e.target.value)}
                style={{ marginTop: 4 }}
              />
            )}

            <div className="modal-actions">
              <button onClick={() => setEditStudent(null)}>Cancel</button>
              <button onClick={handleUpdateStudent}>Next → Payment</button>
            </div>
          </>
        )}

        {/* ── Step 2: Payment Details ── */}
        {editStep === 2 && (
          <>
            <h3>Edit Registration — Payment Details</h3>

            <input
              type="number"
              placeholder="Amount (KSh)"
              value={paymentData.amount}
              onChange={(e) => setPayment("amount", e.target.value)}
            />
            <input
              type="date"
              value={paymentData.date_paid}
              onChange={(e) => setPayment("date_paid", e.target.value)}
            />
            <input
              type="number"
              placeholder="Duration (Months)"
              value={paymentData.duration}
              onChange={(e) => setPayment("duration", e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={() => setEditStep(1)}>← Back</button>
              <button
                onClick={handleSaveAll}
                style={{ backgroundColor: "#38a169" }}
              >
                Save Registration
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default EditStudentRegistration;