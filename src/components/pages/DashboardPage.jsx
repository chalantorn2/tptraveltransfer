// src/components/pages/DashboardPage.jsx - Clean UI with Font Awesome
import { getCompanyClass } from "../../config/company";

function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">ภาพรวมงานทั้งหมดและสถิติประจำวัน</p>
        </div>
        <button
          className={`${getCompanyClass("primary")} ${getCompanyClass(
            "primaryHover"
          )} text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2`}
        >
          <i className="fas fa-sync-alt text-sm"></i>
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "งานวันนี้",
            count: "12",
            change: "+2.5%",
            changeType: "increase",
            icon: "fas fa-plus-circle",
            color: "blue",
          },
          {
            title: "กำลังดำเนินการ",
            count: "8",
            change: "+12%",
            changeType: "increase",
            icon: "fas fa-spinner",
            color: "yellow",
          },
          {
            title: "เสร็จแล้ว",
            count: "24",
            change: "+8.2%",
            changeType: "increase",
            icon: "fas fa-check-circle",
            color: "green",
          },
          {
            title: "ยกเลิก",
            count: "2",
            change: "-1.4%",
            changeType: "decrease",
            icon: "fas fa-times-circle",
            color: "red",
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
                  <span
                    className={`text-xs font-medium ${
                      stat.changeType === "increase"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    จากเมื่อวาน
                  </span>
                </div>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  stat.color === "blue"
                    ? "bg-blue-50"
                    : stat.color === "yellow"
                    ? "bg-yellow-50"
                    : stat.color === "green"
                    ? "bg-green-50"
                    : "bg-red-50"
                }`}
              >
                <i
                  className={`${stat.icon} text-lg ${
                    stat.color === "blue"
                      ? "text-blue-600"
                      : stat.color === "yellow"
                      ? "text-yellow-600"
                      : stat.color === "green"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                ></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fas fa-list-ul text-gray-400"></i>
              <h2 className="text-lg font-semibold text-gray-900">
                งานล่าสุดจาก Holiday Taxis
              </h2>
            </div>
            <span className="text-sm text-gray-500">
              อัปเดตล่าสุด: {new Date().toLocaleTimeString("th-TH")}
            </span>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-inbox text-2xl text-gray-400"></i>
            </div>
            <p className="text-gray-500 font-medium">ไม่มีงานใหม่ในขณะนี้</p>
            <p className="text-sm text-gray-400 mt-1">
              รอการเชื่อมต่อ Holiday Taxis API...
            </p>
            <button className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <i className="fas fa-sync-alt mr-1"></i>
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <i className="fas fa-plus text-blue-600"></i>
            </div>
            <h3 className="font-semibold text-gray-900">เพิ่มงานใหม่</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            สร้างงานใหม่หรือ import จาก Holiday Taxis
          </p>
          <button
            className={`w-full ${getCompanyClass(
              "primary"
            )} text-white py-2 px-4 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity`}
          >
            เริ่มต้น
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <i className="fas fa-user-plus text-green-600"></i>
            </div>
            <h3 className="font-semibold text-gray-900">เพิ่มคนขับ</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            จัดการข้อมูลคนขับใหม่ในระบบ
          </p>
          <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors">
            จัดการ
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <i className="fas fa-chart-line text-purple-600"></i>
            </div>
            <h3 className="font-semibold text-gray-900">ดูรายงาน</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            สถิติและรายงานประสิทธิภาพ
          </p>
          <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors">
            ดูรายงาน
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
