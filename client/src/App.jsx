import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "@/layout/Navbar";
import BooksPage from "@/pages/BooksPage";
import AddBook from "@/pages/AddBook";
import AdminLogin from "@/pages/AdminLogin";

function App() {
  const location = useLocation();
  // Hide navbar on login page
  const hideNavbar =
    location.pathname === "/login" || location.pathname === "/";

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Default route goes to login */}
        <Route path="/" element={<AdminLogin />} />

        {/* Other pages */}
        <Route path="/books" element={<BooksPage />} />
        <Route path="/add-book" element={<AddBook />} />
        <Route path="/login" element={<AdminLogin />} />
      </Routes>
    </>
  );
}

export default App;
