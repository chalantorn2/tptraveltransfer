// src/components/layout/MainLayout.jsx - Clean UI with Font Awesome
import { COMPANY_NAME, getCompanyClass } from "../../config/company";

const MENU_ITEMS = [
  { id: "dashboard", name: "Dashboard", icon: "fas fa-chart-line" },
  { id: "jobs", name: "Booking Management", icon: "fas fa-tasks" }, // ← เปลี่ยนแล้ว
  { id: "drivers", name: "Driver Management", icon: "fas fa-car-side" },
  { id: "freelance", name: "Freelance Jobs", icon: "fas fa-car" },
  { id: "booking", name: "Booking Overview", icon: "fas fa-calendar-days" },
  { id: "usermanagement", name: "User Management", icon: "fas fas fa-users" },
];

function MainLayout({ currentPage, setCurrentPage, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`${getCompanyClass("primary")} text-white shadow-sm`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <img
                src="/logo.png"
                alt={`${COMPANY_NAME} Logo`}
                className="h-12 w-auto"
              />
              <div className="border-l border-white/20 pl-4">
                <h1 className="text-lg font-medium">{COMPANY_NAME}</h1>
                <p className="text-xs text-white/80">Staff Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-xs text-white/70">Administrator</p>
              </div>
              <button className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">
                <i className="fas fa-sign-out-alt text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
          <div className="p-6">
            <ul className="space-y-1">
              {MENU_ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center cursor-pointer px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      currentPage === item.id
                        ? `${getCompanyClass("primary")} text-white shadow-sm`
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <i
                      className={`${item.icon} w-5 text-center mr-3 ${
                        currentPage === item.id ? "text-white" : "text-gray-400"
                      }`}
                    ></i>
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 w-full p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 ${getCompanyClass(
                  "primary"
                )} rounded-full flex items-center justify-center`}
              >
                <i className="fas fa-user text-white text-xs"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  Admin
                </p>
                <p className="text-xs text-gray-500 truncate">Online</p>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
