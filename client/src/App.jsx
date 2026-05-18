import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Login from "./pages/Login";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import RegisterStudent from "./components/RegisterStudent";
import RenewalPayment from "./components/RenewalPayment";

const Dashboard = lazy(() => import("./pages/DashboardPage"));
const Students  = lazy(() => import("./pages/Students"));
const Payments  = lazy(() => import("./pages/Payments"));
const Settings  = lazy(() => import("./pages/Settings"));

const ROUTES = [
  { path: "dashboard", element: <Dashboard />, allowed: ["director"] },
  { path: "students",  element: <Students />,  allowed: ["director", "admin", "receptionist"] },
  { path: "payments",  element: <Payments />,  allowed: ["director", "admin"] },
  { path: "settings",  element: <Settings />,  allowed: ["director", "admin", "receptionist"] },
  {
    path: "register",
    element: (
      <div style={{ display: "flex", gap: 24, padding: "28px", flexWrap: "wrap" }}>
        <RegisterStudent onStudentAdded={(id) => console.log("Student added:", id)} />
        <RenewalPayment  onRenewalAdded={(id) => console.log("Renewal recorded:", id)} />
      </div>
    ),
    allowed: ["director", "admin", "receptionist"],
  },
];

const role = localStorage.getItem("role");
const defaultPath = role === "director" ? "/dashboard" : "/students";

function PageSkeleton() {
  return (
    <div style={{ padding: "28px" }}>
      <div className="skeleton" style={{ width: 180, height: 28, marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to={defaultPath} replace />} />

          {ROUTES.map(({ path, element, allowed }) => (
            <Route
              key={path}
              path={path}
              element={
                <RoleRoute allowed={allowed}>
                  <Suspense fallback={<PageSkeleton />}>
                    {element}
                  </Suspense>
                </RoleRoute>
              }
            />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;