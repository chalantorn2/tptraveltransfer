// src/components/pages/BookingDetailPage.jsx
import { useState, useEffect } from "react";
import { backendApi } from "../../services/backendApi";
import { getCompanyClass } from "../../config/company";

function BookingDetailPage({ bookingRef, onBack, fromPage = "dashboard" }) {
  const [bookingDetail, setBookingDetail] = useState(null);
  const [bookingNotes, setBookingNotes] = useState(null);
  const [apiNotes, setApiNotes] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the actual ref from bookingRef (could be object or string)
  const ref = bookingRef?.ref || bookingRef;

  useEffect(() => {
    if (ref) {
      fetchBookingDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      // ดึง booking detail จาก database
      const response = await backendApi.getBookingDetailFromDB(ref);

      if (response.success) {
        setBookingDetail({ booking: response.data });
        setBookingNotes(response.notes); // เก็บไว้เผื่อใช้

        // ดึง notes จาก API แยกต่างหาก
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
        // แปลง notes จาก API เป็น text
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

  const extractNotesFromRawData = (rawData) => {
    if (!rawData) return null;

    try {
      const parsed =
        typeof rawData === "string" ? JSON.parse(rawData) : rawData;

      // ลองหาจาก detail_data ก่อน
      if (parsed.detail_data?.booking?.notes) {
        return parsed.detail_data.booking.notes;
      }

      // ลองหาจาก search_data
      if (parsed.search_data?.notes) {
        return parsed.search_data.notes;
      }

      return null;
    } catch (error) {
      console.log("Error parsing raw data for notes:", error);
      return null;
    }
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

  // Helper function to format notes from database
  const formatNotes = (notesData, bookingNotesContent = null) => {
    // ลองใช้ notes จาก booking.notes_content ก่อน (จาก Notes API)
    if (bookingNotesContent) {
      return bookingNotesContent;
    }

    // ถ้าไม่มีให้ใช้จาก booking_notes table
    if (notesData && typeof notesData === "object") {
      if (notesData.content) {
        let noteText = notesData.content;

        const flags = [];
        if (notesData.flight_no_query) flags.push("Flight Query");
        if (notesData.wrong_resort) flags.push("Wrong Resort");
        if (notesData.mandatory_child_seat) flags.push("Child Seat Required");
        if (notesData.missing_accommodation)
          flags.push("Missing Accommodation");
        if (notesData.no_show_arrival) flags.push("No Show Arrival");
        if (notesData.no_show_departure) flags.push("No Show Departure");

        if (flags.length > 0) {
          noteText += `\n\nFlags: ${flags.join(", ")}`;
        }

        noteText += `\n\nLast updated: ${notesData.created_at || "-"}`;
        return noteText;
      }
    }

    return "No notes available";
  };

  // === Small presentational helpers (no icons) ===
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

  // Status chip color
  const statusColor =
    general.status === "PCON"
      ? "bg-cyan-100 text-cyan-800"
      : general.status === "ACON"
      ? "bg-green-100 text-green-800"
      : general.status === "ACAN"
      ? "bg-red-100 text-red-800"
      : general.status === "PAMM"
      ? "bg-yellow-100 text-yellow-800"
      : general.status === "AAMM"
      ? "bg-purple-100 text-purple-800"
      : "bg-gray-100 text-gray-800";

  return (
    <div className="space-y-6">
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
    </div>
  );
}

export default BookingDetailPage;
