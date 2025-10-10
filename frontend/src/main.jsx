import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import AppRouter from "./routes"; // Import router

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRouter /> {/* ✅ Render the router instead of App */}
  </React.StrictMode>
);
