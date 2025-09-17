// src/App.jsx - Router Only
import { useState } from "react";
import MainLayout from "./components/layout/MainLayout";
import DashboardPage from "./components/pages/DashboardPage";
import BookingManagementPage from "./components/pages/BookingManagementPage";
import DriverManagementPage from "./components/pages/DriverManagementPage";
import FreelanceJobsPage from "./components/pages/FreelanceJobsPage";
import BookingOverviewPage from "./components/pages/BookingOverviewPage";
import UserManagementPage from "./components/pages/UserManagementPage";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "jobs":
        return <BookingManagementPage />;
      case "drivers":
        return <DriverManagementPage />;
      case "freelance":
        return <FreelanceJobsPage />;
      case "booking":
        return <BookingOverviewPage />;
      case "usermanagement":
        return <UserManagementPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderCurrentPage()}
    </MainLayout>
  );
}

export default App;
