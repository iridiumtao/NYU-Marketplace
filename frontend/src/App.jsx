import React from "react";
import { Outlet, Link } from "react-router-dom";
import "./App.css";

export default function App() {
  return (
    <div style={{ padding: "20px" }}>
      {/* Simple navigation bar */}
      <nav style={{ marginBottom: "20px" }}>
        <Link to="/" style={{ marginRight: "15px" }}>Home</Link>
        <Link to="/create-listing">Create Listing</Link>
      </nav>

      {/* This renders the current route's page */}
      <Outlet />
    </div>
  );
}
