import { useState } from "react";
import API from "../api";

function Settings() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // ADD THESE
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const role = localStorage.getItem("role") || "";
  const username = localStorage.getItem("username") || "";

  const handleChangePassword = async () => {
    setMsg("");
    setError("");

    if (!oldPassword || !newPassword || !confirm) {
      setError("All fields are required.");
      return;
    }

    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await API.post(
        "/change-password",
        {
          old_password: oldPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMsg("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to change password."
      );
    }
  };

  return (
    <div className="settings-page">
      <h2 className="settings-title">⚙️ Settings</h2>

      <div className="settings-card">
        <h3>Account Information</h3>

        <div className="settings-info-row">
          <span className="settings-label">Username</span>
          <span className="settings-value">{username}</span>
        </div>

        <div className="settings-info-row">
          <span className="settings-label">Role</span>

          <span className="settings-value settings-role">
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        </div>
      </div>

      <div className="settings-card">
        <h3>Change Password</h3>

        {/* CURRENT PASSWORD */}
        <div className="settings-field">
          <label>Current Password</label>

          <div className="password-wrapper">
            <input
              type={showOldPassword ? "text" : "password"}
              placeholder="Current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />

            <button
              type="button"
              className="show-hide-btn"
              onClick={() =>
                setShowOldPassword(!showOldPassword)
              }
            >
              {showOldPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* NEW PASSWORD */}
        <div className="settings-field">
          <label>New Password</label>

          <div className="password-wrapper">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <button
              type="button"
              className="show-hide-btn"
              onClick={() =>
                setShowNewPassword(!showNewPassword)
              }
            >
              {showNewPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="settings-field">
          <label>Confirm New Password</label>

          <div className="password-wrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />

            <button
              type="button"
              className="show-hide-btn"
              onClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {msg && (
          <p className="settings-success">{msg}</p>
        )}

        {error && (
          <p className="settings-error">{error}</p>
        )}

        <button
          className="settings-btn"
          onClick={handleChangePassword}
        >
          Update Password
        </button>
      </div>
    </div>
  );
}

export default Settings;