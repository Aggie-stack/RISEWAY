import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("director");
  const [loading, setLoading] = useState(false);

  // ADD THIS
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Please enter username and password");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/login", { username, password });

      if (res.data?.token) {
        const serverRole = res.data.role;

        if (role !== serverRole) {
          alert(
            `This account is registered as "${serverRole}", not "${role}". Logging you in as ${serverRole}.`
          );
        }

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", serverRole);
        localStorage.setItem("username", username);

        if (serverRole === "director") navigate("/dashboard");
        else navigate("/students");
      } else {
        alert("Invalid response from server");
      }
    } catch (error) {
      alert(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="login-page">
      <div className="login-bg-grid" />

      <div className="login-card">
        {/* LEFT PANEL */}
        <div className="login-brand">
          <div className="login-logo-wrap">
            <img
              src="/MainLogo.png"
              alt="Riseway Logo"
              className="login-logo"
            />
          </div>

          <h1 className="brand-name">Riseway Training College</h1>
          <p className="brand-tagline">"Your Future, Our Mission"</p>

          <div className="brand-divider" />

          <div className="brand-roles">
            <p className="brand-roles-title">System Access Levels</p>

            <div className="brand-role-item">
              <span className="role-dot director-dot" />
              Director — Full Access
            </div>

            <div className="brand-role-item">
              <span className="role-dot admin-dot" />
              Admin — Students & Payments
            </div>

            <div className="brand-role-item">
              <span className="role-dot receptionist-dot" />
              Receptionist — Students Only
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">
              Sign in to your account
            </p>

            <div className="role-selector">
              {["director", "admin", "receptionist"].map((r) => (
                <button
                  key={r}
                  className={`role-btn ${
                    role === r ? "role-btn-active" : ""
                  }`}
                  onClick={() => setRole(r)}
                  type="button"
                >
                  {r === "director"
                    ? "🎓"
                    : r === "admin"
                    ? "🛠️"
                    : "📋"}

                  <span>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </span>
                </button>
              ))}
            </div>

            <div className="login-field">
              <label>Username</label>

              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKey}
                autoComplete="username"
              />
            </div>

            {/* PASSWORD FIELD */}
            <div className="login-field">
              <label>Password</label>

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKey}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="show-hide-btn"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <p className="forgot">
              Forgot Password? Contact Administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;