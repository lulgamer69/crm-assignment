import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { login } from "../api/authApi";
import { saveAuthToken, saveAuthUser } from "../api/authStorage";
import { isValidEmail } from "../api/authValidation";
import AuthBrandPanel from "./AuthBrandPanel";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const response = await login(normalizedEmail, password);
      const token = response?.data?.token;

      if (!response?.success || typeof token !== "string" || !token) {
        setError(response?.message || "Unable to sign in. Please try again.");
        return;
      }

      saveAuthToken(token);
      if (response?.data?.user) saveAuthUser(response.data.user);
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to reach the server. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-label="LeadFlow CRM sign in">
        <AuthBrandPanel />

        <section className="login-form-panel">
          <div className="login-form-content">
            <header className="login-heading">
              <h2>Welcome Back</h2>
              <p>Sign in to your LeadFlow account</p>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <div className="login-field">
                <label htmlFor="login-email">Email</label>
                <div className="login-input-wrap">
                  <Mail size={22} aria-hidden="true" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Password</label>
                <div className="login-input-wrap">
                  <LockKeyhole size={22} aria-hidden="true" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={21} /> : <Eye size={21} />}
                  </button>
                </div>
              </div>

              {error && <p className="login-error" role="alert">{error}</p>}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>

            <p className="signup-prompt">
              Don’t have an account? <Link to="/signup">Sign Up</Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
