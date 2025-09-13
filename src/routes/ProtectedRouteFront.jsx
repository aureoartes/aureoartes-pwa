import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isLogged } from "../config/appUser";

export default function ProtectedRouteFront({ children }) {
  const location = useLocation();
  if (!isLogged()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
