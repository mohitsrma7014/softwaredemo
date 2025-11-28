import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { departmentAccess } from "../../context/AccessControl";
import CompanyLogo from "../../assets/logo.png";
import Mini from "../../assets/logo-mini.png";

import { useAuth } from "../../context/AuthContext";
import {
  Home,
  Settings,
  LogOut,
  XCircle,
  Users,
  ChevronRight,
  Layers,
  Settings2,
  CalendarClock,
  Cog,
  Truck,
  Network,
  Warehouse,
  Users2,
  ChevronDown,
  Hammer,Flame ,Construction,
  Factory,
  ShieldCheck,
  Stamp,
  ScanEye,
} from "lucide-react";

// ✅ Icon mapping function
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    home: Home,
    settings: Settings,
    settings2: Settings2,
    logout: LogOut,
    xcircle: XCircle,
    users: Users,
    users2: Users2,
    chevronright: ChevronRight,
    chevrondown: ChevronDown,
    layers: Layers,
    calendar: CalendarClock,
    cog: Cog,
    truck: Truck,
    network: Network,
    warehouse: Warehouse,
    hammer: Hammer,
    close: XCircle,
    flame: Flame ,
    construction: Construction,
    factory: Factory,
    shieldcheck: ShieldCheck,
    stamp: Stamp,
    scaneye: ScanEye ,
  };

  const LucideIcon = icons[name?.toLowerCase()] || XCircle;
  return <LucideIcon size={size} color={color} />;
};

