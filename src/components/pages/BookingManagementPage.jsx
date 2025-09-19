// src/components/pages/BookingManagementPage.jsx
import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import { getCompanyClass } from "../../config/company";
import { BookingContext } from "../../App";

function BookingManagementPage() {
  const { setSelectedBookingRef, setCurrentPage: setAppPage } =
    useContext(BookingContext);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 20,
    has_next: false,
    has_prev: false,
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    dateType: "pickup", // 'pickup' or 'arrival'
    search: "",
    page: 1,
  });

  // API call function
  const fetchBookings = useCallback(async (searchFilters) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: searchFilters.page,
        limit: 20,
        status: searchFilters.status,
        date_type: searchFilters.dateType,
      });

      if (searchFilters.dateFrom)
        params.append("date_from", searchFilters.dateFrom);
      if (searchFilters.dateTo) params.append("date_to", searchFilters.dateTo);
      if (searchFilters.search.trim())
        params.append("search", searchFilters.search.trim());

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL ||
          "https://www.tptraveltransfer.com//api"
        }/bookings/database-search.php?${params}`
      );
      const data = await response.json();

      if (data.success) {
        setBookings(data.data.bookings);
        setPagination(data.data.pagination);
      } else {
        console.error("API Error:", data.error);
        setBookings([]);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value, page: 1 };
    setFilters(newFilters);
  };

  // Handle search (real-time with debounce)
  const handleSearchChange = (searchTerm) => {
    const newFilters = { ...filters, search: searchTerm, page: 1 };
    setFilters(newFilters);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        fetchBookings(filters);
      },
      filters.search.trim() ? 300 : 0
    ); // 300ms delay for search, immediate for other filters

    return () => clearTimeout(timeoutId);
  }, [filters, fetchBookings]);

  // Calculate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const { current_page, total_pages } = pagination;
    const maxVisible = 5;

    if (total_pages <= maxVisible) {
      return Array.from({ length: total_pages }, (_, i) => i + 1);
    }

    let start = Math.max(1, current_page - Math.floor(maxVisible / 2));
    let end = Math.min(total_pages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [pagination.current_page, pagination.total_pages]);

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

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

  const cleanVehicleName = (vehicle) => {
    if (!vehicle || vehicle === "-") return "-";
    return vehicle
      .replace(/^Private\s+/, "")
      .replace(/^Shared\s+/, "")
      .trim();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Booking Management
          </h1>
          <p className="text-gray-600 mt-1">
            จัดการงานทั้งหมดและมอบหมายให้คนขับ
          </p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Search Bar */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Booking Ref or Passenger Name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="PCON">Pending Confirmation</option>
              <option value="ACON">Confirmed</option>
              <option value="ACAN">Cancelled</option>
              <option value="PAMM">Pending Amendment</option>
              <option value="AAMM">Amendment Approved</option>
            </select>
          </div>

          {/* Date Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Type
            </label>
            <select
              value={filters.dateType}
              onChange={(e) => handleFilterChange("dateType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
            >
              <option value="pickup">Pickup Date</option>
              <option value="arrival">Arrival Date</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {pagination.is_default_query
                ? `Showing ${bookings.length} of ${pagination.total_records} recent bookings`
                : `Showing ${bookings.length} of ${pagination.total_records} bookings`}
            </span>
            <button
              onClick={() => fetchBookings(filters)}
              disabled={loading}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${getCompanyClass(
                "primary"
              )} ${getCompanyClass(
                "primaryHover"
              )} text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner animate-spin mr-2"></i>
                  Loading...
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-2"></i>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-spinner animate-spin text-2xl text-gray-400"></i>
              </div>
              <p className="text-gray-500 font-medium">Loading bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-search text-2xl text-gray-400"></i>
              </div>
              <p className="text-gray-500 font-medium">No bookings found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">
                    Booking Ref
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">
                    Passenger
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">
                    Pax
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">
                    Arrival
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">
                    Pickup
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">
                    Vehicle
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 border-b">
                    Sync Time
                  </th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        className={`${getCompanyClass(
                          "text"
                        )} hover:underline font-medium cursor-pointer`}
                        onClick={() => {
                          setSelectedBookingRef({
                            ref: booking.ref,
                            fromPage: "jobs",
                          });
                          setAppPage("booking-detail");
                        }}
                      >
                        {booking.ref}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
                          booking.status === "PCON"
                            ? "bg-cyan-100 text-cyan-800"
                            : booking.status === "ACON"
                            ? "bg-green-100 text-green-800"
                            : booking.status === "ACAN"
                            ? "bg-red-100 text-red-800"
                            : booking.status === "PAMM"
                            ? "bg-yellow-100 text-yellow-800"
                            : booking.status === "AAMM"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {getReadableStatus(booking.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-normal text-gray-900">
                          {booking.passenger?.name || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">
                        {booking.pax}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(booking.arrivalDate)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(booking.pickupDate)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {cleanVehicleName(booking.vehicle)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDateTime(booking.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing{" "}
                {(pagination.current_page - 1) * pagination.per_page + 1} to{" "}
                {Math.min(
                  pagination.current_page * pagination.per_page,
                  pagination.total_records
                )}{" "}
                of {pagination.total_records}
                {pagination.is_default_query ? " recent" : ""} bookings
              </div>

              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={!pagination.has_prev}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-chevron-left mr-1"></i>
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pagination.current_page === pageNumber
                          ? `${getCompanyClass("primary")} text-white`
                          : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={!pagination.has_next}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <i className="fas fa-chevron-right ml-1"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingManagementPage;
