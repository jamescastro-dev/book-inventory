import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@styles/index.css";
import App from "@/App.jsx";
import { AuthProvider } from "@/context/AuthProvider.jsx";
import { ToastProvider } from "@/context/ToastProvider.jsx";

// Wake up Render's free tier server in the background
fetch(import.meta.env.VITE_API_URL + "/api/books/").catch(() => {});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
