import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { api, setSession, getUser } from "../api.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ORIGINAL CODE (bug: calling navigate() during render is not allowed in React):
  // if (getUser()) {
  //   navigate("/dashboard");
  // }
  // FIXED: use the <Navigate> component instead
  if (getUser()) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(data.token, data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* ADDED: Deeraj Interiors logo above the TeleCRM heading */}
        <img
          className="di-logo login-di-logo"
          src="https://img1.wsimg.com/isteam/ip/e7e3142b-3f26-4173-bc29-b2315178edb8/DI%20logo%20(2).png/:/rs=w:559,h:192,cg:true,m/cr=w:559,h:192/qt=q:95"
          alt="Deeraj Interiors"
        />
        <h1>Tele<span>CRM</span></h1>
        <p>Sign in to manage your calling leads</p>
        {error && <div className="error-msg">{error}</div>}
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="btn" onClick={submit} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  );
}
