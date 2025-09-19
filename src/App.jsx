// src/App.jsx - Router Only
import { useState, createContext } from "react";
import MainLayout from "./components/layout/MainLayout";
import DashboardPage from "./components/pages/DashboardPage";
import BookingManagementPage from "./components/pages/BookingManagementPage";
import DriverManagementPage from "./components/pages/DriverManagementPage";
import FreelanceJobsPage from "./components/pages/FreelanceJobsPage";
import BookingOverviewPage from "./components/pages/BookingOverviewPage";
import UserManagementPage from "./components/pages/UserManagementPage";
import BookingDetailPage from "./components/pages/BookingDetailPage";
import "./App.css";

export const BookingContext = createContext();

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedBookingRef, setSelectedBookingRef] = useState(null);

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
      case "booking-detail":
        return (
          <BookingDetailPage
            bookingRef={selectedBookingRef}
            onBack={() =>
              setCurrentPage(selectedBookingRef?.fromPage || "dashboard")
            }
            fromPage={selectedBookingRef?.fromPage || "dashboard"}
          />
        );
      default:
        return <DashboardPage />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      <BookingContext.Provider
        value={{ setSelectedBookingRef, setCurrentPage }}
      >
        {renderCurrentPage()}
      </BookingContext.Provider>
    </MainLayout>
  );
}

export default App;
