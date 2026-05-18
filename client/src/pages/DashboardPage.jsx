import { useState } from "react";
import Dashboard from "../components/Dashboard";

function DashboardPage() {
  const [refresh] = useState(0);
  return (
    <div>
      <Dashboard refresh={refresh} />
    </div>
  );
}

export default DashboardPage;
