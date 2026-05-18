import { useEffect, useState, useCallback } from "react";
import API from "../api";

import StudentTable from "./StudentTable";
import SearchFilter from "./SearchFilter";
import EditStudentRegistration from "./EditStudentRegistration"; // ← renamed
import PaymentHistoryModal from "./PaymentHistoryModal";
import DeleteModal from "./DeleteModal";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StudentListSkeleton() {
  return (
    <>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="skeleton" style={{ height: 40, width: 220, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 40, width: 140, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 40, width: 140, borderRadius: 8 }} />
        <div className="skeleton" style={{ height: 40, width: 140, borderRadius: 8 }} />
      </div>
      <div className="skeleton" style={{ height: 44, borderRadius: "8px 8px 0 0", marginBottom: 2 }} />
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 48, borderRadius: 0, marginBottom: 2, opacity: 1 - i * 0.08 }}
        />
      ))}
    </>
  );
}

// ─── StudentList ──────────────────────────────────────────────────────────────

function StudentList({ refresh, triggerRefresh }) {
  const [students, setStudents]                 = useState([]);
  const [loading, setLoading]                   = useState(true);

  const [search, setSearch]                     = useState("");
  const [statusFilter, setStatusFilter]         = useState("All");
  const [membershipFilter, setMembershipFilter] = useState("All");
  const [modeFilter, setModeFilter]             = useState("All");
  const [levelFilter, setLevelFilter]           = useState("All");

  const [editStudent, setEditStudent]           = useState(null);
  const [editStep, setEditStep]                 = useState(1);
  const [paymentData, setPaymentData]           = useState({ id: null, amount: "", date_paid: "", duration: "" });

  const [deleteStudent, setDeleteStudent]       = useState(null);
  const [selectedStudent, setSelectedStudent]   = useState(null);
  const [paymentHistory, setPaymentHistory]     = useState([]);
  const [editPayment, setEditPayment]           = useState(null);

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/students");
      setStudents(res.data);
    } catch {
      alert("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // ─── Edit ────────────────────────────────────────────────────────────────────

  const openEditModal = (student) => {
    setEditStudent({ ...student });
    setEditStep(1);
    setPaymentData({
      id:        student.payment_id || null,
      amount:    student.amount     || "",
      date_paid: student.date_paid  || "",
      duration:  student.duration   || "",
    });
  };

  const handleUpdateStudent = async () => {
    await API.put(`/students/${editStudent.id}`, editStudent);
    setEditStep(2);
  };

  const handleSaveAll = async () => {
    try {
      await API.put(`/students/${editStudent.id}`, editStudent);
      await API.post("/payments/upsert", {
        id:         paymentData.id,
        student_id: editStudent.id,
        amount:     paymentData.amount,
        date_paid:  paymentData.date_paid,
        duration:   paymentData.duration,
      });
      setEditStudent(null);
      setEditStep(1);
      setPaymentData({ id: null, amount: "", date_paid: "", duration: "" });
      fetchStudents();
      triggerRefresh();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  // ─── Payment history ─────────────────────────────────────────────────────────

  const openPaymentHistory = async (student) => {
    setSelectedStudent(student);
    const res = await API.get(`/payments/${student.id}`);
    setPaymentHistory(res.data);
  };

  const updatePayment = async () => {
    await API.put(`/payments/${editPayment.id}`, editPayment);
    setEditPayment(null);
    const res = await API.get(`/payments/${selectedStudent.id}`);
    setPaymentHistory(res.data);
    fetchStudents();
    triggerRefresh();
  };

  const deletePayment = async (id) => {
    await API.delete(`/payments/${id}`);
    const res = await API.get(`/payments/${selectedStudent.id}`);
    setPaymentHistory(res.data);
    fetchStudents();
    triggerRefresh();
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    await API.delete(`/students/${deleteStudent.id}`);
    setDeleteStudent(null);
    fetchStudents();
    triggerRefresh();
  };

  // ─── Filter ──────────────────────────────────────────────────────────────────

  const filteredStudents = students.filter((s) => {
    const text = search.toLowerCase();
    const matchesSearch =
      !text ||
      s.name?.toLowerCase().includes(text) ||
      s.course?.toLowerCase().includes(text) ||
      String(s.phone || "").toLowerCase().includes(text);

    return (
      matchesSearch &&
      (statusFilter     === "All" || s.status === statusFilter) &&
      (modeFilter       === "All" || s.mode   === modeFilter) &&
      (levelFilter      === "All" || s.level  === levelFilter) &&
      (membershipFilter === "All" ||
        (membershipFilter === "Yes" && s.membership) ||
        (membershipFilter === "No"  && !s.membership))
    );
  });

  const role = localStorage.getItem("role");

  const canManageStudents =
    role === "receptionist";

  const canViewOnly =
   role === "admin" || role === "director";

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      <h2>Students List</h2>

      {loading ? (
        <StudentListSkeleton />
      ) : (
        <>
          <SearchFilter
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            membershipFilter={membershipFilter}
            setMembershipFilter={setMembershipFilter}
            modeFilter={modeFilter}
            setModeFilter={setModeFilter}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
          />
          <StudentTable
            students={filteredStudents}
            onHistory={openPaymentHistory}
            onEdit={canManageStudents ? openEditModal : null}
            onDelete={canManageStudents ? setDeleteStudent : null}
            canManageStudents={canManageStudents}
          />
        </>
      )}

      {editStudent && (
        <EditStudentRegistration   // ← renamed
          editStudent={editStudent}
          setEditStudent={setEditStudent}
          editStep={editStep}
          setEditStep={setEditStep}
          paymentData={paymentData}
          setPaymentData={setPaymentData}
          handleUpdateStudent={handleUpdateStudent}
          handleSaveAll={handleSaveAll}
        />
      )}

      {selectedStudent && (
        <PaymentHistoryModal
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          paymentHistory={paymentHistory}
          editPayment={editPayment}
          setEditPayment={setEditPayment}
          updatePayment={updatePayment}
          deletePayment={deletePayment}
        />
      )}

      {deleteStudent && (
        <DeleteModal
          deleteStudent={deleteStudent}
          setDeleteStudent={setDeleteStudent}
          confirmDelete={confirmDelete}
        />
      )}
    </div>
  );
}

export default StudentList;