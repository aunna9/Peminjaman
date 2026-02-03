import Sidebar from "./sidebar";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,      
          display: "flex",     
          padding: "0px",
          background: "#ffffff",
          overflowY: "auto"  
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}