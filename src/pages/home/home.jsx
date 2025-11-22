import { useEffect } from "react";
import { usePageTitle } from "../layouts/PageTitleContext";

const Home = () => {
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    setPageTitle("Home");
  }, [setPageTitle]);

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
     
    </div>
  );
};

export default Home;
