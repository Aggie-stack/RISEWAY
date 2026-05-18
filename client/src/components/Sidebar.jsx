import { NavLink, useNavigate } from "react-router-dom";
import { FaHome, FaUserGraduate, FaMoneyBill, FaMoon, FaSun, FaCog } from "react-icons/fa";

function Sidebar({ darkMode, toggleTheme }) {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "receptionist";
  const username = localStorage.getItem("username") || "User";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    navigate("/login");
  };

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const roleColor = role === "director" ? "#e53e3e" : role === "admin" ? "#dd6b20" : "#3182ce";

  return (
    <div className="sidebar">
      {/* LOGO + SCHOOL NAME */}
      <div className="sidebar-brand">
        <img src="/MainLogo.png" alt="RC" className="sidebar-logo" />
        <div className="sidebar-brand-text">
          <span className="sidebar-school">Riseway</span>
          <span className="sidebar-college">Training College</span>
        </div>
      </div>

      {/* USER BADGE */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {username.charAt(0).toUpperCase()}
        </div>
        <div className="sidebar-user-info">
          <span className="sidebar-username">{username}</span>
          <span className="sidebar-role-badge" style={{ background: roleColor }}>
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        {/* Dashboard: Director only */}
        {role === "director" && (
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
            <FaHome className="sidebar-icon" />
            <span>Dashboard</span>
          </NavLink>
        )}

        {/* Students: All roles */}
        <NavLink to="/students" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          <FaUserGraduate className="sidebar-icon" />
          <span>Students</span>
        </NavLink>

        {/* Payments: Director + Admin */}
        {(role === "director" || role === "admin") && (
          <NavLink to="/payments" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
            <FaMoneyBill className="sidebar-icon" />
            <span>Payments</span>
          </NavLink>
        )}

        {/* Settings: All roles */}
        <NavLink to="/settings" className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
          <FaCog className="sidebar-icon" />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar-divider" />

      {/* BOTTOM ACTIONS */}
      <div className="sidebar-bottom">
        <button className="sidebar-link sidebar-btn" onClick={toggleTheme}>
          {darkMode ? <FaSun className="sidebar-icon" /> : <FaMoon className="sidebar-icon" />}
          <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <button className="sidebar-link sidebar-btn logout-btn" onClick={logout}>
          <span className="sidebar-icon">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
