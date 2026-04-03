import * as React from "react";
import { 
  Shield, 
  Lock, 
  UserCheck, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Save,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Users,
  Package,
  ShoppingCart,
  Warehouse,
  BarChart3,
  UserCircle,
  Loader2
} from "lucide-react";
import { cn } from "../lib/utils";
import { db } from "../firebase";
import { collection, doc, getDocs, setDoc, onSnapshot } from "firebase/firestore";

type Permission = {
  id: string;
  name: string;
  checked: boolean;
};

type PermissionGroup = {
  id: string;
  name: string;
  icon: any;
  permissions: Permission[];
};

type Role = {
  id: string;
  name: string;
  description: string;
  isActive?: boolean;
  groups: PermissionGroup[];
};

const initialRoles: Role[] = [
  { 
    id: "manager", 
    name: "Manager", 
    description: "Oversees daily operations, staff performance, and inventory reconciliation.",
    isActive: true,
    groups: [
      {
        id: "products",
        name: "PRODUCTS",
        icon: Package,
        permissions: [
          { id: "view_catalog", name: "View Catalog", checked: true },
          { id: "create_item", name: "Create New Item", checked: true },
          { id: "edit_pricing", name: "Edit Pricing", checked: true },
          { id: "delete_products", name: "Delete Products", checked: false },
          { id: "export_database", name: "Export Database", checked: true },
        ]
      },
      {
        id: "customers",
        name: "CUSTOMERS",
        icon: UserCircle,
        permissions: [
          { id: "view_profiles", name: "View Profiles", checked: true },
          { id: "loyalty_override", name: "Loyalty Points Override", checked: true },
          { id: "edit_contact", name: "Edit Contact Info", checked: true },
        ]
      },
      {
        id: "orders",
        name: "ORDERS",
        icon: ShoppingCart,
        permissions: [
          { id: "view_history", name: "View Order History", checked: true },
          { id: "process_sales", name: "Process Sales", checked: true },
          { id: "modify_orders", name: "Modify Orders", checked: true },
          { id: "cancel_transaction", name: "Cancel Transaction", checked: true },
        ]
      },
      {
        id: "staff",
        name: "STAFF & HR",
        icon: Users,
        permissions: [
          { id: "view_directory", name: "View Staff Directory", checked: true },
          { id: "edit_scheduling", name: "Edit Scheduling", checked: true },
          { id: "approve_payroll", name: "Approve Payroll", checked: false },
        ]
      },
      {
        id: "reporting",
        name: "REPORTING",
        icon: BarChart3,
        permissions: [
          { id: "end_day_reports", name: "End of Day Reports", checked: true },
          { id: "advanced_analytics", name: "Advanced Analytics", checked: false },
        ]
      }
    ]
  },
  { 
    id: "admin", 
    name: "Administrator", 
    description: "Full system access, configuration, and security management.",
    groups: []
  },
  { 
    id: "sales", 
    name: "Sales Associate", 
    description: "Terminal operations, customer checkouts, and simple returns.",
    groups: []
  },
  { 
    id: "warehouse", 
    name: "Warehouse Staff", 
    description: "Receiving, stock movements, and logistics tracking.",
    groups: []
  },
  { 
    id: "accounting", 
    name: "Accounting", 
    description: "Financial reports, payroll processing, and audit preparation.",
    groups: []
  },
];

export function Settings() {
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>("manager");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "roles"), (snapshot) => {
      const rolesData = snapshot.docs.map(doc => doc.data() as Role);
      if (rolesData.length === 0) {
        // Initialize with defaults if empty
        initializeRoles();
      } else {
        setRoles(rolesData);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const initializeRoles = async () => {
    setIsLoading(true);
    try {
      for (const role of initialRoles) {
        await setDoc(doc(db, "roles", role.id), role);
      }
    } catch (error) {
      console.error("Error initializing roles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const role of roles) {
        await setDoc(doc(db, "roles", role.id), role);
      }
      alert("Đã lưu thay đổi thành công!");
    } catch (error) {
      console.error("Error saving roles:", error);
      alert("Lỗi khi lưu thay đổi. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFF5F5] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
      </div>
    );
  }

  const togglePermission = (groupId: string, permissionId: string) => {
    setRoles(roles.map(role => {
      if (role.id === selectedRoleId) {
        return {
          ...role,
          groups: role.groups.map(group => {
            if (group.id === groupId) {
              return {
                ...group,
                permissions: group.permissions.map(p => 
                  p.id === permissionId ? { ...p, checked: !p.checked } : p
                )
              };
            }
            return group;
          })
        };
      }
      return role;
    }));
  };

  return (
    <div className="min-h-screen bg-[#FFF5F5] -m-8 p-8">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-12">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Permissions Engine</h1>
          <nav className="flex items-center gap-8">
            <button className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">Modules</button>
            <button className="text-sm font-bold text-red-600 border-b-2 border-red-600 pb-1">Users</button>
            <button className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">Audit Logs</button>
          </nav>
        </div>
        
        <div className="flex items-center gap-6">
          <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors relative">
            <Shield className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#FFF5F5]"></span>
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-red-600 text-white rounded-xl text-sm font-black hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
            <img src="https://i.pravatar.cc/150?u=admin" alt="Admin" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: System Roles */}
        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Roles</h2>
            <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase tracking-widest">5 Active</span>
          </div>

          <div className="space-y-4">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  "w-full p-8 rounded-[32px] text-left transition-all relative group",
                  selectedRoleId === role.id 
                    ? "bg-white shadow-2xl shadow-red-200/50 border-l-4 border-red-600" 
                    : "bg-white/50 hover:bg-white border-l-4 border-transparent"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={cn(
                    "text-xl font-black tracking-tight",
                    selectedRoleId === role.id ? "text-red-600" : "text-slate-900"
                  )}>{role.name}</span>
                  {selectedRoleId === role.id && (
                    <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  {role.description}
                </p>
              </button>
            ))}
          </div>

          <button className="w-full py-4 bg-red-600 text-white rounded-xl text-sm font-black hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Role
          </button>
        </div>

        {/* Right Column: Permissions */}
        <div className="lg:col-span-8 bg-white/50 rounded-[48px] p-12">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{selectedRole.name} Permissions</h2>
              <p className="text-slate-500 font-medium">Configure module-level access for the {selectedRole.name} role.</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  const original = roles.find(r => r.id === selectedRoleId);
                  if (original) {
                    // Reset logic could go here if we kept a copy
                  }
                }}
                className="px-6 py-3 text-sm font-black text-slate-900 hover:bg-white rounded-xl transition-all"
              >
                Discard Changes
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-10 py-4 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {selectedRole.groups.length > 0 ? (
              selectedRole.groups.map((group) => (
                <div key={group.id} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-8">
                    <group.icon className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">{group.name}</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {group.permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center justify-between group/item">
                        <span className="text-sm font-bold text-slate-600 group-hover/item:text-slate-900 transition-colors">{permission.name}</span>
                        <button 
                          onClick={() => togglePermission(group.id, permission.id)}
                          className={cn(
                            "w-6 h-6 rounded-md border-2 transition-all flex items-center justify-center",
                            permission.checked 
                              ? "bg-red-600 border-red-600 text-white" 
                              : "border-slate-200 hover:border-red-300"
                          )}
                        >
                          {permission.checked && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-20 text-center">
                <Shield className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">No permissions configured for this role yet.</p>
                <button className="mt-4 text-red-600 font-black uppercase tracking-widest text-xs hover:underline">Initialize Permissions</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
