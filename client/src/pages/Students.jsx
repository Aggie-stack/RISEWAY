import { useState, useEffect } from "react";
import RegisterStudent from "../components/RegisterStudent";
import RenewalPayment from "../components/RenewalPayment";
import StudentList from "../components/StudentList";
import API from "../api";
import socket from "../socket";

// ─── Constants ─────────────────────────────────────────────────────────────────

const LOGO_URL          = "/logo.png";
const NOTIFICATIONS_KEY = "riseway_notifications"; // localStorage key

// ─── Helpers ───────────────────────────────────────────────────────────────────

const loadNotifications = () => {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveNotifications = (notifications) => {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch {
    // storage full or unavailable — fail silently
  }
};

// ─── Receipt Modal ─────────────────────────────────────────────────────────────

function ReceiptModal({ receipt, onClose }) {

  const getReceiptHTML = () => `
    <html>
      <head>
        <title>Receipt ${receipt.receiptNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', Arial, sans-serif;
            padding: 36px 32px;
            color: #18181b;
            background: #fff;
            width: 420px;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 14px;
            padding-bottom: 18px;
            margin-bottom: 20px;
            border-bottom: 3px solid #dc2626;
          }
          .logo {
            width: 60px;
            height: 60px;
            object-fit: contain;
            flex-shrink: 0;
          }
          .school-info { flex: 1; }
          .school-name {
            font-size: 16px;
            font-weight: 800;
            color: #dc2626;
            line-height: 1.2;
          }
          .school-tagline {
            font-size: 11px;
            color: #71717a;
            font-style: italic;
            margin-top: 2px;
          }
          .receipt-title {
            font-size: 13px;
            font-weight: 700;
            color: #18181b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
          }
          .receipt-no {
            text-align: center;
            background: #fef2f2;
            border: 1px dashed #dc2626;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 22px;
            font-size: 14px;
            color: #dc2626;
            font-weight: 700;
            letter-spacing: 1px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f4f4f5;
            font-size: 13px;
          }
          .label { color: #71717a; font-weight: 500; }
          .value { font-weight: 600; color: #18181b; }
          .total-box {
            background: #18181b;
            color: white;
            padding: 14px 16px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            margin-top: 18px;
            font-size: 15px;
            font-weight: 700;
          }
          .due-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            color: #15803d;
            padding: 10px 16px;
            border-radius: 10px;
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            font-size: 13px;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            margin-top: 26px;
            font-size: 11px;
            color: #a1a1aa;
            border-top: 1px solid #f4f4f5;
            padding-top: 14px;
            line-height: 1.8;
          }
          .footer strong {
            display: block;
            color: #dc2626;
            font-size: 12px;
            margin-bottom: 2px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img class="logo" src="${receipt.logoUrl}" alt="Logo" />
          <div class="school-info">
            <div class="school-name">Riseway Training College</div>
            <div class="school-tagline">"Your Future, Our Mission"</div>
            <div class="receipt-title">Payment Receipt</div>
          </div>
        </div>

        <div class="receipt-no">${receipt.receiptNo}</div>

        <div class="row">
          <span class="label">Student Name</span>
          <span class="value">${receipt.studentName}</span>
        </div>
        <div class="row">
          <span class="label">Adm No</span>
          <span class="value">${receipt.admissionNumber || "—"}</span>
        </div>
        <div class="row">
          <span class="label">Date Paid</span>
          <span class="value">${receipt.datePaid}</span>
        </div>
        <div class="row">
          <span class="label">Duration</span>
          <span class="value">${receipt.duration} Month(s)</span>
        </div>
        <div class="row">
          <span class="label">Issued At</span>
          <span class="value">${receipt.issuedAt}</span>
        </div>

        <div class="total-box">
          <span>Amount Paid</span>
          <span>KSh ${Number(receipt.amount).toLocaleString()}</span>
        </div>

        <div class="due-box">
          <span>Subscription Due</span>
          <span>${receipt.dueDate}</span>
        </div>

        <div class="footer">
          <strong>Riseway Training College</strong>
          "Your Future, Our Mission"<br/>
          Thank you for your payment. Please keep this receipt for your records.
        </div>
      </body>
    </html>
  `;

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=480,height=720");
    w.document.write(getReceiptHTML());
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const handleDownload = () => {
    const blob = new Blob([getReceiptHTML()], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `Receipt-${receipt.receiptNo}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 480 }}>

        {/* ── Modal Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingBottom: 16,
          marginBottom: 20,
          borderBottom: "2px solid #dc2626",
        }}>
          <img
            src={LOGO_URL}
            alt="Riseway Logo"
            style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8 }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626", lineHeight: 1.2 }}>
              Riseway Training College
            </div>
            <div style={{ fontSize: 11, color: "#71717a", fontStyle: "italic" }}>
              "Your Future, Our Mission"
            </div>
          </div>
        </div>

        {/* ── Receipt Badge ── */}
        <div style={{
          textAlign: "center",
          background: "#fef2f2",
          border: "1px dashed #dc2626",
          borderRadius: 8,
          padding: "10px",
          marginBottom: 20,
          fontSize: 14,
          fontWeight: 700,
          color: "#dc2626",
          letterSpacing: 1,
        }}>
          {receipt.receiptNo}
        </div>

        {/* ── Receipt Rows ── */}
        {[
          ["Student Name", receipt.studentName],
          ["Adm No",       receipt.admissionNumber || "—"],
          ["Amount",       `KSh ${Number(receipt.amount).toLocaleString()}`],
          ["Date Paid",    receipt.datePaid],
          ["Duration",     `${receipt.duration} Month(s)`],
          ["Due Date",     receipt.dueDate],
          ["Issued At",    receipt.issuedAt],
        ].map(([label, value]) => (
          <div key={label} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderBottom: "1px solid #f4f4f5",
            fontSize: 13,
          }}>
            <span style={{ color: "#71717a", fontWeight: 500 }}>{label}</span>
            <span style={{ fontWeight: 600, color: "#18181b" }}>{value}</span>
          </div>
        ))}

        {/* ── Amount Total ── */}
        <div style={{
          background: "#18181b",
          color: "white",
          padding: "13px 16px",
          borderRadius: 10,
          display: "flex",
          justifyContent: "space-between",
          marginTop: 16,
          fontSize: 15,
          fontWeight: 700,
        }}>
          <span>Amount Paid</span>
          <span>KSh {Number(receipt.amount).toLocaleString()}</span>
        </div>

        {/* ── Due Date ── */}
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#15803d",
          padding: "10px 16px",
          borderRadius: 10,
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          fontSize: 13,
          fontWeight: 600,
        }}>
          <span>Subscription Due</span>
          <span>{receipt.dueDate}</span>
        </div>

        {/* ── Action Buttons ── */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={handlePrint}    style={{ flex: 1, background: "#18181b" }}>🖨️ Print</button>
          <button onClick={handleDownload} style={{ flex: 1, background: "#15803d" }}>⬇️ Download</button>
          <button onClick={onClose}        style={{ flex: 1, background: "#71717a" }}>Close</button>
        </div>

      </div>
    </div>
  );
}


// ─── Students Page ─────────────────────────────────────────────────────────────

function Students() {
  const [refresh, setRefresh]                     = useState(0);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal]   = useState(false);
  const [receipt, setReceipt]                     = useState(null);
  const [receiptLoading, setReceiptLoading]       = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);

  // ── Load notifications from localStorage on first render ──
  const [notifications, setNotifications] = useState(loadNotifications);

  const role = localStorage.getItem("role");
  const canManageStudents = role === "receptionist";

  const triggerRefresh = () => setRefresh((r) => r + 1);

  // ── Persist notifications to localStorage whenever they change ──
  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // ─────────────────────────────
  // RECEIPT
  // ─────────────────────────────

  const buildReceipt = async (studentId) => {
    const [payRes, stuRes] = await Promise.all([
      API.get(`/payments/${studentId}`),
      API.get(`/students/${studentId}`),
    ]);

    const payments = payRes.data;
    const student  = stuRes.data;

    if (payments && payments.length > 0) {
      const latest = [...payments].sort((a, b) => b.id - a.id)[0];
      return {
        receiptNo:       `REC-${String(latest.id).padStart(4, "0")}`,
        studentName:     student.name,
        admissionNumber: student.admission_number,
        amount:          latest.amount,
        datePaid:        latest.date_paid,
        duration:        latest.duration,
        dueDate:         latest.due_date,
        issuedAt:        new Date().toLocaleString(),
        logoUrl:         window.location.origin + LOGO_URL,
      };
    }
    return null;
  };

  const handlePaymentAdded = async (studentId, closeModal) => {
    setReceiptLoading(true);
    try {
      const r = await buildReceipt(studentId);
      if (r) setReceipt(r);
    } catch (err) {
      console.error("Could not load receipt data:", err);
    } finally {
      setReceiptLoading(false);
    }
    triggerRefresh();
    closeModal();
  };


// ─────────────────────────────
// SOCKET — real-time notifications
// ─────────────────────────────

useEffect(() => {
  const handleConnect = () =>
    console.log("Socket connected:", socket.id);

  // Registration notification
  const handleNewStudent = (data) => {
    setNotifications((prev) => {
      const updated = [
        {
          id: Date.now(),
          message: `New student registered: ${data.student.name}`,
          student: data.student,
          time: new Date().toLocaleTimeString(),
          read: false,
          type: "registration",
        },
        ...prev,
      ];

      saveNotifications(updated);
      return updated;
    });
  };

  // Renewal notification
  const handleStudentRenewed = (data) => {
    setNotifications((prev) => {
      const updated = [
        {
          id: Date.now(),
          message: `${data.student.name} renewed subscription`,
          student: data.student,
          time: new Date().toLocaleTimeString(),
          read: false,
          type: "renewal",
        },
        ...prev,
      ];

      saveNotifications(updated);
      return updated;
    });
  };

  // Listen for registration events
  socket.on("new_student", handleNewStudent);

  // Listen for renewal events
  socket.on("student_renewed", handleStudentRenewed);

  // Connection event
  socket.on("connect", handleConnect);

  return () => {
    socket.off("connect", handleConnect);
    socket.off("new_student", handleNewStudent);
    socket.off("student_renewed", handleStudentRenewed);
  };
}, []);
  // ─────────────────────────────
  // NOTIFICATIONS DROPDOWN
  // ─────────────────────────────

  useEffect(() => {
    if (!openNotifications) return;
    const handleClickOutside = () => setOpenNotifications(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  // ── Clear all notifications ──
  const clearAllNotifications = () => setNotifications([]);

  // ─────────────────────────────
  // UI
  // ─────────────────────────────

  return (
    <div className="page-container">

      {/* ── Notification bell fixed to top-right corner ── */}
      <div style={{
        position: "fixed",
        top: 16,
        right: 20,
        zIndex: 1100,
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenNotifications((o) => !o);
          }}
          style={{
            background: "#18181b",
            color: "white",
            borderRadius: 8,
            padding: "8px 14px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            border: "none",
          }}
        >
          🔔 Notifications

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: -5,
              right: -5,
              background: "#dc2626",
              color: "white",
              borderRadius: "50%",
              width: 18,
              height: 18,
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {openNotifications && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: "42px",
              width: 320,
              background: "white",
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              zIndex: 1100,
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
            {/* Dropdown header */}
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid #eee",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              top: 0,
              background: "white",
            }}>
              <strong style={{ fontSize: 13 }}>
                Notifications
                {notifications.length > 0 && (
                  <span style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 400,
                    color: "#999",
                  }}>
                    ({notifications.length})
                  </span>
                )}
              </strong>

              {/* Header actions */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 500,
                    }}
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 500,
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Notification items */}
            {notifications.length === 0 ? (
              <div style={{
                padding: "20px 14px",
                color: "#999",
                fontSize: 13,
                textAlign: "center",
              }}>
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid #f4f4f4",
                    background: n.read ? "white" : "#eff6ff",
                  }}
                >
                  {/* Message */}
                  <div style={{ fontSize: 13, color: "#18181b" }}>
                    {n.message}
                  </div>

                  {/* Time */}
                  <div style={{ marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: "#999" }}>
                      {n.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <h1 className="page-title">Student Registration & Management System</h1>

      {/* ── Action buttons ── */}
      {canManageStudents && (
        <div className="top-actions">
          <button onClick={() => setShowRegisterModal(true)}>
            + Register Student
          </button>
          <button
            onClick={() => setShowRenewalModal(true)}
            style={{ background: "#15803d" }}
          >
            ↻ Renew Student
          </button>
        </div>
      )}

      {/* ── Receipt loading feedback ── */}
      {receiptLoading && (
        <div style={{
          padding: "10px 14px",
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: 8,
          fontSize: 13,
          color: "#0369a1",
          marginBottom: 12,
        }}>
          ⏳ Loading receipt...
        </div>
      )}

      {/* ── Register Modal ── */}
      {showRegisterModal && (
        <div className="modal-overlay">
          <div className="modal">
            <RegisterStudent
              onStudentAdded={(id) =>
                handlePaymentAdded(id, () => setShowRegisterModal(false))
              }
            />
            <button
              onClick={() => setShowRegisterModal(false)}
              style={{ marginTop: 10, background: "#71717a", width: "100%" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Renewal Modal ── */}
      {showRenewalModal && (
        <div className="modal-overlay">
          <div className="modal">
            <RenewalPayment
              onRenewalAdded={(id) =>
                handlePaymentAdded(id, () => setShowRenewalModal(false))
              }
            />
            <button
              onClick={() => setShowRenewalModal(false)}
              style={{ marginTop: 10, background: "#71717a", width: "100%" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {receipt && (
        <ReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
      )}

      {/* ── Student List ── */}
      <StudentList
        refresh={refresh}
        triggerRefresh={triggerRefresh}
      />

    </div>
  );
}

export default Students;