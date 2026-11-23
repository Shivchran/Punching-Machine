
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  KeyRound,
  ArrowLeft,
  Fingerprint,
  Building2,
  Clock3,
} from "lucide-react";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("employee");
  const [step, setStep] = useState("login");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // =====================================
  // LOGIN
  // =====================================

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!identifier.trim() || !password) {
      setError("Please enter your User ID/Email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        identifier: identifier.trim(),
        password,
        loginRole: selectedRole,
      });

      const data = response.data;

      if (!data.employeeId) {
        throw new Error("Invalid server response. Employee ID missing.");
      }

      setEmployeeId(data.employeeId);
      setEmail(data.email || "");
      setOtp("");
      setStep("otp");

      setSuccess(
        data.message || "OTP has been sent to your registered email."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // VERIFY LOGIN OTP
  // =====================================

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/verify-login-otp", {
        employeeId,
        otp,
      });

      const data = response.data;

      if (!data.token || !data.employee) {
        throw new Error("Invalid login response from server.");
      }

      const employee = data.employee;

      // Verify selected login type against backend role.
      if (employee.role !== selectedRole) {
        try {
          await api.post(
            "/auth/logout",
            {},
            {
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            }
          );
        } catch (logoutError) {
          console.error("Session cleanup failed:", logoutError);
        }

        setError(
          selectedRole === "admin"
            ? "This account does not have Admin access."
            : "This account is not registered as an Employee."
        );

        setStep("login");
        setOtp("");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("employee", JSON.stringify(employee));

      if (employee.role === "admin") {
        navigate("/admin-dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // FORGOT PASSWORD
  // =====================================

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/forgot-password", {
        email: email.trim(),
      });

      setStep("reset-otp");
      setOtp("");

      setSuccess(
        response.data.message ||
          "Password reset OTP has been sent to your email."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to send reset OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // VERIFY RESET OTP
  // =====================================

  const handleVerifyResetOTP = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/verify-reset-otp", {
        email: email.trim(),
        otp,
      });

      setStep("new-password");
      setSuccess(
        response.data.message ||
          "OTP verified. You can now create a new password."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // RESET PASSWORD
  // =====================================

  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/reset-password", {
        email: email.trim(),
        newPassword,
        confirmPassword,
      });

      setStep("login");
      setIdentifier(email);
      setPassword("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      setSuccess(
        response.data.message ||
          "Password reset successfully. Please login again."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // BACK TO LOGIN
  // =====================================

  const backToLogin = () => {
    setStep("login");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    clearMessages();
  };

  // =====================================
  // LOGIN PAGE UI
  // =====================================

  return (
    <div
      className={`login-container ${
        selectedRole === "admin" ? "admin-login" : "employee-login"
      }`}
    >
      <div className="login-card">

        {/* HEADER */}

        <div className="login-header">
          <div className="login-logo">
            {selectedRole === "admin" ? (
              <ShieldCheck size={32} />
            ) : (
              <Fingerprint size={32} />
            )}
          </div>

          <h1>Attendance Portal</h1>

          <p>Secure Employee Attendance Management System</p>

          <div className="portal-badge">
            {selectedRole === "admin" ? (
              <>
                <ShieldCheck size={14} />
                ADMIN PORTAL
              </>
            ) : (
              <>
                <Building2 size={14} />
                EMPLOYEE PORTAL
              </>
            )}
          </div>
        </div>

        {/* ROLE SELECTOR */}

        {step === "login" && (
          <div className="login-role-selector">
            <button
              type="button"
              className={selectedRole === "employee" ? "active" : ""}
              onClick={() => {
                setSelectedRole("employee");
                clearMessages();
              }}
            >
              <User size={16} />
              Employee Login
            </button>

            <button
              type="button"
              className={selectedRole === "admin" ? "active" : ""}
              onClick={() => {
                setSelectedRole("admin");
                clearMessages();
              }}
            >
              <ShieldCheck size={16} />
              Admin Login
            </button>
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && <div className="login-error">{error}</div>}

        {/* SUCCESS MESSAGE */}

        {success && <div className="login-success">{success}</div>}

        {/* =====================================
             LOGIN FORM
        ===================================== */}

        {step === "login" && (
          <>
            <div className="login-form-heading">
              <h2>
                {selectedRole === "admin"
                  ? "Admin Sign In"
                  : "Employee Sign In"}
              </h2>

              <p className="login-step-description">
                Enter your credentials to access your account.
              </p>
            </div>

            <form className="login-form" onSubmit={handleLogin}>
              <div className="input-group">
                <label htmlFor="login-identifier">
                  User ID or Email
                </label>

                <div className="input-icon">
                  <User size={18} />

                  <input
                    id="login-identifier"
                    type="text"
                    placeholder="Enter User ID or Email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-password">Password</label>

                <div className="input-icon">
                  <Lock size={18} />

                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="forgot-password-link">
                <button
                  type="button"
                  onClick={() => {
                    setEmail(identifier.includes("@") ? identifier : "");
                    setStep("forgot-password");
                    clearMessages();
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Please wait..." : "Continue"}
                {!loading && <ArrowLeft size={17} className="login-arrow" />}
              </button>

              <div className="login-security-note">
                <ShieldCheck size={15} />
                Secure login with email OTP verification
              </div>
            </form>
          </>
        )}

        {/* =====================================
             LOGIN OTP FORM
        ===================================== */}

        {step === "otp" && (
          <>
            <div className="login-form-heading">
              <h2>Verify Your Email</h2>

              <p className="login-step-description">
                Enter the 6-digit OTP sent to your registered email address.
              </p>
            </div>

            <form className="login-form" onSubmit={handleVerifyOTP}>
              <div className="input-group">
                <label htmlFor="login-otp">Email OTP</label>

                <div className="input-icon">
                  <KeyRound size={18} />

                  <input
                    id="login-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                className="back-login-button"
                onClick={backToLogin}
              >
                <ArrowLeft size={16} />
                Back to Login
              </button>
            </form>
          </>
        )}

        {/* =====================================
             FORGOT PASSWORD FORM
        ===================================== */}

        {step === "forgot-password" && (
          <>
            <div className="login-form-heading">
              <h2>Forgot Password?</h2>

              <p className="login-step-description">
                Enter your registered email address to receive a password
                reset OTP.
              </p>
            </div>

            <form className="login-form" onSubmit={handleForgotPassword}>
              <div className="input-group">
                <label htmlFor="forgot-email">Registered Email</label>

                <div className="input-icon">
                  <Mail size={18} />

                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Send Reset OTP"}
              </button>

              <button
                type="button"
                className="back-login-button"
                onClick={backToLogin}
              >
                <ArrowLeft size={16} />
                Back to Login
              </button>
            </form>
          </>
        )}

        {/* =====================================
             RESET OTP FORM
        ===================================== */}

        {step === "reset-otp" && (
          <>
            <div className="login-form-heading">
              <h2>Verify Reset OTP</h2>

              <p className="login-step-description">
                Enter the OTP sent to your registered email address.
              </p>
            </div>

            <form className="login-form" onSubmit={handleVerifyResetOTP}>
              <div className="input-group">
                <label htmlFor="reset-otp">6-Digit OTP</label>

                <div className="input-icon">
                  <KeyRound size={18} />

                  <input
                    id="reset-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                className="back-login-button"
                onClick={backToLogin}
              >
                <ArrowLeft size={16} />
                Back to Login
              </button>
            </form>
          </>
        )}

        {/* =====================================
             NEW PASSWORD FORM
        ===================================== */}

        {step === "new-password" && (
          <>
            <div className="login-form-heading">
              <h2>Create New Password</h2>

              <p className="login-step-description">
                Choose a strong password for your account.
              </p>
            </div>

            <form className="login-form" onSubmit={handleResetPassword}>
              <div className="input-group">
                <label htmlFor="new-password">New Password</label>

                <div className="input-icon">
                  <Lock size={18} />

                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowNewPassword(!showNewPassword)
                    }
                    aria-label={
                      showNewPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="confirm-password">
                  Confirm New Password
                </label>

                <div className="input-icon">
                  <Lock size={18} />

                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>

              <button
                type="button"
                className="back-login-button"
                onClick={backToLogin}
              >
                <ArrowLeft size={16} />
                Back to Login
              </button>
            </form>
          </>
        )}

        {/* FOOTER */}

        <div className="login-footer">
          <div>
            © {new Date().getFullYear()} Briller Technology
          </div>

          <div className="login-footer-security">
            <Clock3 size={13} />
            Secure Attendance Management
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;