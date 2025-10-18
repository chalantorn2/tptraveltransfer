// src/components/pages/FreelanceJobsPage.jsx
import { useState, useEffect, useContext } from "react";
import { getCompanyClass } from "../../config/company";
import { statusUtils } from "../../services/backendApi";
import { BookingContext } from "../../App";

function FreelanceJobsPage() {
  const { setSelectedBookingRef, setCurrentPage: setAppPage } =
    useContext(BookingContext);

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: statusFilter,
        limit: 100,
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/assignments/list.php?${params}`);
      const data = await response.json();

      if (data.success) {
        setAssignments(data.data.assignments);
      } else {
        setError(data.message || "Failed to load assignments");
      }
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchAssignments();
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const toggleRowExpansion = (assignmentId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(assignmentId)) {
      newExpanded.delete(assignmentId);
    } else {
      newExpanded.add(assignmentId);
    }
    setExpandedRows(newExpanded);
  };

  const sortedAssignments = [...assignments].sort((a, b) => {
    if (!sortConfig.key) return 0;

    let aValue, bValue;
    switch (sortConfig.key) {
      case "bookingRef":
        aValue = a.booking_ref;
        bValue = b.booking_ref;
        break;
      case "passenger":
        aValue = a.booking.passenger_name;
        bValue = b.booking.passenger_name;
        break;
      case "driver":
        aValue = a.driver.name;
        bValue = b.driver.name;
        break;
      case "vehicle":
        aValue = a.vehicle.registration;
        bValue = b.vehicle.registration;
        break;
      case "pickupDate":
        aValue = a.booking.pickup_date || "";
        bValue = b.booking.pickup_date || "";
        break;
      case "assignedAt":
        aValue = a.assigned_at;
        bValue = b.assigned_at;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString(
      "en-GB",
      { hour: "2-digit", minute: "2-digit" }
    )}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      assigned: {
        bg: "bg-green-100",
        text: "text-green-800",
        label: "Assigned",
      },
      completed: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        label: "Completed",
      },
      cancelled: { bg: "bg-red-100", text: "text-red-800", label: "Cancelled" },
    };

    const config = statusConfig[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      label: status,
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        {config.label}
      </span>
    );
  };

  const getTrackingBadge = (tracking) => {
    if (!tracking.has_tracking) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
          <i className="fas fa-link-slash mr-1 text-xs"></i>
          No Tracking
        </span>
      );
    }

    const statusConfig = {
      pending: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: "fa-clock",
        label: "Pending Start",
      },
      active: {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: "fa-location-dot",
        label: "Tracking Active",
      },
      completed: {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: "fa-check-circle",
        label: "Completed",
      },
    };

    const config = statusConfig[tracking.status] || {
      bg: "bg-gray-100",
      text: "text-gray-600",
      icon: "fa-question",
      label: tracking.status,
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
      >
        <i className={`fas ${config.icon} mr-1 text-xs`}></i>
        {config.label}
        {tracking.status === "active" && tracking.total_locations_sent > 0 && (
          <span className="ml-1">({tracking.total_locations_sent})</span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Job Assignments
          </h1>
          <p className="text-gray-600 mt-1">
            รายการงานที่มอบหมายให้คนขับทั้งหมด
          </p>
        </div>
        <button
          onClick={fetchAssignments}
          className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white ${getCompanyClass(
            "primary"
          )} ${getCompanyClass("primaryHover")} shadow-sm`}
        >
          <i className="fas fa-sync-alt"></i>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="assigned">Assigned</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Booking ref, driver, vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${getCompanyClass(
                  "primary"
                )} ${getCompanyClass("primaryHover")}`}
              >
                <i className="fas fa-search"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Assignments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-spinner animate-spin text-2xl text-gray-400"></i>
              </div>
              <p className="text-gray-500 font-medium">
                Loading assignments...
              </p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-clipboard-list text-2xl text-gray-400"></i>
              </div>
              <p className="text-gray-500 font-medium">No assignments found</p>
              <p className="text-sm text-gray-400 mt-1">
                {statusFilter !== "all"
                  ? `No ${statusFilter} assignments`
                  : "Start by assigning jobs from booking details"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <button
                      onClick={() => handleSort("bookingRef")}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Booking Ref
                      {sortConfig.key === "bookingRef" && (
                        <i
                          className={`fas fa-sort-${
                            sortConfig.direction === "asc" ? "up" : "down"
                          } text-xs`}
                        ></i>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <button
                      onClick={() => handleSort("passenger")}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Passenger
                      {sortConfig.key === "passenger" && (
                        <i
                          className={`fas fa-sort-${
                            sortConfig.direction === "asc" ? "up" : "down"
                          } text-xs`}
                        ></i>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <button
                      onClick={() => handleSort("driver")}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Driver
                      {sortConfig.key === "driver" && (
                        <i
                          className={`fas fa-sort-${
                            sortConfig.direction === "asc" ? "up" : "down"
                          } text-xs`}
                        ></i>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <button
                      onClick={() => handleSort("vehicle")}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Vehicle
                      {sortConfig.key === "vehicle" && (
                        <i
                          className={`fas fa-sort-${
                            sortConfig.direction === "asc" ? "up" : "down"
                          } text-xs`}
                        ></i>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Route
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <button
                      onClick={() => handleSort("pickupDate")}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Pickup Date/Time
                      {sortConfig.key === "pickupDate" && (
                        <i
                          className={`fas fa-sort-${
                            sortConfig.direction === "asc" ? "up" : "down"
                          } text-xs`}
                        ></i>
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    Tracking
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">
                    <button
                      onClick={() => handleSort("assignedAt")}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      Assigned
                      {sortConfig.key === "assignedAt" && (
                        <i
                          className={`fas fa-sort-${
                            sortConfig.direction === "asc" ? "up" : "down"
                          } text-xs`}
                        ></i>
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>

              <tbody>
                {sortedAssignments.map((assignment) => {
                  const isExpanded = expandedRows.has(assignment.id);
                  const hasDetails =
                    assignment.assignment_notes || assignment.cancelled_at;
                  const rowBgColor =
                    assignment.status === "cancelled"
                      ? "bg-red-50"
                      : assignment.status === "completed"
                      ? "bg-blue-50"
                      : "";

                  return (
                    <>
                      <tr
                        key={assignment.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${rowBgColor}`}
                      >
                        {/* Booking Ref */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            className={`${getCompanyClass(
                              "text"
                            )} hover:underline font-medium cursor-pointer`}
                            onClick={() => {
                              setSelectedBookingRef({
                                ref: assignment.booking_ref,
                                fromPage: "jobs",
                              });
                              setAppPage("booking-detail");
                            }}
                          >
                            {assignment.booking_ref}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(assignment.status)}
                          </div>
                        </td>

                        {/* Passenger */}
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 truncate ">
                              {assignment.booking.passenger_name} /{" "}
                              {assignment.booking.pax} pax
                            </p>
                          </div>
                        </td>

                        {/* Driver */}
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-[150px]">
                              {assignment.driver.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {assignment.driver.phone}
                            </p>
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-sm truncate text-gray-900">
                              {assignment.vehicle.registration}
                            </p>
                          </div>
                        </td>

                        {/* Route */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 text-sm">
                            <span
                              className="text-gray-700 truncate "
                              title={assignment.booking.pickup_location}
                            >
                              {assignment.booking.pickup_location}
                            </span>
                            <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                            <span
                              className="text-gray-700 truncate "
                              title={assignment.booking.dropoff_location}
                            >
                              {assignment.booking.dropoff_location}
                            </span>
                          </div>
                        </td>

                        {/* Pickup Date/Time */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">
                              {formatDate(assignment.booking.pickup_date)}
                            </p>
                            {assignment.booking.pickup_date && (
                              <p className="text-xs text-gray-600">
                                {formatTime(assignment.booking.pickup_date)}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Tracking */}
                        <td className="py-3 px-4">
                          {getTrackingBadge(assignment.tracking)}
                        </td>

                        {/* Assigned Info */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div>
                            <p className="text-xs text-gray-900">
                              {formatDate(assignment.assigned_at)}
                            </p>
                            {assignment.assigned_by_name && (
                              <p className="text-xs text-gray-500 truncate max-w-[120px]">
                                by {assignment.assigned_by_name}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Expand Button */}
                        <td className="py-3 px-4">
                          {hasDetails && (
                            <button
                              onClick={() => toggleRowExpansion(assignment.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <i
                                className={`fas fa-chevron-${
                                  isExpanded ? "up" : "down"
                                }`}
                              ></i>
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && hasDetails && (
                        <tr
                          key={`${assignment.id}-expanded`}
                          className={rowBgColor}
                        >
                          <td colSpan="10" className="py-3 px-4 bg-gray-50">
                            <div className="space-y-2">
                              {assignment.assignment_notes && (
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs text-gray-500 font-medium mb-1">
                                    Notes:
                                  </p>
                                  <p className="text-sm text-gray-700">
                                    {assignment.assignment_notes}
                                  </p>
                                </div>
                              )}
                              {assignment.cancelled_at && (
                                <div className="bg-red-100 rounded-lg p-3 border border-red-200">
                                  <p className="text-xs text-red-600 font-medium mb-1">
                                    Cancelled at{" "}
                                    {formatDateTime(assignment.cancelled_at)}
                                  </p>
                                  {assignment.cancellation_reason && (
                                    <p className="text-sm text-red-700">
                                      Reason: {assignment.cancellation_reason}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default FreelanceJobsPage;
