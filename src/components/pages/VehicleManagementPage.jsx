// src/components/pages/VehicleManagementPage.jsx
import { useState, useEffect, useRef } from "react";
import { getCompanyClass } from "../../config/company";

// API Client
const apiCall = async (endpoint, options = {}) => {
  const url = `/api${endpoint}`;
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API call failed:", error);
    return { success: false, message: "Network error" };
  }
};

function VehicleManagementPage() {
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    registration: "",
    brand: "",
    model: "",
    color: "",
    description: "",
    default_driver_id: "",
    status: "active",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef(null);

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const result = await apiCall("/vehicles/manage.php");

      if (result.success) {
        setVehicles(result.data);
      } else {
        setError(result.message || "Failed to fetch vehicles");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const result = await apiCall("/drivers/manage.php");
      if (result.success) {
        setDrivers(result.data.filter((driver) => driver.status === "active"));
      }
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const endpoint = editingVehicle
        ? `/vehicles/manage.php?id=${editingVehicle.id}`
        : `/vehicles/manage.php`;

      const method = editingVehicle ? "PUT" : "POST";

      const result = await apiCall(endpoint, {
        method,
        body: JSON.stringify(formData),
      });

      if (result.success) {
        setSuccess(result.message || "Operation completed successfully");
        setShowForm(false);
        setEditingVehicle(null);
        resetForm();
        fetchVehicles();
      } else {
        setError(result.message || "Operation failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      registration: vehicle.registration,
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      color: vehicle.color || "",
      description: vehicle.description || "",
      default_driver_id: vehicle.default_driver_id || "",
      status: vehicle.status,
    });
    setShowForm(true);

    // Scroll ไปที่ฟอร์ม
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDelete = async (vehicleId) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const result = await apiCall(`/vehicles/manage.php?id=${vehicleId}`, {
        method: "DELETE",
      });

      if (result.success) {
        setSuccess("Vehicle deleted successfully");
        fetchVehicles();
      } else {
        setError(result.message || "Failed to delete vehicle");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      registration: "",
      brand: "",
      model: "",
      color: "",
      description: "",
      default_driver_id: "",
      status: "active",
    });
    setEditingVehicle(null);
    setShowForm(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Vehicle Management
          </h1>
          <p className="text-gray-600 mt-1">จัดการข้อมูลรถทั้งหมด</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setTimeout(() => {
              formRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }, 100);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
        >
          <i className="fas fa-plus"></i>
          Add Vehicle
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div
          ref={formRef}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingVehicle ? "แก้ไขข้อมูลรถ" : "เพิ่มรถใหม่"}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ทะเบียนรถ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="กข-1234 หรือ ABC-123"
                  value={formData.registration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      registration: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ยี่ห้อ
                </label>
                <input
                  type="text"
                  placeholder="Toyota, Honda, Isuzu..."
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รุ่น
                </label>
                <input
                  type="text"
                  placeholder="Vios, Civic, D-Max..."
                  value={formData.model}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  สี
                </label>
                <input
                  type="text"
                  placeholder="ขาว, เงิน, ดำ..."
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  คนขับประจำ
                </label>
                <select
                  value={formData.default_driver_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_driver_id: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">ไม่กำหนด</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.phone_number})
                    </option>
                  ))}
                </select>
              </div>

              {editingVehicle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    สถานะ
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">ใช้งานอยู่</option>
                    <option value="maintenance">ซ่อมบำรุง</option>
                    <option value="inactive">ไม่ใช้งาน</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                คำอธิบายเพิ่มเติม
              </label>
              <textarea
                rows="3"
                placeholder="รายละเอียดเพิ่มเติม เช่น จำนวนที่นั่ง, อุปกรณ์พิเศษ..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 justify-between items-center">
              {/* ปุ่มซ้าย: Save & Cancel */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${getCompanyClass(
                    "primary"
                  )} ${getCompanyClass("primaryHover")}`}
                >
                  {editingVehicle ? "บันทึกการแก้ไข" : "เพิ่มรถ"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
              </div>

              {/* ปุ่มขวา: Delete (แสดงเฉพาะตอน Edit) */}
              {editingVehicle && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingVehicle.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-trash"></i>
                  ลบรถ
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Vehicles Grid */}
      <div>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-spinner animate-spin text-2xl text-gray-400"></i>
            </div>
            <p className="text-gray-500 font-medium">Loading vehicles...</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-car text-2xl text-gray-400"></i>
            </div>
            <p className="text-gray-500 font-medium">No vehicles found</p>
            <p className="text-sm text-gray-400 mt-1">
              Add your first vehicle to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
              >
                {/* Header: Avatar + Name + Status + Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                      <i className="fas fa-car text-white text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {vehicle.registration}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            vehicle.status === "active"
                              ? "bg-green-100 text-green-800"
                              : vehicle.status === "maintenance"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              vehicle.status === "active"
                                ? "bg-green-500"
                                : vehicle.status === "maintenance"
                                ? "bg-yellow-400"
                                : "bg-gray-400"
                            }`}
                          />
                          {vehicle.status === "active"
                            ? "ใช้งานอยู่"
                            : vehicle.status === "maintenance"
                            ? "ซ่อมบำรุง"
                            : "ไม่ใช้งาน"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {[vehicle.brand, vehicle.model]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="p-2 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                      title="Edit"
                    >
                      <i className="fas fa-edit text-sm" />
                    </button>
                  </div>
                </div>

                {/* Body: compact chips row */}
                <div className="mt-3 space-y-2">
                  {vehicle.color && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-gray-700 text-[12px]">
                      <i className="fas fa-palette text-[12px]" />
                      {vehicle.color}
                    </span>
                  )}

                  {vehicle.default_driver_name && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-gray-700 text-[12px]">
                      <i className="fas fa-user text-[12px]" />
                      {vehicle.default_driver_name}
                      {vehicle.default_driver_phone && (
                        <span className="text-gray-500 ml-1">
                          ({vehicle.default_driver_phone})
                        </span>
                      )}
                    </span>
                  )}

                  {vehicle.description && (
                    <p className="text-xs text-gray-500">
                      {vehicle.description}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-gray-500">
                      Added {formatDate(vehicle.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VehicleManagementPage;
