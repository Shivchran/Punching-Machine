
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  UserPlus,
  CalendarDays,
  Download,
  LogOut,
  RefreshCw,
} from "lucide-react";

import api from "../services/api";

function AdminDashboard() {
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    userId: "",
    email: "",
    password: "",
  });

  const admin = JSON.parse(
    localStorage.getItem("employee") || "{}"
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("employee");
    navigate("/", { replace: true });
  };

  const fetchAttendance = async () => {
    try {
      setError("");

      const response = await api.get("/admin/attendance");

      setAttendance(response.data.attendance || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load attendance records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setCreating(true);

    try {
      const response = await api.post(
        "/admin/employees",
        form
      );

      setSuccess(
        response.data.message || "Employee created successfully."
      );

      setForm({
        name: "",
        userId: "",
        email: "",
        password: "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create employee."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadExcel = async () => {
    setError("");
    setDownloading(true);

    try {
      const response = await api.get(
        "/admin/attendance/export",
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "Attendance_Report.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Unable to download Excel report.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <ShieldCheck size={30} />

          <div>
            <h2>BRILLER</h2>
            <p>Admin Panel</p>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button
            className="active"
            onClick={() =>
              window.scrollTo({ top: 0, behavior: "smooth" })
            }
          >
            <ShieldCheck size={19} />
            Dashboard
          </button>

          <button
            onClick={() =>
              document
                .getElementById("create-employee")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <UserPlus size={19} />
            Create Employee
          </button>

          <button
            onClick={() =>
              document
                .getElementById("admin-attendance")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <CalendarDays size={19} />
            Attendance
          </button>
        </nav>

        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            width: "100%",
            padding: "13px 14px",
            marginTop: "auto",
            color: "#fecaca",
            background: "transparent",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <LogOut size={19} />
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage employees and attendance records</p>
          </div>

          <div className="dashboard-user">
            <ShieldCheck size={25} />

            <div>
              <h4>{admin.name || "Administrator"}</h4>
              <p>Administrator</p>
            </div>
          </div>
        </header>

        <section className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>

            <div>
              <h3>Attendance Records</h3>
              <strong>{loading ? "..." : attendance.length}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <CalendarDays size={24} />
            </div>

            <div>
              <h3>Completed Records</h3>
              <strong>
                {attendance.filter((item) => item.checkOut).length}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <UserPlus size={24} />
            </div>

            <div>
              <h3>Pending Check-out</h3>
              <strong>
                {
                  attendance.filter(
                    (item) => item.checkIn && !item.checkOut
                  ).length
                }
              </strong>
            </div>
          </div>
        </section>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {success && (
          <div className="login-success">
            {success}
          </div>
        )}

        <section
          className="attendance-panel"
          id="create-employee"
        >
          <h2>
            <UserPlus size={22} /> Create New Employee
          </h2>

          <p>
            Create employee login credentials.
          </p>

          <form
            onSubmit={handleCreateEmployee}
            className="admin-employee-form"
          >
            <div className="admin-form-grid">
              <div>
                <label>Employee Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter employee name"
                  value={form.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label>Employee ID</label>
                <input
                  type="text"
                  name="userId"
                  placeholder="Example: EMP004"
                  value={form.userId}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label>Company Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="employee@company.com"
                  value={form.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <label>Temporary Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleInputChange}
                  minLength={8}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={creating}
            >
              <UserPlus size={18} />
              {creating ? "Creating..." : "Create Employee"}
            </button>
          </form>
        </section>

        <section
          className="recent-panel"
          id="admin-attendance"
        >
          <div className="admin-section-header">
            <div>
              <h2>Attendance Records</h2>
              <p>View employee attendance history</p>
            </div>

            <div className="admin-actions">
              <button
                onClick={fetchAttendance}
                disabled={loading}
                title="Refresh attendance"
              >
                <RefreshCw size={17} />
                Refresh
              </button>

              <button
                onClick={handleDownloadExcel}
                disabled={downloading}
              >
                <Download size={17} />
                {downloading ? "Downloading..." : "Export Excel"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-attendance">
              Loading attendance records...
            </div>
          ) : attendance.length === 0 ? (
            <div className="empty-attendance">
              No attendance records available.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ padding: "12px" }}>Employee</th>
                    <th style={{ padding: "12px" }}>Employee ID</th>
                    <th style={{ padding: "12px" }}>Date</th>
                    <th style={{ padding: "12px" }}>Check In</th>
                    <th style={{ padding: "12px" }}>Check Out</th>
                    <th style={{ padding: "12px" }}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {attendance.map((record) => (
                    <tr key={record._id}>
                      <td style={{ padding: "12px" }}>
                        {record.employeeName || "--"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {record.userId || "--"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {record.date
                          ? new Date(record.date).toLocaleDateString("en-IN")
                          : "--"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {record.checkIn
                          ? new Date(record.checkIn).toLocaleTimeString("en-IN")
                          : "--"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {record.checkOut
                          ? new Date(record.checkOut).toLocaleTimeString("en-IN")
                          : "--"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {record.checkOut
                          ? "Completed"
                          : record.checkIn
                            ? "Checked In"
                            : "Pending"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;