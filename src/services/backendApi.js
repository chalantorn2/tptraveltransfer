// src/services/backendApi.js - New Backend API Service
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://www.tptraveltransfer.com/api";

/**
 * Backend API Service for Dashboard
 */
export const backendApi = {
  // Get Dashboard Stats
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

  // Get Recent Jobs
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

  // Sync from Holiday Taxis
  async syncHolidayTaxis() {
    try {
      const response = await fetch(`${API_BASE_URL}/sync/holiday-taxis.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
};
