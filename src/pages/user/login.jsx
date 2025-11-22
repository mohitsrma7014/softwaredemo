import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CompanyLogo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import bg from "../../assets/background.jpg";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, token, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login(username, password);
      navigate("/");
    } catch {
      setError("Invalid credentials");
    }
  };

  if (token) navigate("/");

  return (
    <div
      className="relative flex justify-center items-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className="w-[380px] text-center z-10 text-white rounded-2xl p-8 shadow-2xl border border-white/20"
        style={{
          background:
            "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        }}
      >
        <img src={CompanyLogo} alt="Company Logo" className="mx-auto mb-4 w-44 h-24 object-contain" />

        <p className="text-sm text-white/60 mb-6">
          Sign in to continue to your dashboard
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 rounded-xl bg-white/10 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="p-3 w-full rounded-xl bg-white/10 text-white placeholder-white/60 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3 text-white/60 cursor-pointer select-none"
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            disabled={loading}
            type="submit"
            className="mt-3 bg-blue-600 hover:bg-blue-700 py-2 rounded-xl text-white font-semibold transition-all"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 text-sm text-white/70">
          <p>Forgot password? <a href="#" className="text-blue-400 hover:underline">Reset</a></p>
        </div>
        </div>
  
    </div>
  );
};

export default Login;
