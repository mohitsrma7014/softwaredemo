import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PageTitleProvider, usePageTitle } from "./PageTitleContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

const LayoutContent = ({ user, logout, sidebarWidth, setSidebarWidth }) => {
  const { pageTitle } = usePageTitle();

  const layoutStyle = {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#f8fafc',
    color: '#1f2937',
    overflow: 'hidden'
  };

  const mainStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    transition: 'margin-left 0.3s ease',
    marginLeft: `${sidebarWidth}px`,
    minWidth: 0,
  };

  const contentStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '6px'
  };

  return (
    <div style={layoutStyle}>
      <Sidebar logout={logout} onWidthChange={setSidebarWidth} />
      
      <div style={mainStyle}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <Header user={user} pageTitle={pageTitle} />
        </div>

        <main style={contentStyle}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const [sidebarWidth, setSidebarWidth] = useState(190);

  return (
    <PageTitleProvider>
      <LayoutContent
        user={user}
        logout={logout}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
      />
    </PageTitleProvider>
  );
};

export default DashboardLayout;