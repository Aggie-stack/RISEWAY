function DeleteModal({
  deleteStudent,
  setDeleteStudent,
  confirmDelete,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Delete Student</h3>

        <p>
          Are you sure you want to delete{" "}
          <b>{deleteStudent.name}</b>?
          <br />
          <br />
          ⚠️ This will permanently delete:
          <br />• Student record
          <br />• All payment history
        </p>

        <div className="modal-actions">
          <button onClick={() => setDeleteStudent(null)}>
            Cancel
          </button>

          <button className="danger" onClick={confirmDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteModal;