// src/components/pages/DriverManagementPage.jsx
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

function DriverManagementPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "+66",
    preferred_contact_method: "VOICE",
    contact_methods: [],
    license_number: "",
    username: "",
    password: "",
    confirmPassword: "",
    status: "active",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef(null);
  const [showAccountInfo, setShowAccountInfo] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const result = await apiCall("/drivers/manage.php");

      if (result.success) {
        setDrivers(result.data);
      } else {
        setError(result.message || "Failed to fetch drivers");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate password only if it's provided
    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
    }

    try {
      const endpoint = editingDriver
        ? `/drivers/manage.php?id=${editingDriver.id}`
        : `/drivers/manage.php`;

      const method = editingDriver ? "PUT" : "POST";

      // Prepare data
      const submitData = { ...formData };
      delete submitData.confirmPassword; // ไม่ส่ง confirmPassword ไป API

      // Don't send username if empty
      if (!submitData.username) {
        delete submitData.username;
      }

      // Don't send password if empty
      if (!submitData.password) {
        delete submitData.password;
      }

      const result = await apiCall(endpoint, {
        method,
        body: JSON.stringify(submitData),
      });

      if (result.success) {
        setSuccess(result.message || "Operation completed successfully");
        setShowForm(false);
        setEditingDriver(null);
        resetForm();
        fetchDrivers();
      } else {
        setError(result.message || "Operation failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone_number: driver.phone_number,
      preferred_contact_method: driver.preferred_contact_method,
      contact_methods: driver.contact_methods || ["VOICE"],
      license_number: driver.license_number || "",
      username: driver.username || "",
      password: "", // เว้นว่างเสมอ
      confirmPassword: "", // เว้นว่างเสมอ
      status: driver.status,
    });
    setShowForm(true);
    // Auto-expand Account Info if driver has username
    setShowAccountInfo(!!driver.username);

    // Scroll ไปที่ฟอร์ม
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDelete = async (driverId) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      const result = await apiCall(`/drivers/manage.php?id=${driverId}`, {
        method: "DELETE",
      });

      if (result.success) {
        setSuccess("Driver deleted successfully");
        fetchDrivers();
      } else {
        setError(result.message || "Failed to delete driver");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone_number: "+66",
      preferred_contact_method: "VOICE",
      contact_methods: ["VOICE"],
      license_number: "",
      username: "",
      password: "",
      confirmPassword: "",
      status: "active",
    });
    setEditingDriver(null);
    setShowForm(false);
    setShowAccountInfo(false);
  };

  const handleContactMethodChange = (method, checked) => {
    if (checked) {
      const newMethods = [...formData.contact_methods, method];
      setFormData({
        ...formData,
        contact_methods: newMethods,
      });
    } else {
      // ไม่ให้ uncheck วิธีหลัก
      if (method === formData.preferred_contact_method) {
        return;
      }
      setFormData({
        ...formData,
        contact_methods: formData.contact_methods.filter((m) => m !== method),
      });
    }
  };

  const handlePreferredMethodChange = (method) => {
    // เพิ่มวิธีหลักเข้าไปใน contact_methods ถ้ายังไม่มี
    const newMethods = formData.contact_methods.includes(method)
      ? formData.contact_methods
      : [...formData.contact_methods, method];

    setFormData({
      ...formData,
      preferred_contact_method: method,
      contact_methods: newMethods,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const getContactMethodIcon = (method) => {
    const icons = {
      VOICE: "fas fa-phone",
      SMS: "fas fa-sms",
      WHATSAPP: "fab fa-whatsapp",
    };
    return icons[method] || "fas fa-phone";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Driver Management
          </h1>
          <p className="text-gray-600 mt-1">จัดการข้อมูลคนขับทั้งหมด</p>
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
          Add Driver
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
              {editingDriver ? "แก้ไขข้อมูลคนขับ" : "เพิ่มคนขับใหม่"}
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
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เบอร์มือถือ *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500 font-medium">
                    +66
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="812345678"
                    maxLength="9"
                    value={formData.phone_number.replace("+66", "")}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, ""); // เอาตัวเลขอย่างเดียว
                      if (value.length <= 9) {
                        setFormData({
                          ...formData,
                          phone_number: "+66" + value,
                        });
                      }
                    }}
                    className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  กรอกเฉพาะตัวเลข 9 หลัก (ไม่ต้องใส่ 0 หน้า)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เลขที่ใบขับขี่
                </label>
                <input
                  type="text"
                  value={formData.license_number}
                  onChange={(e) =>
                    setFormData({ ...formData, license_number: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {editingDriver && (
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
                    <option value="inactive">ไม่ใช้งาน</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* วิธีติดต่อหลัก */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  วิธีติดต่อหลัก
                  <span className="text-xs text-gray-500 block font-normal">
                    ลูกค้าจะเห็นช่องทางนี้ก่อน
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {["VOICE", "SMS", "WHATSAPP"].map((method) => (
                    <label
                      key={method}
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="preferred_method"
                        value={method}
                        checked={formData.preferred_contact_method === method}
                        onChange={(e) =>
                          handlePreferredMethodChange(e.target.value)
                        }
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <i
                        className={`${getContactMethodIcon(
                          method
                        )} text-gray-600`}
                      ></i>
                      <span className="text-sm font-medium text-gray-700">
                        {method === "VOICE"
                          ? "โทรเสียง"
                          : method === "SMS"
                          ? "SMS"
                          : "WhatsApp"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* วิธีติดต่อสำรอง */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  วิธีติดต่อสำรอง
                  <span className="text-xs text-gray-500 block font-normal">
                    ช่องทางเพิ่มเติมที่คนขับรับได้
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {["VOICE", "SMS", "WHATSAPP"].map((method) => {
                    const isPreferred =
                      method === formData.preferred_contact_method;
                    return (
                      <label
                        key={method}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer ${
                          isPreferred
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.contact_methods.includes(method)}
                          onChange={(e) =>
                            handleContactMethodChange(method, e.target.checked)
                          }
                          disabled={isPreferred}
                          className="text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <i
                          className={`${getContactMethodIcon(
                            method
                          )} text-gray-600`}
                        ></i>
                        <span
                          className={`text-sm ${
                            isPreferred
                              ? "font-medium text-blue-700"
                              : "text-gray-700"
                          }`}
                        >
                          {method === "VOICE"
                            ? "โทรเสียง"
                            : method === "SMS"
                            ? "SMS"
                            : "WhatsApp"}
                          {isPreferred && (
                            <span className="text-xs text-blue-600 block">
                              หลัก
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Account Information Section */}
            <div className="border-t border-gray-200 pt-6">
              <button
                type="button"
                onClick={() => setShowAccountInfo(!showAccountInfo)}
                className="flex items-center justify-between w-full text-left mb-4 hover:bg-gray-50 p-3 rounded-lg transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <i className="fas fa-key text-gray-400"></i>
                  Account Information (Optional)
                  <span className="text-xs font-normal text-gray-500">
                    - สำหรับกรณีที่ต้องการให้คนขับล็อกอินเข้าระบบ
                  </span>
                </h3>
                <i
                  className={`fas fa-chevron-${
                    showAccountInfo ? "up" : "down"
                  } text-gray-400`}
                ></i>
              </button>

              {showAccountInfo && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username (สำหรับล็อกอิน)
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password{" "}
                      {editingDriver && "(เว้นว่างหากไม่ต้องการเปลี่ยน)"}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
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
                  {editingDriver ? "บันทึกการแก้ไข" : "เพิ่มคนขับ"}
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
              {editingDriver && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingDriver.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-trash"></i>
                  ลบคนขับ
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Drivers Grid */}
      <div>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-spinner animate-spin text-2xl text-gray-400"></i>
            </div>
            <p className="text-gray-500 font-medium">Loading drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-car-side text-2xl text-gray-400"></i>
            </div>
            <p className="text-gray-500 font-medium">No drivers found</p>
            <p className="text-sm text-gray-400 mt-1">
              Add your first driver to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
              >
                {/* Header: Avatar + Name + Status + Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                      <i className="fas fa-user text-white text-sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {driver.name}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            driver.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                          title={
                            driver.status === "active" ? "Active" : "Inactive"
                          }
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              driver.status === "active"
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />
                          {driver.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {driver.phone_number}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(driver)}
                      className="p-2 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                      title="Edit"
                    >
                      <i className="fas fa-edit text-sm" />
                    </button>
                  </div>
                </div>

                {/* Body: compact chips row */}
                <div className="mt-3 space-y-2">
                  {/* Contact methods */}
                  {driver.contact_methods?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {driver.contact_methods.map((method) => {
                        const isPreferred =
                          method === driver.preferred_contact_method;
                        return (
                          <span
                            key={method}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[12px] font-medium ${
                              isPreferred
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                            title={isPreferred ? "Preferred" : "Secondary"}
                          >
                            <i
                              className={`${getContactMethodIcon(
                                method
                              )} text-[12px]`}
                            />
                            {method === "VOICE" ? "Voice" : method}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* License & Vehicle */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {driver.license_number && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-gray-700 text-[12px]">
                        <i className="fas fa-id-card text-[12px]" />
                        {driver.license_number}
                      </span>
                    )}
                    {driver.default_vehicle_registration && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-50 text-gray-700 text-[12px]">
                        <i className="fas fa-car-side text-[12px]" />
                        {driver.default_vehicle_registration}
                        {driver.default_vehicle_brand ||
                        driver.default_vehicle_model ? (
                          <span className="text-gray-500">
                            ({driver.default_vehicle_brand}{" "}
                            {driver.default_vehicle_model})
                          </span>
                        ) : null}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-gray-500">
                      Joined {formatDate(driver.created_at)}
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

export default DriverManagementPage;
