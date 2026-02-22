import { Routes, Route, Navigate } from "react-router";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Home from "./pages/Home";
import User from "./pages/User";

function Logout() {
  localStorage.clear();
  return <Navigate to="/login" />;
}

function SignupAndLogout() {
  localStorage.clear();
  return <Signup />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<SignupAndLogout />} />
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/user" element={<User />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
