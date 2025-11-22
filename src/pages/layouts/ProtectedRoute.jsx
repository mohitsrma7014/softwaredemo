import { Navigate } from "react-router-dom";
import { departmentAccess } from "../../context/AccessControl";

const ProtectedRoute = ({ children, requiredPath }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const dept = user?.department || "Employee";
  const allowedPaths = departmentAccess[dept] || [];

  if (!allowedPaths.includes(requiredPath)) {
    return (
      <div className="flex flex-col items-center justify-center  text-black text-xl backdrop-blur-3xl">
        🚫 You are not authorized to access this page.
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
