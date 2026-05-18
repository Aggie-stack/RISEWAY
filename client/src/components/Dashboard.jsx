import { useEffect, useState, useCallback } from "react";
import API from "../api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS       = ["#ff4d4f", "#52c41a", "#1890ff", "#fadb14", "#fa8c16"];
const COURSE_COLORS = ["#1890ff", "#52c41a", "#ff4d4f", "#fa8c16", "#722ed1", "#eb2f96"];

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December",
];

const DEFAULT_DATA = {
  total_students:   0,
  total_income:     0,
  active_students:  0,
  expired_students: 0,
  male_students:    0,
  female_students:  0,
  classes:          [],
  mode_gender:      [],
  level_gender:     [],
};

const formatKES = (v) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(v);

const formatNum = (v) => new Intl.NumberFormat("en-KE").format(v);

const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const AVATAR_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#0891b2",
  "#7c3aed", "#db2777", "#b45309", "#0f766e",
];

const avatarColor = (name = "") => {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <>
      <div className="dashboard-grid" style={{ marginBottom: 24 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 320, borderRadius: 12, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 320, borderRadius: 12, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 320, borderRadius: 12, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 220, borderRadius: 12, marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
      </div>
    </>
  );
}

// ─── Mode of Study Pie ────────────────────────────────────────────────────────

function ColoredPie({ data, height = 220 }) {
  const hasData = data && data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div style={{
        height,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-muted, #71717a)", fontSize: 13, textAlign: "center", padding: "0 12px",
      }}>
        No study mode data for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="44%"
          outerRadius={68}
          label={false}
        >
          {data.map((entry, i) => (
            <Cell key={`${entry.name}-${entry.value}`} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v, name) => [v, name]} />
        <Legend iconSize={9} wrapperStyle={{ fontSize: 11, lineHeight: "17px", paddingTop: 4 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Income Chart ─────────────────────────────────────────────────────────────

function IncomeChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        height: 350,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-muted, #71717a)", fontSize: 13,
      }}>
        No income recorded for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          label={{
            value: "Month",
            position: "insideBottom",
            offset: -18,
            style: { fontSize: 13, fill: "#6b7280", fontWeight: 600 },
          }}
          tick={{ fontSize: 13, fill: "#374151" }}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={formatNum}
          label={{
            value: "Income (KES)",
            angle: -90,
            position: "insideLeft",
            offset: -5,
            style: { fontSize: 12, fill: "#6b7280", fontWeight: 600 },
          }}
          tick={{ fontSize: 12, fill: "#6b7280" }}
        />
        <Tooltip formatter={(v) => [formatKES(v), "Income"]} />
        <Bar dataKey="income" radius={[10, 10, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={`${entry.name}-${entry.income}`} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Student Levels Chart ─────────────────────────────────────────────────────

const LEVEL_ORDER  = ["Beginner", "Intermediate", "Advanced"];
const LEVEL_COLORS = { Beginner: "#1890ff", Intermediate: "#52c41a", Advanced: "#ff4d4f" };

function StudentLevelsChart({ data }) {
  const normalised = LEVEL_ORDER.map((lvl) => {
    const found = data.find((d) => (d.name || "").toLowerCase() === lvl.toLowerCase());
    return { name: lvl, value: found ? found.value : 0 };
  });

  const hasData = normalised.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div style={{
        height: 320,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-muted, #71717a)", fontSize: 13,
      }}>
        No student level data for this period.
      </div>
    );
  }

  const CustomLabel = ({ x, y, width, value }) => (
    <text
      x={x + width / 2} y={y - 6}
      textAnchor="middle" fill="#374151" fontSize={13} fontWeight={700}
    >
      {value}
    </text>
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={normalised} margin={{ top: 24, right: 20, left: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          label={{
            value: "Student Level",
            position: "insideBottom",
            offset: -18,
            style: { fontSize: 13, fill: "#6b7280", fontWeight: 600 },
          }}
          tick={{ fontSize: 13, fill: "#374151", fontWeight: 600 }}
        />
        <YAxis
          allowDecimals={false}
          label={{
            value: "Number of Students",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fontSize: 12, fill: "#6b7280", fontWeight: 600 },
          }}
          tick={{ fontSize: 12, fill: "#6b7280" }}
        />
        <Tooltip formatter={(value) => [value, "Students"]} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={80} label={<CustomLabel />}>
          {normalised.map((entry) => (
            <Cell key={entry.name} fill={LEVEL_COLORS[entry.name] ?? "#8884d8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Enrolment by Course ──────────────────────────────────────────────────────
// FIX: backend returns { name, count } — was incorrectly reading course.count ✓

function EnrolmentByCourse({ courses }) {
  if (!courses || !courses.length) {
    return (
      <div className="chart-container">
        <h3>Enrolment by Course</h3>
        <p style={{ marginTop: 16, color: "var(--text-muted, #71717a)", fontSize: 13 }}>
          No course data available for this period.
        </p>
      </div>
    );
  }

  // Backend key is "count"
  const max = Math.max(...courses.map((c) => c.count), 1);

  return (
    <div className="chart-container">
      <h3>Enrolment by Course</h3>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {courses.map((course, i) => (
          <div key={course.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 148, fontSize: 13,
              color: "var(--text-muted, #71717a)",
              flexShrink: 0, fontWeight: 500,
            }}>
              {course.name}
            </span>
            <div style={{
              flex: 1, height: 12,
              background: "var(--border, #e4e4e7)",
              borderRadius: 6, overflow: "hidden",
            }}>
              <div style={{
                width: `${(course.count / max) * 100}%`,
                height: "100%",
                background: COURSE_COLORS[i % COURSE_COLORS.length],
                borderRadius: 6,
                transition: "width 0.4s ease",
              }} />
            </div>
            <span style={{
              width: 36, textAlign: "right", fontSize: 13,
              fontWeight: 600, color: "var(--text, #18181b)", flexShrink: 0,
            }}>
              {course.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Renewals Due Soon ────────────────────────────────────────────────────────
// FIX: backend returns student_name — was reading s.name ✓

function RenewalsDueSoon({ renewals }) {
  if (!renewals || !renewals.length) {
    return (
      <div className="chart-container">
        <h3>🔔 Renewals Due Soon</h3>
        <p style={{ marginTop: 16, color: "var(--text-muted, #71717a)", fontSize: 13 }}>
          No renewals due in the next 7 days.
        </p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>🔔 Renewals Due Soon</h3>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {renewals.map((s) => {
          const daysLeft = Math.ceil(
            (new Date(s.due_date) - new Date()) / (1000 * 60 * 60 * 24)
          );
          const urgent = daysLeft <= 3;
          return (
            <div
              key={`${s.student_id}-${s.due_date}`}
              style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 10,
                border: `1px solid ${urgent ? "#fecaca" : "var(--border, #e4e4e7)"}`,
                background: urgent ? "#fef2f2" : "var(--card, #fff)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: avatarColor(s.student_name),  /* FIX: was s.name */
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {initials(s.student_name)}  {/* FIX: was s.name */}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {s.student_name}  {/* FIX: was s.name */}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted, #71717a)" }}>
                    ID #{s.student_id} · {s.course}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: urgent ? "#b91c1c" : "#b45309",
                }}>
                  {daysLeft <= 0 ? "Today!" : `${daysLeft}d left`}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #71717a)" }}>
                  {new Date(s.due_date).toLocaleDateString("en-KE", {
                    day: "numeric", month: "short",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recent Payments ──────────────────────────────────────────────────────────

function RecentPayments({ payments }) {
  if (!payments || !payments.length) {
    return (
      <div className="chart-container">
        <h3>💳 Recent Payments</h3>
        <p style={{ marginTop: 16, color: "var(--text-muted, #71717a)", fontSize: 13 }}>
          No recent payments found.
        </p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>💳 Recent Payments</h3>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 0 }}>
        {payments.map((p, i) => (
          <div
            key={`${p.id}-${p.date_paid}`}
            style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: i < payments.length - 1
                ? "1px solid var(--border, #e4e4e7)"
                : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: avatarColor(p.student_name), color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>
                {initials(p.student_name)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.student_name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #71717a)" }}>
                  {p.course} · {p.duration} month{p.duration !== 1 ? "s" : ""} ·{" "}
                  {new Date(p.date_paid).toLocaleDateString("en-KE", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#15803d", whiteSpace: "nowrap" }}>
              {formatKES(p.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Period Badge ─────────────────────────────────────────────────────────────

function PeriodBadge({ viewMode, month }) {
  const label = viewMode === "year"
    ? "Full Year"
    : month
      ? MONTHS[month - 1]
      : "All Months";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: viewMode === "year" ? "#eff6ff" : "#f0fdf4",
      color:      viewMode === "year" ? "#1d4ed8" : "#15803d",
      fontSize: 12, fontWeight: 600,
      border: `1px solid ${viewMode === "year" ? "#bfdbfe" : "#bbf7d0"}`,
    }}>
      {viewMode === "year" ? "📅" : "📆"} {label}
    </span>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ refresh }) {
  const [data, setData]                   = useState(DEFAULT_DATA);
  const [month, setMonth]                 = useState(null);
  const [viewMode, setViewMode]           = useState("year");
  const [loading, setLoading]             = useState(true);
  const [courses, setCourses]             = useState([]);
  const [renewals, setRenewals]           = useState([]);
  const [payments, setPayments]           = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("7");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // In month view, send month param when one is selected
      const monthParam = viewMode === "month" && month ? { month } : {};

      const [dashRes, courseRes, renewalRes, paymentRes] = await Promise.allSettled([
        API.get("/dashboard", {
          params:  monthParam,
          headers: { Authorization: `Bearer ${token}` },
        }),
        // FIX: course endpoint also receives the month filter
        API.get("/dashboard/courses", {
          params:  monthParam,
          headers: { Authorization: `Bearer ${token}` },
        }),
        API.get("/dashboard/renewals-due", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        API.get("/dashboard/recent-payments", {
          params:  { days: paymentFilter },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (dashRes.status === "fulfilled") {
        setData({ ...DEFAULT_DATA, ...dashRes.value.data });
      }
      if (courseRes.status === "fulfilled" && Array.isArray(courseRes.value.data)) {
        setCourses(courseRes.value.data);
      }
      if (renewalRes.status === "fulfilled" && Array.isArray(renewalRes.value.data)) {
        setRenewals(renewalRes.value.data);
      }
      if (paymentRes.status === "fulfilled" && Array.isArray(paymentRes.value.data)) {
        setPayments(paymentRes.value.data);
      }
    } catch (err) {
      console.error(err.response?.data ?? err.message);
    } finally {
      setLoading(false);
    }
  }, [refresh, month, viewMode, paymentFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const switchToYear = () => {
    setViewMode("year");
    setMonth(null);
  };

  const switchToMonth = () => setViewMode("month");

  const cards = [
    { label: "Total Students",   value: formatNum(data.total_students),   color: "blue"  },
    { label: "Total Income",     value: formatKES(data.total_income),     color: "green" },
    { label: "Active Students",  value: formatNum(data.active_students),  color: "teal"  },
    { label: "Expired Students", value: formatNum(data.expired_students), color: "red"   },
    { label: "Male Students",    value: formatNum(data.male_students),    color: "teal"  },
    { label: "Female Students",  value: formatNum(data.female_students),  color: "pink"  },
  ];

  const incomeHeading = viewMode === "month" && month
    ? `Income — ${MONTHS[month - 1]}`
    : "Income / Month";

  return (
    <div className="dashboard-container">
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        marginBottom: 20, flexWrap: "wrap",
      }}>
        <h2 style={{ margin: 0 }}>📊 Dashboard</h2>
        <PeriodBadge viewMode={viewMode} month={month} />
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="dashboard-grid" style={{ marginBottom: 20 }}>
            {cards.map(({ label, value, color }) => (
              <div key={label} className={`card ${color}`}>
                <h3>{label}</h3>
                <p>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Filters ── */}
          <div className="filter-row" style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>

              {/* View toggle */}
              <button
                onClick={switchToYear}
                style={{
                  fontWeight:  viewMode === "year" ? 700 : 400,
                  background:  viewMode === "year" ? "#eff6ff" : undefined,
                  borderColor: viewMode === "year" ? "#1d4ed8" : undefined,
                  color:       viewMode === "year" ? "#1d4ed8" : undefined,
                }}
              >
                📅 Year View
              </button>

              <button
                onClick={switchToMonth}
                style={{
                  fontWeight:  viewMode === "month" ? 700 : 400,
                  background:  viewMode === "month" ? "#f0fdf4" : undefined,
                  borderColor: viewMode === "month" ? "#15803d" : undefined,
                  color:       viewMode === "month" ? "#15803d" : undefined,
                }}
              >
                📆 Month View
              </button>

              {/* Month picker — only visible in month view */}
              {viewMode === "month" && (
                <select
                  value={month ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMonth(val ? Number(val) : null);
                  }}
                >
                  <option value="">All Months</option>
                  {MONTHS.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              )}

              <span style={{ color: "var(--border, #e4e4e7)", fontSize: 18 }}>|</span>

              {/* Payment range filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="7">Payments: Last 7 days</option>
                <option value="30">Payments: Last 30 days</option>
                <option value="all">Payments: All time</option>
              </select>
            </div>
          </div>

          {/* ── Row 1: four side-by-side panels ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 16,
            alignItems: "start",
          }}>
            <div className="chart-container" style={{ height: 340, overflow: "hidden" }}>
              <h3>Mode of Study</h3>
              <ColoredPie data={data.mode_gender} />
            </div>

            <EnrolmentByCourse courses={courses} />
            <RecentPayments payments={payments} />
            <RenewalsDueSoon renewals={renewals} />
          </div>

          {/* ── Row 2: Student Levels ── */}
          <div className="chart-container" style={{ marginBottom: 16 }}>
            <h3>Student Levels</h3>
            <StudentLevelsChart data={data.level_gender} />
          </div>

          {/* ── Row 3: Income chart ── */}
          <div className="chart-container">
            <h3>{incomeHeading}</h3>
            <IncomeChart data={data.classes} />
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;