const Sidebar = ({ logout, onWidthChange }) => {
  const [open, setOpen] = useState(true);
  const [userDept, setUserDept] = useState(null);
  const [popupMenu, setPopupMenu] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const popupRef = useRef(null);
  const menuTimeoutRef = useRef(null);
  const popupTimeoutRef = useRef(null);

  const { user } = useAuth();

  useEffect(() => {
    if (user?.department) setUserDept(user.department);
  }, [user]);

  useEffect(() => {
    if (onWidthChange) onWidthChange(open ? 180 : 55);
  }, [open]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popupRef.current && 
        !popupRef.current.contains(event.target) &&
        !sidebarRef.current?.contains(event.target)
      ) {
        closePopup();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const links = [
    { name: "Home", path: "/", icon: "home" },
    {
      name: "PPC",
      icon: "calendar",
      children: [
        { name: "Customer Schedules", path: "/schedules/ScheduleViewer" },
        { name: "Planning Analysis", path: "/schedules/ProductionAnalysis" },
      ],
    },
    {
      name: "Engineering",
      icon: "cog",
      children: [
        { name: "Master List", path: "/masterlist/Master_list" },
        { name: "NPD Part Tracking", path: "/production/heat_treatment" },
        { name: "Calibration", path: "/production/heat_treatment" },
        { name: "IMS Documents", path: "/QMS/QmsDocumentViewer" },
        { name: "Upload IMS Procedures", path: "/QMS/ProcedureDocumentsPage" },
        { name: "Upload IMS Manuals", path: "/QMS/ManualDocumentsPage" },
      ],
    },
    {
      name: "Raw Material",
      icon: "layers",
      children: [
        { name: "RM Inventory", path: "/rm/RMReceivingOpenPartial"},
        { name: "Reciving", path: "/rm/RMReceivingPage" },
        { name: "Hold", path: "/rm/HoldMaterialPage" },
        { name: "Batch List", path: "/rm/HoldMaterialListPage" },
        { name: "Issue", path: "/rm/BatchTrackingPage" },
        { name: "Issue List", path: "/rm/IssueMaterialListPage" },
        { name: "Steel Reconsilation", path: "/rm/SteelRecpnsilation" },
      ],
    },
    {
      name: "Movement",
      icon: "network",
      children: [{ name: "Tag System", path: "/movement/TagSystem" }],
    },
    {
      name: "Forging",
      icon: "hammer",
      children: [
        { name: "Data Entery ", path: "/forging/forging_form" },
        { name: "Data List", path: "/forging/Forging_Data_list" },
        { name: "Dashboard", path: "/forging/ForgingDashboard" },

      ],
    },
    {
      name: "Heat treatment",
      icon: "flame",
      children: [
        { name: "Data Entry", path: "/heat_treatment/Heat_Treatment_Prodction_Sheet" },
         { name: "Data List", path: "/heat_treatment/Heat_treatment_list" },
        { name: "Dashboard", path:"/heat_treatment/HeatTreatmentDashboard" },
      ],
    },
    {
      name: "Pre Machining",
      icon: "construction",
      children: [
        { name: "Data Entry", path: "/pre_mc/Pre_mc_form" },
        { name: "Data List", path: "/pre_mc/Pre_mc_list" },
         { name: "Dashboard", path: "/pre_mc/Pre_mc_dashboard" },
      ],
    },
    {
      name: "Machining",
      icon: "factory",
      children: [
        { name: "Data Entry", path: "/machining/Machining_form" },
        { name: "Data List", path: "/machining/Machining_list" },
        { name: "Dashboard", path: "/machining/MachiningDashboard" },
      ],
    },
    {
      name: "FI",
      icon: "shieldcheck",
      children: [
        { name: "Data Entry", path: "/fi/Fi_form" },
        { name: "Data List", path: "/fi/Fi_list" },
        { name: "Dashboard", path: "/fi/FiDashboard" },
      ],
    },
    {
      name: "Marking",
      icon: "stamp",
      children: [
        { name: "Data Entry", path: "/marking/Marking_form" },
        { name: "Data List", path: "/marking/Marking_list" },
        { name: "Dashboard", path: "/marking/MarkingDashboard"},
      ],
    },
    {
      name: "Visual",
      icon: "scaneye",
      children: [
        { name: "Data Entry", path: "/visual/Visual_form" },
        { name: "Data List", path: "/visual/Visual_list" },
        { name: "Dashboard", path: "/visual/VisualDashboard" },
      ],
    },
    
    {
      name: "Dispatch",
      icon: "truck",
      children: [
        { name: "Dispatch Entry", path: "/dispatch/Dispatch_form" },
        { name: "Dispatch List", path: "/dispatch/Dispatch_list" },
        { name: "Dashboard", path: "/dispatch/DispatchDashboard"},
      ],
    },
    {
      name: "Inventory",
      icon: "users2",
      children: [
        { name: "Packing Inventory Trnsiction", path: "/Packing_are_inventory/AddTransactionModal" },
        { name: "Inventory Summary", path: "/Packing_are_inventory/InventorySummary" },

      ],
    },
  ];

  const bottomLinks = [{ name: "Settings", path: "/settings", icon: "settings" }];

  const allowedPaths = departmentAccess[userDept] || [];
  const filterAccessible = (items) =>
    items
      .map((link) => {
        if (link.children) {
          const allowedChildren = link.children.filter((c) =>
            allowedPaths.includes(c.path)
          );
          return allowedChildren.length ? { ...link, children: allowedChildren } : null;
        }
        return allowedPaths.includes(link.path) ? link : null;
      })
      .filter(Boolean);

  const filteredLinks = filterAccessible(links);
  const filteredBottomLinks = bottomLinks;

  // Clear all timeouts
  const clearAllTimeouts = () => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
  };

  // Show popup menu with proper positioning
  const showPopupMenu = (event, link) => {
    if (link.children?.length) {
      clearAllTimeouts();
      
      const rect = event.currentTarget.getBoundingClientRect();
      
      // Calculate position for both expanded and collapsed states
      let left = open ? rect.right + 8 : rect.right + 8;
      let top = rect.top;
      
      // Prevent popup from going below viewport
      const viewportHeight = window.innerHeight;
      const popupHeight = link.children.length * 40 + 20;
      
      if (top + popupHeight > viewportHeight - 20) {
        top = viewportHeight - popupHeight - 20;
      }
      
      // Prevent popup from going beyond right edge
      const viewportWidth = window.innerWidth;
      const popupWidth = 180;
      
      if (left + popupWidth > viewportWidth - 20) {
        left = viewportWidth - popupWidth - 20;
      }

      setPopupPosition({ top, left });
      setPopupMenu(link);
    }
  };

  // Close popup with delay
  const closePopup = () => {
    clearAllTimeouts();
    popupTimeoutRef.current = setTimeout(() => {
      setPopupMenu(null);
    }, 200);
  };

  // Handle mouse enter for menu items
  const handleMenuMouseEnter = (event, link) => {
    clearAllTimeouts();
    
    if (link.children?.length) {
      showPopupMenu(event, link);
    }
  };

  // Handle mouse leave for menu items
  const handleMenuMouseLeave = (event) => {
    // Check if mouse is moving to popup
    const relatedTarget = event.relatedTarget;
    if (popupRef.current && popupRef.current.contains(relatedTarget)) {
      return; // Don't close if moving to popup
    }
    
    closePopup();
  };

  // Handle popup mouse enter
  const handlePopupMouseEnter = () => {
    clearAllTimeouts();
  };

  // Handle popup mouse leave
  const handlePopupMouseLeave = () => {
    closePopup();
  };

  const isLinkActive = (link) => {
    if (link.path === location.pathname) return true;
    if (link.children) return link.children.some((child) => child.path === location.pathname);
    return false;
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setTimeout(() => {
      navigate("/login");
      window.location.reload();
    }, 300);
  };

  const sidebarStyle = {
    width: open ? "180px" : "55px",
    height: "100vh",
    position: "fixed",
    left: 0,
    top: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRight: "1px solid #e5e7eb",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    zIndex: 40,
    transition: "width 0.3s ease",
  };

  const linkStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: open ? "space-between" : "center",
    padding: "5px 12px",
    borderRadius: "6px",
    color: isActive ? "#3b82f6" : "#4b5563",
    backgroundColor: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
    textDecoration: "none",
    transition: "all 0.2s ease",
    cursor: "pointer",
  });

  const hoverStyle = { backgroundColor: "rgba(59, 130, 246, 0.05)" };

  const popupStyle = {
    position: "fixed",
    top: popupPosition.top,
    left: popupPosition.left,
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    padding: "8px",
    zIndex: 50,
    minWidth: "180px",
    transition: "opacity 0.2s ease",
  };

  const popupItemStyle = (isActive) => ({
    display: "block",
    padding: "5px 12px",
    borderRadius: "4px",
    color: isActive ? "#3b82f6" : "#4b5563",
    backgroundColor: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
    textDecoration: "none",
    fontSize: "14px",
    transition: "all 0.2s ease",
    cursor: "pointer",
  });

  return (
    <>
      <aside ref={sidebarRef} style={sidebarStyle}>
        <div>
          {/* Header */}
          <div
            style={{
              height: "55px",
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {open ? (
              <>
                <img
                src={CompanyLogo}
                alt="Company Logo"
                style={{
                    width: open ? "120px" : "40px",
                    height: "auto",
                    objectFit: "contain",
                    cursor: "pointer",
                    transition: "width 0.3s ease",
                }}
                onClick={() => setOpen(!open)}
                />

                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "4px",
                    borderRadius: "50%",
                    border: "1px solid #d1d5db",
                    backgroundColor: "white",
                    cursor: "pointer",
                  }}
                >
                  <Icon name="chevronRight" size={16} />
                </button>
              </>
            ) : (
              <div
                onClick={() => setOpen(true)}
                style={{ cursor: "pointer", margin: "0 auto" }}
              >
                <img
                    src={Mini}
                    alt="Company Logo"
                    style={{
                        width: open ? "120px" : "40px",
                        height: "auto",
                        objectFit: "contain",
                        cursor: "pointer",
                        transition: "width 0.3s ease",
                    }}
                    onClick={() => setOpen(!open)}
                    />

              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: "4px", marginTop: "8px" }}>
            {filteredLinks.map((link) => {
              const isActive = isLinkActive(link);
              const hasSubmenu = Array.isArray(link.children) && link.children.length > 0;

              return (
                <div 
                  key={link.name} 
                  style={{ marginBottom: "1px" }}
                  onMouseEnter={(e) => handleMenuMouseEnter(e, link)}
                  onMouseLeave={handleMenuMouseLeave}
                >
                  {/* Main Link */}
                  <div
                    onClick={() => {
                      if (!hasSubmenu) {
                        navigate(link.path);
                        closePopup();
                      }
                    }}
                    style={linkStyle(isActive)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = hoverStyle.backgroundColor;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = isActive
                        ? "rgba(59, 130, 246, 0.1)"
                        : "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Icon name={link.icon} />
                      {open && (
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            fontSize: "14px",
                            fontWeight: isActive ? "600" : "400",
                          }}
                        >
                          {link.name}
                        </span>
                      )}
                    </div>
                    {hasSubmenu && open && (
                      <span style={{ fontSize: "14px", opacity: 0.6 }}>
                        <Icon name="chevronRight" size={14} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div style={{ padding: "8px", borderTop: "1px solid #e5e7eb" }}>
          {filteredBottomLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              style={linkStyle(false)}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = hoverStyle.backgroundColor;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              onClick={closePopup}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon name={link.icon} />
                {open && <span style={{ fontSize: "14px" }}>{link.name}</span>}
              </div>
            </Link>
          ))}

          <button
            onClick={handleLogout}
            style={{
              ...linkStyle(false),
              width: "100%",
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#ef4444",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name="logout" />
              {open && <span style={{ fontSize: "14px" }}>Logout</span>}
            </div>
          </button>
        </div>
      </aside>

      {/* Popup Submenu for BOTH states */}
      {popupMenu && (
        <div
          ref={popupRef}
          style={popupStyle}
          onMouseEnter={handlePopupMouseEnter}
          onMouseLeave={handlePopupMouseLeave}
        >
          {popupMenu.children.map((child) => {
            const isChildActive = location.pathname === child.path;
            return (
              <Link
                key={child.name}
                to={child.path}
                style={popupItemStyle(isChildActive)}
                onClick={() => setPopupMenu(null)}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.05)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = isChildActive
                    ? "rgba(59, 130, 246, 0.1)"
                    : "transparent";
                }}
              >
                {child.name}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
};

export default Sidebar;