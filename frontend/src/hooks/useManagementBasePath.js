import { useLocation } from "react-router-dom";

export default function useManagementBasePath() {
  const { pathname } = useLocation();
  return pathname === "/manager" || pathname.startsWith("/manager/") ? "/manager" : "/admin";
}
