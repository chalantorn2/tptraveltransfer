// src/services/backendApi.js - Enhanced Backend API Service with Complete Holiday Taxis Integration
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://www.tptraveltransfer.com/api";

/**
 * Enhanced Backend API Service
 */
export const backendApi = {
  // Enhanced Dashboard with Auto Sync & Complete Data
  async getEnhancedDashboardData() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/enhanced-sync.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error || "Failed to fetch enhanced dashboard data"
        );
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error("Enhanced Dashboard API Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Original Dashboard Stats (keep for backward compatibility)
  async getDashboardStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard/stats.php`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch dashboard stats");
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error("Backend API Error (stats):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Original Recent Jobs (keep for backward compatibility)
  async getRecentJobs(limit = 10, status = "all", page = 1) {
    try {
      const params = new URLSearchParams({ limit, status, page });
      const response = await fetch(
        `${API_BASE_URL}/dashboard/recent-jobs.php?${params}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch recent jobs");
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error("Backend API Error (recent jobs):", error);
      return { success: false, error: error.message };
    }
  },

  // Enhanced Sync with Detailed Data
  async syncHolidayTaxis(days = 7, detailSync = true) {
    try {
      const formData = new FormData();
      formData.append("days", days);
      formData.append("detail_sync", detailSync);

      const response = await fetch(`${API_BASE_URL}/sync/holiday-taxis.php`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to sync with Holiday Taxis");
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      console.error("Backend API Error (sync):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Get booking detail from database (fast)
  async getBookingDetailFromDB(bookingRef) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/booking-detail-db.php?ref=${bookingRef}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.error || "Failed to get booking detail from database"
        );
      }

      return {
        success: true,
        data: data.data.booking,
        notes: data.data.notes,
        meta: data.data.meta,
      };
    } catch (error) {
      console.error("Database Booking Detail API Error:", error);
      return { success: false, error: error.message };
    }
  },

  // Enhanced Booking Search (internal database)
  async searchBookings(filters = {}) {
    try {
      const params = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 20,
        status: filters.status || "all",
        date_type: filters.dateType || "pickup",
        date_from: filters.dateFrom || "",
        date_to: filters.dateTo || "",
        search: filters.search || "",
      });

      const response = await fetch(
        `${API_BASE_URL}/bookings/database-search.php?${params}`
      );
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to search bookings");
      }

      return { success: true, data: data.data };
    } catch (error) {
      console.error("Enhanced Booking Search API Error:", error);
      return { success: false, error: error.message };
    }
  },

  // Holiday Taxis Direct API Integration
  holidayTaxis: {
    // Search bookings from Holiday Taxis
    async search(type = "last-action", dateFrom, dateTo, page = 1) {
      try {
        const params = new URLSearchParams({
          type,
          dateFrom,
          dateTo,
          page,
        });

        const response = await fetch(
          `${API_BASE_URL}/holidaytaxis/search.php?${params}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(
            data.error || "Failed to search Holiday Taxis bookings"
          );
        }

        return { success: true, data: data.data };
      } catch (error) {
        console.error("Holiday Taxis Search API Error:", error);
        return { success: false, error: error.message };
      }
    },

    // Get individual booking detail
    async getBookingDetail(bookingRef) {
      try {
        const params = new URLSearchParams({
          ref: bookingRef,
          type: "detail",
        });

        const response = await fetch(
          `${API_BASE_URL}/holidaytaxis/booking-detail.php?${params}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to get booking detail");
        }

        return { success: true, data: data.data };
      } catch (error) {
        console.error("Holiday Taxis Booking Detail API Error:", error);
        return { success: false, error: error.message };
      }
    },

    // Get booking notes
    async getBookingNotes(bookingRef) {
      try {
        const params = new URLSearchParams({
          ref: bookingRef,
          type: "notes",
        });

        const response = await fetch(
          `${API_BASE_URL}/holidaytaxis/booking-detail.php?${params}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to get booking notes");
        }

        return { success: true, data: data.data };
      } catch (error) {
        console.error("Holiday Taxis Booking Notes API Error:", error);
        return { success: false, error: error.message };
      }
    },

    // Update single booking
    async updateBooking(bookingRef, updateData) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/holidaytaxis/booking-update.php?ref=${bookingRef}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to update booking");
        }

        return { success: true, data: data.data };
      } catch (error) {
        console.error("Holiday Taxis Update Booking API Error:", error);
        return { success: false, error: error.message };
      }
    },

    // Update multiple bookings
    async updateMultipleBookings(bookings) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/holidaytaxis/booking-update.php?type=update`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ bookings }),
          }
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to update multiple bookings");
        }

        return { success: true, data: data.data };
      } catch (error) {
        console.error(
          "Holiday Taxis Update Multiple Bookings API Error:",
          error
        );
        return { success: false, error: error.message };
      }
    },

    // Reconfirm bookings
    async reconfirmBookings(bookings) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/holidaytaxis/booking-update.php?type=reconfirm`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ bookings }),
          }
        );

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to reconfirm bookings");
        }

        return { success: true, data: data.data };
      } catch (error) {
        console.error("Holiday Taxis Reconfirm Bookings API Error:", error);
        return { success: false, error: error.message };
      }
    },

    // Get resorts metadata
    async getResorts(startAt = 1) {
      try {
        const params = new URLSearchParams({ startAt });
        const response = await fetch(
          `${API_BASE_URL}/holidaytaxis/resorts.php?${params}`
        );
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to get resorts data");
        }

        return { success: true, data: data.data };
      } catch (error) {
        console.error("Holiday Taxis Resorts API Error:", error);
        return { success: false, error: error.message };
      }
    },
  },
};

// Date utility functions
export const dateUtils = {
  // Format date for Holiday Taxis API (YYYY-MM-DDTHH:mm:ss)
  formatForHolidayTaxis(date) {
    return date.toISOString().split(".")[0];
  },

  // Get today's date range
  getTodayRange() {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const end = new Date(today.setHours(23, 59, 59, 999));

    return {
      from: this.formatForHolidayTaxis(start),
      to: this.formatForHolidayTaxis(end),
    };
  },

  // Get date range for last N days
  getLastNDaysRange(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    return {
      from: this.formatForHolidayTaxis(start),
      to: this.formatForHolidayTaxis(end),
    };
  },

  // Format date for display (DD/MM/YYYY)
  formatDisplayDate(dateString) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  },

  // Format datetime for display (DD/MM/YYYY HH:MM)
  formatDisplayDateTime(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return `${date.toLocaleDateString("en-GB")} ${date.toLocaleTimeString(
      "en-GB",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  },
};

// Status utility functions
export const statusUtils = {
  // Get readable status text
  getReadableStatus(status) {
    const statusMap = {
      PCON: "Pending Confirmation",
      ACON: "Confirmed",
      ACAN: "Cancelled",
      PAMM: "Pending Amendment",
      AAMM: "Amendment Approved",
    };
    return statusMap[status] || status;
  },

  // Get status color class
  getStatusColorClass(status) {
    const colorMap = {
      PCON: "bg-cyan-100 text-cyan-800",
      ACON: "bg-green-100 text-green-800",
      ACAN: "bg-red-100 text-red-800",
      PAMM: "bg-yellow-100 text-yellow-800",
      AAMM: "bg-purple-100 text-purple-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  },

  // Clean vehicle name (remove Private/Shared prefix)
  cleanVehicleName(vehicle) {
    if (!vehicle || vehicle === "-") return "-";
    return vehicle
      .replace(/^Private\s+/, "")
      .replace(/^Shared\s+/, "")
      .trim();
  },
};

export default backendApi;
