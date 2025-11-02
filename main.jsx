import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="446609071598-4sued7ul9jagfc17gpk6t11en40fjh95.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);