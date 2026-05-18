import { FaEdit, FaTrash, FaSave } from "react-icons/fa";

function PaymentHistoryModal({
  selectedStudent,
  setSelectedStudent,
  paymentHistory,
  editPayment,
  setEditPayment,
  updatePayment,
  deletePayment,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">

        <h3>
          Payment History - {selectedStudent.name}
        </h3>

        {paymentHistory.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Amount</th>
                <th>Date Paid</th>
                <th>Duration</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paymentHistory.map((p) => {
                const isExpired = new Date(p.due_date) < new Date();

                return (
                  <tr
                    key={p.id}
                    className={isExpired ? "expired-row" : ""}
                  >

                    {/* AMOUNT */}
                    <td>
                      {editPayment?.id === p.id ? (
                        <input
                          value={editPayment.amount}
                          onChange={(e) =>
                            setEditPayment({
                              ...editPayment,
                              amount: e.target.value,
                            })
                          }
                        />
                      ) : (
                        p.amount
                      )}
                    </td>

                    {/* DATE PAID */}
                    <td>
                      {editPayment?.id === p.id ? (
                        <input
                          type="date"
                          value={editPayment.date_paid}
                          onChange={(e) =>
                            setEditPayment({
                              ...editPayment,
                              date_paid: e.target.value,
                            })
                          }
                        />
                      ) : (
                        p.date_paid
                      )}
                    </td>

                    {/* DURATION */}
                    <td>{p.duration}</td>

                    {/* DUE DATE */}
                    <td>{p.due_date}</td>

                    {/* ACTIONS */}
                    <td className="payment-actions">

                      {editPayment?.id === p.id ? (
                        <button
                          className="save-payment-btn"
                          onClick={updatePayment}
                        >
                          <FaSave />
                        </button>
                      ) : (
                        <button
                          className="edit-payment-btn"
                          onClick={() => setEditPayment(p)}
                        >
                          <FaEdit />
                        </button>
                      )}

                      <button
                        className="delete-payment-btn"
                        onClick={() => deletePayment(p.id)}
                      >
                        <FaTrash />
                      </button>

                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>No payment history found</p>
        )}

        <div className="modal-actions">
          <button onClick={() => setSelectedStudent(null)}>
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

export default PaymentHistoryModal;