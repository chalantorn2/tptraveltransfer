// src/components/pages/UserManagementPage.jsx
function UserManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            User Management
          </h1>
          <p className="text-gray-600 mt-1">จัดการข้อมูลผู้ใช้งาน</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-tools text-2xl text-gray-400"></i>
          </div>
          <p className="text-gray-600 font-medium">
            กำลังพัฒนา User Management
          </p>
          <p className="text-sm text-gray-400 mt-1">
            ฟีเจอร์นี้จะพร้อมใช้งานในเร็วๆ นี้
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserManagementPage;
