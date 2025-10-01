// src/components/pages/BookingDetailPage.jsx
import { useState, useEffect, useContext } from "react";
import { backendApi } from "../../services/backendApi";
import { getCompanyClass } from "../../config/company";
import { BookingContext } from "../../App";

function BookingDetailPage({ bookingRef, onBack, fromPage = "dashboard" }) {
  const [bookingDetail, setBookingDetail] = useState(null);
  const [bookingNotes, setBookingNotes] = useState(null);
  const [apiNotes, setApiNotes] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const { refreshBookings } = useContext(BookingContext);
  const [driverSearchTerm, setDriverSearchTerm] = useState("");
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(driverSearchTerm.toLowerCase()) ||
      d.phone_number.includes(driverSearchTerm)
  );

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.registration.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
      (v.brand &&
        v.brand.toLowerCase().includes(vehicleSearchTerm.toLowerCase())) ||
      (v.model &&
        v.model.toLowerCase().includes(vehicleSearchTerm.toLowerCase()))
  );

  const [assignmentForm, setAssignmentForm] = useState({
    driver_id: "",
    vehicle_id: "",
    notes: "",
  });
  const [assignLoading, setAssignLoading] = useState(false);

  const ref = bookingRef?.ref || bookingRef;

  // === Assignment Functions ===
  const fetchAssignment = async () => {
    try {
      const response = await fetch(
        `/api/assignments/assign.php?booking_ref=${ref}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        setAssignment(data.data);
      }
    } catch (error) {
      console.error("Error fetching assignment:", error);
    }
  };

  const fetchDriversAndVehicles = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        fetch("/api/drivers/manage.php"),
        fetch("/api/vehicles/manage.php"),
      ]);

      const driversData = await driversRes.json();
      const vehiclesData = await vehiclesRes.json();

      if (driversData.success) {
        setDrivers(driversData.data.filter((d) => d.status === "active"));
      }

      if (vehiclesData.success) {
        setVehicles(vehiclesData.data.filter((v) => v.status === "active"));
      }
    } catch (error) {
      console.error("Error fetching drivers/vehicles:", error);
    }
  };

  const handleDriverChange = (driverId) => {
    const driver = drivers.find((d) => d.id == driverId);
    setAssignmentForm({
      ...assignmentForm,
      driver_id: driverId,
      vehicle_id: driver?.default_vehicle_id || "",
    });
  };

  const handleAssignJob = async () => {
    if (!assignmentForm.driver_id || !assignmentForm.vehicle_id) {
      alert("Please select driver and vehicle");
      return;
    }

    try {
      setAssignLoading(true);

      const response = await fetch("/api/assignments/assign.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_ref: ref,
          ...assignmentForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Job assigned successfully!");
        setShowAssignModal(false);
        fetchAssignment();
        setAssignmentForm({ driver_id: "", vehicle_id: "", notes: "" });

        // ← เพิ่มบรรทัดนี้: Trigger refresh ใน BookingManagementPage
        window.dispatchEvent(new Event("refreshBookings"));
      } else {
        alert(data.message || "Failed to assign job");
      }
    } catch (error) {
      console.error("Error assigning job:", error);
      alert("Error assigning job");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!assignmentForm.driver_id || !assignmentForm.vehicle_id) {
      alert("Please select driver and vehicle");
      return;
    }

    try {
      setAssignLoading(true);

      const response = await fetch("/api/assignments/assign.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_id: assignment.id,
          ...assignmentForm,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Job reassigned successfully!");
        setShowAssignModal(false);
        fetchAssignment();
        setAssignmentForm({ driver_id: "", vehicle_id: "", notes: "" });
        window.dispatchEvent(new Event("refreshBookings"));
      } else {
        alert(data.message || "Failed to reassign job");
      }
    } catch (error) {
      console.error("Error reassigning job:", error);
      alert("Error reassigning job");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!confirm("Are you sure you want to unassign this job?")) return;

    try {
      const response = await fetch(
        `/api/assignments/assign.php?id=${assignment.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        alert("Assignment removed successfully!");
        setAssignment(null);
        setShowAssignModal(false);
      } else {
        alert(data.message || "Failed to remove assignment");
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
      alert("Error removing assignment");
    }
  };

  const handleSelectDriver = (driver) => {
    setAssignmentForm({
      ...assignmentForm,
      driver_id: driver.id,
      vehicle_id: driver.default_vehicle_id || assignmentForm.vehicle_id,
    });
    setDriverSearchTerm(`${driver.name} (${driver.phone_number})`);
    setShowDriverDropdown(false);
  };

  // Handle vehicle selection
  const handleSelectVehicle = (vehicle) => {
    setAssignmentForm({
      ...assignmentForm,
      vehicle_id: vehicle.id,
    });
    setVehicleSearchTerm(
      `${vehicle.registration} - ${vehicle.brand} ${vehicle.model}`
    );
    setShowVehicleDropdown(false);
  };

  const openAssignModal = () => {
    if (assignment) {
      const driver = drivers.find((d) => d.id == assignment.driver_id);
      const vehicle = vehicles.find((v) => v.id == assignment.vehicle_id);

      setDriverSearchTerm(
        driver ? `${driver.name} (${driver.phone_number})` : ""
      );
      setVehicleSearchTerm(
        vehicle
          ? `${vehicle.registration} - ${vehicle.brand} ${vehicle.model}`
          : ""
      );

      setAssignmentForm({
        driver_id: assignment.driver_id,
        vehicle_id: assignment.vehicle_id,
        notes: assignment.assignment_notes || "",
      });
    } else {
      setDriverSearchTerm("");
      setVehicleSearchTerm("");
      setAssignmentForm({ driver_id: "", vehicle_id: "", notes: "" });
    }

    setShowDriverDropdown(false);
    setShowVehicleDropdown(false);
    setShowAssignModal(true);
  };

  useEffect(() => {
    if (ref) {
      fetchBookingDetail();
      fetchAssignment();
      fetchDriversAndVehicles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await backendApi.getBookingDetailFromDB(ref);

      if (response.success) {
        setBookingDetail({ booking: response.data });
        setBookingNotes(response.notes);
        fetchNotesFromAPI();
      } else {
        throw new Error(response.error || "Failed to fetch booking detail");
      }
    } catch (err) {
      console.error("Error fetching booking detail:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotesFromAPI = async () => {
    try {
      setNotesLoading(true);
      const notesResponse = await backendApi.holidayTaxis.getBookingNotes(ref);

      if (notesResponse.success && notesResponse.data.notes) {
        const apiNotesData = notesResponse.data.notes;
        if (apiNotesData.note_0) {
          const note = apiNotesData.note_0;
          let noteText = note.note || "";

          if (note.notedate) noteText += `\n\nDate: ${note.notedate}`;
          if (note.user) noteText += `\nUser: ${note.user}`;

          const flags = [];
          if (note.flightnoquery) flags.push("Flight Query");
          if (note.wrongresort) flags.push("Wrong Resort");

          if (flags.length > 0) {
            noteText += `\nFlags: ${flags.join(", ")}`;
          }

          setApiNotes(noteText);
        }
      }
    } catch (error) {
      console.error("Error fetching notes from API:", error);
      setApiNotes("Error loading notes from API");
    } finally {
      setNotesLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

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

  const getReadableStatus = (status) => {
    const statusMap = {
      PCON: "Pending Confirmation",
      ACON: "Confirmed",
      PCAN: "Pending Cancellation",
      ACAN: "Cancelled",
      PAMM: "Pending Amendment",
      AAMM: "Amendment Approved",
    };
    return statusMap[status] || status;
  };

  const Section = ({ title, children, right }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-base lg:text-lg font-semibold text-gray-900">
          {title}
        </h2>
        {right}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );

  const Row = ({ label, value, span = 1 }) => (
    <div className={`col-span-${span}`}>
      <div className="text-[13px] font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-[15px] text-gray-900">{value ?? "-"}</div>
    </div>
  );

  const SimpleList = ({ items }) => (
    <div className="divide-y divide-gray-100 rounded-lg overflow-hidden border border-gray-100">
      {items.map(({ label, value }, idx) => (
        <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-3 bg-white">
          <div className="col-span-5 md:col-span-4 text-sm text-gray-600">
            {label}
          </div>
          <div className="col-span-7 md:col-span-8 text-sm text-gray-900">
            {value || "-"}
          </div>
        </div>
      ))}
    </div>
  );

  if (!ref) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No booking selected</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Loading…</h1>
        </div>

        <Section title="Loading booking details">
          <div className="text-center py-8">
            <p className="text-gray-500 font-medium">
              Please wait while we fetch the booking information.
            </p>
          </div>
        </Section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Error</h1>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
          <button
            onClick={fetchBookingDetail}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const booking = bookingDetail?.booking;
  const general = booking?.general || {};
  const arrival = booking?.arrival || {};
  const departure = booking?.departure || {};

  const statusColor =
    general.status === "PCON"
      ? "bg-blue-100 text-blue-800"
      : general.status === "ACON"
      ? "bg-green-100 text-green-800"
      : general.status === "PCAN"
      ? "bg-orange-100 text-orange-800"
      : general.status === "ACAN"
      ? "bg-red-100 text-red-800"
      : general.status === "PAMM"
      ? "bg-yellow-100 text-yellow-800"
      : general.status === "AAMM"
      ? "bg-purple-100 text-purple-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div className="space-y-6">
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .modal-content {
          background: white;
          border-radius: 0.75rem;
          max-width: 32rem;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Booking Detail: {ref}
            </h1>
            <p className="text-gray-600 mt-1">รายละเอียดการจองทั้งหมด</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor}`}
          >
            {getReadableStatus(general.status)}
          </span>

          {/* Assignment Button */}
          <button
            onClick={openAssignModal}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${
              assignment
                ? "bg-green-600 hover:bg-green-700"
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            <i
              className={`fas ${
                assignment ? "fa-user-check" : "fa-user-plus"
              } mr-2`}
            ></i>
            {assignment ? "Assigned" : "Assign Job"}
          </button>

          <button
            onClick={fetchBookingDetail}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${getCompanyClass(
              "primary"
            )} ${getCompanyClass("primaryHover")} text-white`}
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Information */}
        <Section
          title="General Information"
          right={
            general.bookingtype ? (
              <span className="text-sm text-gray-500">
                {formatDate(general?.bookingdate)}
              </span>
            ) : null
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Row label="Booking Type" value={general.bookingtype || "-"} />
            <Row label="Vehicle" value={general.vehicle || "-"} />

            <div className="md:col-span-2">
              <SimpleList
                items={[
                  { label: "Adults", value: general.adults || 0 },
                  { label: "Children", value: general.children || 0 },
                  { label: "Infants", value: general.infants || 0 },
                  { label: "Airport", value: general.airport || "-" },
                  { label: "Resort", value: general.resort || "-" },
                ]}
              />
            </div>
          </div>
        </Section>

        {/* Passenger Information */}
        <Section title="Passenger Information">
          <SimpleList
            items={[
              { label: "Name", value: general.passengername || "-" },
              { label: "Phone", value: general.passengertelno || "-" },
              { label: "Email", value: general.passengeremail || "-" },
            ]}
          />
        </Section>

        {/* Arrival Information */}
        {arrival && Object.keys(arrival).length > 0 && (
          <Section title="Arrival Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Row
                label="Arrival Date"
                value={formatDateTime(arrival.arrivaldate)}
              />
              <Row label="Flight Number" value={arrival.flightno || "-"} />
            </div>
            <SimpleList
              items={[
                {
                  label: "Accommodation",
                  value: arrival.accommodationname || "-",
                },
                {
                  label: "Address",
                  value:
                    [
                      arrival.accommodationaddress1,
                      arrival.accommodationaddress2,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-",
                },
                { label: "Contact", value: arrival.accommodationtel || "-" },
              ]}
            />
          </Section>
        )}

        {/* Departure Information */}
        {departure && Object.keys(departure).length > 0 && (
          <Section title="Departure Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Row
                label="Departure Date"
                value={formatDateTime(departure.departuredate)}
              />
              <Row
                label="Pickup Date"
                value={formatDateTime(departure.pickupdate)}
              />
            </div>
            <SimpleList
              items={[
                { label: "Flight Number", value: departure.flightno || "-" },
                {
                  label: "Accommodation",
                  value: departure.accommodationname || "-",
                },
              ]}
            />
          </Section>
        )}
      </div>

      {/* Notes */}
      {(apiNotes || notesLoading) && (
        <Section title="Booking Notes (from API)">
          {notesLoading ? (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <i className="fas fa-spinner animate-spin mr-2"></i>
              Loading notes from Holiday Taxis API...
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-line">
              {apiNotes || "No notes available from API"}
            </div>
          )}
        </Section>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAssignModal(false);
            setShowDriverDropdown(false);
            setShowVehicleDropdown(false);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {assignment ? "Reassign Job" : "Assign Job"}
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Show current assignment if exists */}
              {assignment && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 font-medium mb-2">
                    Current Assignment:
                  </p>
                  <p className="text-sm text-blue-800">
                    <i className="fas fa-user mr-2"></i>
                    {assignment.driver_name}
                  </p>
                  <p className="text-sm text-blue-800">
                    <i className="fas fa-car mr-2"></i>
                    {assignment.registration} - {assignment.brand}{" "}
                    {assignment.model}
                  </p>
                </div>
              )}

              {/* Driver Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Driver *
                </label>

                <input
                  type="text"
                  value={driverSearchTerm}
                  onChange={(e) => {
                    setDriverSearchTerm(e.target.value);
                    setShowDriverDropdown(true);
                  }}
                  onFocus={() => setShowDriverDropdown(true)}
                  placeholder="Type to search driver..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Driver Dropdown */}
                {showDriverDropdown && filteredDrivers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredDrivers.map((driver) => (
                      <div
                        key={driver.id}
                        onClick={() => handleSelectDriver(driver)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {driver.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {driver.phone_number}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Autocomplete */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Vehicle *
                </label>

                <input
                  type="text"
                  value={vehicleSearchTerm}
                  onChange={(e) => {
                    setVehicleSearchTerm(e.target.value);
                    setShowVehicleDropdown(true);
                  }}
                  onFocus={() => setShowVehicleDropdown(true)}
                  placeholder="Type to search vehicle..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Vehicle Dropdown */}
                {showVehicleDropdown && filteredVehicles.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredVehicles.map((vehicle) => (
                      <div
                        key={vehicle.id}
                        onClick={() => handleSelectVehicle(vehicle)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {vehicle.registration}
                        </div>
                        <div className="text-sm text-gray-600">
                          {vehicle.brand} {vehicle.model}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={assignmentForm.notes}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      notes: e.target.value,
                    })
                  }
                  rows="3"
                  placeholder="Any special instructions for the driver..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              {assignment && (
                <button
                  onClick={handleUnassign}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50"
                >
                  <i className="fas fa-times-circle mr-2"></i>
                  Unassign
                </button>
              )}

              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={assignment ? handleReassign : handleAssignJob}
                  disabled={assignLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${getCompanyClass(
                    "primary"
                  )} ${getCompanyClass("primaryHover")} disabled:opacity-50`}
                >
                  {assignLoading ? (
                    <>
                      <i className="fas fa-spinner animate-spin mr-2"></i>
                      {assignment ? "Reassigning..." : "Assigning..."}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check mr-2"></i>
                      {assignment ? "Reassign Job" : "Assign Job"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingDetailPage;
