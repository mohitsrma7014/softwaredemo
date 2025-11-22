import { useEffect } from "react";
import { usePageTitle } from "../layouts/PageTitleContext";
const Dashboard = () => {
  const { setPageTitle } = usePageTitle();
  
    useEffect(() => {
      setPageTitle("Dashboard");
    }, [setPageTitle]);

  return <div>Dashboard Page</div>;
};

export default Dashboard;
