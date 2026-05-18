import { FaEdit, FaTrash } from "react-icons/fa";

function ActionButtons({ student, onHistory, onEdit, onDelete }) {
  return (
    <div className="actions-cell">
      <button
        className="icon-btn"
        data-tooltip="Payment History"
        onClick={() => onHistory(student)}
      >
        💰
      </button>

      <button
        className="icon-btn edit"
        data-tooltip="Edit Student"
        onClick={() => onEdit(student)}
      >
        <FaEdit />
      </button>

      <button
        className="icon-btn delete"
        data-tooltip="Delete Student"
        onClick={() => onDelete(student)}
      >
        <FaTrash />
      </button>
    </div>
  );
}

export default ActionButtons;