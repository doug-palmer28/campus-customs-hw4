import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Scrolls the window to the top whenever the route changes, so navigating (e.g.
// from a footer link) lands you at the top of the new page rather than partway down.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}
