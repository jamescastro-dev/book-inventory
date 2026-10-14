import { useContext } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthContext } from "@/context/AuthContext.jsx";
import Navbar from "@/layout/Navbar";
import Footer from "@/layout/Footer";
import BooksPage from "@/pages/BooksPage";
import AddBook from "@/pages/AddBook";
import AdminLogin from "@/pages/AdminLogin";
import LoansPage from "@/pages/LoansPage";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

function App() {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  // The sign-in page has its own full-screen layout
  const isLogin = location.pathname === "/login" || location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      {!isLogin && <Navbar />}
      {/* Signed in on a phone, the tab bar covers the bottom of the page: leave room for it */}
      <main className={`flex-1 ${!isLogin && user ? "pb-20 md:pb-0" : ""}`}>
        <Routes>
          {/* Default route goes to login */}
          <Route path="/" element={<AdminLogin />} />

          {/* Other pages */}
          <Route path="/books" element={<BooksPage />} />
          <Route
            path="/add-book"
            element={
              <ProtectedRoute librarianOnly>
                <AddBook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loans"
            element={
              <ProtectedRoute>
                <LoansPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<AdminLogin />} />
        </Routes>
        {!isLogin && <Footer />}
      </main>
    </div>
  );
}

export default App;
