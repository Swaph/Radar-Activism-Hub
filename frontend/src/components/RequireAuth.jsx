import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("jwt");

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}
