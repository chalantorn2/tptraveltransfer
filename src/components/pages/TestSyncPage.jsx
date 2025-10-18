import { useState } from "react";
import { COMPANY } from "../../config/company";

export default function TestSyncPage() {
  const [dateFrom, setDateFrom] = useState("2025-06-01T00:00:00");
  const [dateTo, setDateTo] = useState("2025-06-30T23:59:59");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/dev/test-sync-arrivals.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateFrom,
          dateTo,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Sync failed");
      }

      setResult(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Test Sync (Arrivals)
        </h1>
        <p className="text-sm text-gray-600">
          ทดสอบดึงข้อมูล Booking จาก Holiday Taxis Test API
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date From (Arrival)
            </label>
            <input
              type="text"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="YYYY-MM-DDTHH:mm:ss"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date To (Arrival)
            </label>
            <input
              type="text"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="YYYY-MM-DDTHH:mm:ss"
            />
          </div>

          <button
            onClick={handleSync}
            disabled={loading}
            className={`w-full ${COMPANY.colors.primary} text-white px-4 py-2 rounded-md ${
              loading ? "opacity-50 cursor-not-allowed" : COMPANY.colors.primaryHover
            }`}
          >
            {loading ? "Syncing..." : "Sync Test Bookings"}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <p className="font-medium mb-2">Sync Success!</p>
            <div className="text-sm space-y-1">
              <p>Found: {result.totalFound} bookings</p>
              <p>New: {result.totalNew} bookings</p>
              <p>Updated: {result.totalUpdated} bookings</p>
              <p>Detail Synced: {result.totalDetailed} bookings</p>
              <p className="text-xs text-gray-600 mt-2">
                {result.dateRange.from} → {result.dateRange.to}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
