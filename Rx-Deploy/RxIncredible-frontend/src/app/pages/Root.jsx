import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

export default function Root() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen flex flex-col">
      <Outlet />
    </div>
  );
}
