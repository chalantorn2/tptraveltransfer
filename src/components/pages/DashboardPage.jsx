// src/components/pages/DashboardPage.jsx - Original UI with Enhanced Backend
import { useState, useEffect, useContext } from "react";
import { getCompanyClass } from "../../config/company";
import { backendApi } from "../../services/backendApi";
import { BookingContext } from "../../App";

function DashboardPage() {
  const { setSelectedBookingRef, setCurrentPage: setAppPage } =
    useContext(BookingContext);
  const [bookingStats, setBookingStats] = useState({
    newBookings: 0,
    confirmed: 0,
    cancelled: 0,
    amendments: 0,
  });
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 10,
    has_next: false,
    has_prev: false,
  });

  const [syncLoading, setSyncLoading] = useState(false);

  // ฟังก์ชันดึงข้อมูลจาก Enhanced Backend แต่ fallback ถ้าไม่ได้
  const fetchDashboardData = async (page = 1) => {
    try {
      setLoading(true);

      // Try enhanced dashboard first
      const enhancedResponse = await backendApi.getEnhancedDashboardData();

      if (enhancedResponse.success && enhancedResponse.data) {
        // Use enhanced data
        const data = enhancedResponse.data;

        if (data.stats && data.stats.stats) {
          setBookingStats(data.stats.stats);
        }

        if (data.recent_bookings) {
          setRecentJobs(data.recent_bookings);
          // Create pagination from enhanced data
          setPagination({
            current_page: 1,
            total_pages: 1,
            total_records: data.recent_bookings.length,
            per_page: data.recent_bookings.length,
            has_next: false,
            has_prev: false,
          });
          setCurrentPage(1);
        }

        if (data.last_sync) {
          setLastUpdate(new Date(data.last_sync));
        } else {
          setLastUpdate(new Date()); // fallback ถ้าไม่มี
        }
        return;
      }

      // Fallback to original APIs
      const [statsResponse, jobsResponse] = await Promise.all([
        backendApi.getDashboardStats(),
        backendApi.getRecentJobs(10, "all", page),
      ]);

      if (statsResponse.success) {
        setBookingStats(statsResponse.data.stats);
      }

      if (jobsResponse.success) {
        setRecentJobs(jobsResponse.data.bookings);
        setPagination(jobsResponse.data.pagination);
        setCurrentPage(page);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชัน Sync & Refresh
  const handleSyncAndRefresh = async () => {
    try {
      setSyncLoading(true);

      // 1. Sync จาก Holiday Taxis
      const syncResponse = await backendApi.syncHolidayTaxis(7, true);

      // 2. ดึงข้อมูลใหม่จาก Database
      if (syncResponse.success) {
        await fetchDashboardData(currentPage);
        // ลบ alert ออก - ไม่แสดงอะไร
      } else {
        // เก็บแค่ error alert
        alert(`Sync failed: ${syncResponse.error}`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // formatDate function แก้
  const formatDate = (dateString) => {
    if (!dateString || dateString === "0000-00-00 00:00:00") return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  // Helper function to format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  };

  // Helper function to get readable status
  const getReadableStatus = (status) => {
    const statusMap = {
      PCON: "Pending Confirmation",
      ACON: "Confirmed",
      ACAN: "Cancelled",
      PAMM: "Pending Amendment",
      AAMM: "Amendment Approved",
    };
    return statusMap[status] || status;
  };

  // Helper function to clean vehicle name
  const cleanVehicleName = (vehicle) => {
    if (!vehicle || vehicle === "-") return "-";
    return vehicle
      .replace(/^Private\s+/, "")
      .replace(/^Shared\s+/, "")
      .trim();
  };

  // แค่โหลดข้อมูลจาก DB เฉยๆ
  useEffect(() => {
    fetchDashboardData(); // โหลดครั้งแรกเฉยๆ ไม่ sync
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">ภาพรวมงานทั้งหมดและสถิติประจำวัน</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "New Bookings / จองใหม่",
            count: loading ? "..." : bookingStats.newBookings,
            icon: "fas fa-plus-circle",
            color: "blue",
          },
          {
            title: "Confirmed / ยืนยันแล้ว",
            count: loading ? "..." : bookingStats.confirmed,
            icon: "fas fa-check-circle",
            color: "green",
          },
          {
            title: "Cancelled / ยกเลิก",
            count: loading ? "..." : bookingStats.cancelled,
            icon: "fas fa-times-circle",
            color: "red",
          },
          {
            title: "Amendments / แก้ไข",
            count: loading ? "..." : bookingStats.amendments,
            icon: "fas fa-edit",
            color: "yellow",
          },
        ].map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stat.count}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-xs text-gray-500">
                    อัปเดต: {lastUpdate.toLocaleTimeString("th-TH")}
                  </span>
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.color === "blue"
                    ? "bg-blue-50"
                    : stat.color === "yellow"
                    ? "bg-yellow-50"
                    : stat.color === "red"
                    ? "bg-red-50"
                    : "bg-green-50"
                }`}
              >
                <i
                  className={`${stat.icon} text-lg ${
                    stat.color === "blue"
                      ? "text-blue-600"
                      : stat.color === "yellow"
                      ? "text-yellow-600"
                      : stat.color === "red"
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                ></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fas fa-list-ul text-gray-400"></i>
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Bookings
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Last synced: {lastUpdate.toLocaleTimeString("en-GB")} (
                {lastUpdate.toLocaleDateString("en-GB")})
              </span>
              <button
                onClick={handleSyncAndRefresh}
                disabled={syncLoading}
                className="text-blue-600 cursor-pointer border p-1.5 rounded-sm hover:text-white hover:bg-blue-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i
                  className={`fas fa-sync-alt mr-1 ${
                    syncLoading ? "animate-spin" : ""
                  }`}
                ></i>
                Sync & Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-spinner animate-spin text-2xl text-gray-400"></i>
              </div>
              <p className="text-gray-500 font-medium">Loading data...</p>
              <p className="text-sm text-gray-400 mt-1">
                Fetching data from database...
              </p>
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-database text-2xl text-gray-400"></i>
              </div>
              <p className="text-gray-500 font-medium">No data in database</p>
              <p className="text-sm text-gray-400 mt-1">
                Data will sync automatically every hour
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Booking Ref
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Passenger
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Pickup Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Vehicle
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      Sync Time
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentJobs.map((job, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <button
                          className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer hover:underline"
                          onClick={() => {
                            setSelectedBookingRef({
                              ref: job.ref,
                              fromPage: "dashboard",
                            });
                            setAppPage("booking-detail");
                          }}
                        >
                          {job.ref}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium  rounded-full  ${
                            job.status === "PCON"
                              ? "bg-blue-100 text-blue-800"
                              : job.status === "ACON"
                              ? "bg-green-100 text-green-800"
                              : job.status === "ACAN"
                              ? "bg-red-100 text-red-800"
                              : job.status === "PAMM"
                              ? "bg-yellow-100 text-yellow-800"
                              : job.status === "AAMM"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {getReadableStatus(job.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-normal text-gray-900">
                          {job.passenger?.name || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-sm font-normal text-gray-600">
                        {formatDate(job.pickupDate)}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-normal text-gray-900">
                          {cleanVehicleName(job.vehicle)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-sm font-normal text-gray-600">
                        {formatDateTime(job.createdAt || job.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Footer */}
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing {recentJobs.length} bookings | Auto-sync every hour
              </div>
              {pagination.total_pages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * 10 + 1} to{" "}
                    {Math.min(currentPage * 10, pagination.total_records)} of{" "}
                    {pagination.total_records} bookings
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => fetchDashboardData(currentPage - 1)}
                      disabled={!pagination.has_prev}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {[...Array(pagination.total_pages)].map((_, index) => (
                      <button
                        key={index + 1}
                        onClick={() => fetchDashboardData(index + 1)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === index + 1
                            ? "bg-blue-500 text-white"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {index + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => fetchDashboardData(currentPage + 1)}
                      disabled={!pagination.has_next}
                      className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
