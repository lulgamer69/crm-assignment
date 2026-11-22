import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { signup } from "../api/authApi";
import { isValidEmail } from "../api/authValidation";
import AuthBrandPanel from "./AuthBrandPanel";
import "./Login.css";
import "./Register.css";

const MIN_PASSWORD_CHARACTERS = 8;
const MAX_PASSWORD_BYTES = 72;

const getPasswordByteLength = (password) => new TextEncoder().encode(password).length;

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateForm = () => {
    if (!name.trim()) {
      return "Enter your full name.";
    }

    if (!email.trim()) {
      return "Enter your email address.";
    }

    if (!isValidEmail(email.trim())) {
      return "Enter a valid email address.";
    }

    const nonWhitespaceCharacters = [...password].filter(
      (character) => !/\s/u.test(character)
    ).length;

    if (nonWhitespaceCharacters < MIN_PASSWORD_CHARACTERS) {
      return "Password must contain at least 8 non-whitespace characters.";
    }

    if (getPasswordByteLength(password) > MAX_PASSWORD_BYTES) {
      return "Password must be no more than 72 UTF-8 bytes.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError("");
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await signup(name.trim(), email.trim(), password);

      if (!response?.success) {
        setError(response?.message || "Unable to create your account.");
        return;
      }

      // Signup returns a token too, but this flow intentionally starts at Login.
      toast.success(response.message || "Account created successfully");
      navigate("/login", { replace: true });
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
    <main className="login-page register-page">
      <section className="login-card register-card" aria-label="Create a LeadFlow CRM account">
        <AuthBrandPanel />

        <section className="login-form-panel register-form-panel">
          <div className="login-form-content">
            <header className="login-heading register-heading">
              <h2>Create Account</h2>
              <p>Get started with LeadFlow CRM</p>
            </header>

            <form onSubmit={handleSubmit} noValidate>
              <div className="login-field register-field">
                <label htmlFor="register-name">Full Name <span aria-hidden="true">*</span></label>
                <div className="login-input-wrap">
                  <UserRound size={22} aria-hidden="true" />
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-field register-field">
                <label htmlFor="register-email">Email <span aria-hidden="true">*</span></label>
                <div className="login-input-wrap">
                  <Mail size={22} aria-hidden="true" />
                  <input
                    id="register-email"
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

              <div className="login-field register-field">
                <label htmlFor="register-password">Password <span aria-hidden="true">*</span></label>
                <div className="login-input-wrap">
                  <LockKeyhole size={22} aria-hidden="true" />
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-describedby="password-requirements"
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
                <p id="password-requirements" className="password-requirements">
                  Use at least 8 characters, excluding spaces. Maximum length: 72 UTF-8 bytes.
                </p>
              </div>

              {error && <p className="login-error" role="alert">{error}</p>}

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Sign Up"}
              </button>
            </form>

            <p className="signup-prompt register-login-prompt">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
