import { useState } from "react";
import "./Login.css";

// Import images from assets folder
import loginContainerImg from "../../assets/images/loginContainer.png";
import autoPartsImg from "../../assets/images/img2.png";
import mascotImg from "../../assets/images/Mascot.png";
import signageImg from "../../assets/images/Signage.png";

export default function Login() {
  const [role, setRole] = useState<"admin" | "manager">("admin");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-page">
      {/* Background Glow */}
      <div className="login-page__glow" />

      {/* 1. WHITE BLOB BACKGROUND */}
      <div className="login-blob">
        <img
          src={loginContainerImg}
          alt="Login Background Shape"
          className="login-blob__img"
        />
      </div>

      {/* 2. LOGIN FORM */}
      <div className="login-form">
        <h1 className="login-form__title">Welcome Back!</h1>
        <p className="login-form__subtitle">
          Sign in to access your automotive inventory &amp; POS system.
        </p>

        {/* ADMIN / MANAGER tabs */}
        <div className="login-tabs">
          <button
            className={`login-tabs__btn ${
              role === "admin"
                ? "login-tabs__btn--active"
                : "login-tabs__btn--inactive"
            }`}
            onClick={() => setRole("admin")}
          >
            Admin
          </button>
          <button
            className={`login-tabs__btn ${
              role === "manager"
                ? "login-tabs__btn--active"
                : "login-tabs__btn--inactive"
            }`}
            onClick={() => setRole("manager")}
          >
            Manager
          </button>
        </div>

        {/* Email */}
        <div className="login-field">
          <label htmlFor="email">Email or username:</label>
          <input id="email" type="text" autoComplete="username" />
        </div>

        {/* Password */}
        <div className="login-field">
          <label htmlFor="password">Password:</label>
          <div className="login-field__pw-wrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-field__eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="login-forgot">
          <a href="#">Forgot Password?</a>
        </div>

        <button type="button" className="login-btn">
          Login
        </button>
      </div>

      {/* 3. AUTO PARTS */}
      <div className="login-autoparts">
        <img
          src={autoPartsImg}
          alt="Auto parts decoration"
          className="login-autoparts__img"
        />
      </div>

      {/* 4. MASCOT */}
      <div className="login-mascot">
        <img
          src={mascotImg}
          alt="Manumatik Mascot"
          className="login-mascot__img"
        />
      </div>

      {/* RIGHT SIDE: logo + marketing copy */}
      <div className="login-right">
        {/* MANUMATIK logo */}
        <div className="login-logo">
          <img
            src={signageImg}
            alt="Manumatik Logo"
            className="login-logo__img"
          />
        </div>

        <p className="login-right__system-name">
          Automotive Inventory and Point-of-Sale Intelligence System
        </p>
        
        <div className="right-container"></div>
        <p className="login-right__tagline">Auto parts, organized</p>

        <h2 className="login-right__headline">
          Real-time stock.
          <br />
          Faster checkout.
          <br />
          Smarter reordering.
        </h2>

        <ul className="login-right__bullets">
          {[
            "Live inventory across every counter",
            "Barcode-ready point of sale",
            "Role-based access for your team",
          ].map((item) => (
            <li key={item} className="login-right__bullet">
              {/* Checkmark in circle SVG based on target design */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3dd0c0"
                strokeWidth="2"
                style={{ flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="9 12 11 14 15 10"></polyline>
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
