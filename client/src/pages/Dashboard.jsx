import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  CalendarDays,
  Clock3,
  LogIn,
  LogOut,
  UserCircle,
  ShieldCheck,
  History,
  Bell,
} from "lucide-react";

import api from "../services/api";

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function formatTime(date) {
  if (!date) return "--";

  return new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function Dashboard() {
  const navigate = useNavigate();

  const employee = JSON.parse(
    localStorage.getItem("employee") || "{}"
  );

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const todayRecord = attendance.find(
    (record) => record.date === getTodayDate()
  );

  const isCheckedIn = Boolean(todayRecord?.checkIn);
  const isCheckedOut = Boolean(todayRecord?.checkOut);

  // Fetch attendance history
  const fetchAttendance = async () => {
    try {
      const response = await api.get(
        "/attendance/my-records"
      );

      setAttendance(response.data.attendance || []);
    } catch (err) {
      if (err.response?.status === 401) {
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

  // Get employee's current GPS location
  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error("Geolocation is not supported by your browser.")
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let message = "Unable to get your location.";

          if (error.code === 1) {
            message =
              "Location permission denied. Please allow location access.";
          } else if (error.code === 2) {
            message = "Your current location is unavailable.";
          } else if (error.code === 3) {
            message = "Location request timed out. Try again.";
          }

          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  // Check-in / Check-out handler
  const handleAttendance = async (type) => {
    setError("");
    setSuccess("");
    setActionLoading(type);

    try {
      const location = await getLocation();

      const endpoint =
        type === "check-in"
          ? "/attendance/check-in"
          : "/attendance/check-out";

      const response = await api.post(endpoint, location);

      setSuccess(response.data.message);

      await fetchAttendance();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Attendance action failed."
      );
    } finally {
      setActionLoading("");
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("employee");

    navigate("/", { replace: true });
  };

  const presentDays = attendance.filter(
    (record) => record.checkIn
  ).length;

  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <ShieldCheck size={30} />

          <div>
            <h2>BRILLER</h2>
            <p>Attendance System</p>
          </div>
        </div>

        <nav className="sidebar-menu">
          <button className="active">
            <LayoutDashboard size={19} />
            Dashboard
          </button>

          <button
            onClick={() =>
              document
                .getElementById("attendance-history")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <CalendarDays size={19} />
            Attendance
          </button>

          <button
            onClick={() =>
              document
                .getElementById("attendance-history")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <History size={19} />
            History
          </button>

          <button>
            <UserCircle size={19} />
            My Profile
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
            fontSize: "14px",
          }}
        >
          <LogOut size={19} />
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">

        {/* HEADER */}
        <header className="dashboard-header">
          <div>
            <h1>Employee Dashboard</h1>
            <p>Manage your daily attendance</p>
          </div>

          <div className="dashboard-user">
            <div className="dashboard-user-icon">
              <UserCircle size={23} />
            </div>

            <div>
              <h4>{employee.name || "Employee"}</h4>
              <p>{employee.role || "Employee"}</p>
            </div>

            <Bell size={19} color="#64748b" />
          </div>
        </header>

        {/* WELCOME */}
        <section className="attendance-panel">
          <h2>
            Welcome, {employee.name || "Employee"}!
          </h2>

          <p>
            Employee ID: {employee.userId || "N/A"}
          </p>

          <p>
            Email: {employee.email || "N/A"}
          </p>
        </section>

        {/* STATISTICS */}
        <section className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <CalendarDays size={24} />
            </div>

            <div>
              <h3>Present Days</h3>
              <strong>{loading ? "..." : presentDays}</strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Clock3 size={24} />
            </div>

            <div>
              <h3>Today's Check-in</h3>
              <strong>
                {formatTime(todayRecord?.checkIn)}
              </strong>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <History size={24} />
            </div>

            <div>
              <h3>Today's Check-out</h3>
              <strong>
                {formatTime(todayRecord?.checkOut)}
              </strong>
            </div>
          </div>
        </section>

        {/* ATTENDANCE ACTIONS */}
        <section className="attendance-panel">
          <h2>Daily Attendance</h2>

          <p>
            Office location verification is required
            for attendance.
          </p>

          {isCheckedOut && (
            <p>Today's attendance is completed.</p>
          )}

          <div className="attendance-actions">
            <button
              onClick={() => handleAttendance("check-in")}
              disabled={
                loading ||
                actionLoading !== "" ||
                isCheckedIn
              }
            >
              <LogIn size={18} />

              {actionLoading === "check-in"
                ? "Checking in..."
                : isCheckedIn
                  ? "Checked In"
                  : "Check In"}
            </button>

            <button
              className="check-out"
              onClick={() => handleAttendance("check-out")}
              disabled={
                loading ||
                actionLoading !== "" ||
                !isCheckedIn ||
                isCheckedOut
              }
            >
              <LogOut size={18} />

              {actionLoading === "check-out"
                ? "Checking out..."
                : isCheckedOut
                  ? "Checked Out"
                  : "Check Out"}
            </button>
          </div>

          {error && (
            <p className="login-error">{error}</p>
          )}

          {success && (
            <p className="login-success">{success}</p>
          )}
        </section>

        {/* ATTENDANCE HISTORY */}
        <section
          className="recent-panel"
          id="attendance-history"
        >
          <h2>Attendance History</h2>

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
                        {record.date}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {formatTime(record.checkIn)}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {formatTime(record.checkOut)}
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
export default Dashboard;