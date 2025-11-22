import { useEffect, useState } from "react";
import { Bell, User } from "lucide-react";

const Header = ({ user, pageTitle }) => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setTime(formattedTime);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Matches sidebar background color, shadow, and tone
  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 24px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
    position: "sticky",
    top: 0,
    zIndex: 30,
    backdropFilter: "blur(8px)",
  };

  return (
    <header style={headerStyle}>
      <h1
        style={{
          fontSize: "20px",
          fontWeight: "600",
          color: "#1f2937",
          margin: 0,
        }}
      >
        {pageTitle || "ERP Dashboard"}
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          color: "#4b5563",
        }}
      >
        {/* Time */}
        <div
          style={{
            fontSize: "14px",
            fontFamily: "monospace",
            backgroundColor: "rgba(249, 250, 251, 0.8)",
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #e5e7eb",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {time}
        </div>

        {/* Notification Icon */}
        <div style={{ position: "relative", cursor: "pointer" }}>
          <Bell size={20} strokeWidth={1.8} />
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              backgroundColor: "#ef4444",
              color: "white",
              fontSize: "10px",
              padding: "1px 4px",
              borderRadius: "8px",
              border: "1px solid white",
              fontWeight: 600,
            }}
          >
            3
          </span>
        </div>

        {/* User Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <User size={20} strokeWidth={1.8} />
          <span style={{ fontSize: "14px", fontWeight: "500" }}>
            {user?.first_name || "User"}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
