export type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: "active" | "inactive";
  joinDate: string;
  avatar?: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  status: "in_stock" | "out_of_stock" | "low_stock";
  image?: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  tier: "Silver" | "Gold" | "Platinum" | "Diamond";
  totalSpent: number;
  lastVisit: string;
  status: "active" | "inactive";
};

export type Order = {
  id: string;
  customerName: string;
  date: string;
  total: number;
  status: "pending" | "completed" | "cancelled" | "shipping";
  paymentMethod: string;
};

export type InventoryTransaction = {
  id: string;
  type: "import" | "export";
  date: string;
  warehouse: string;
  staff: string;
  totalItems: number;
  status: "completed" | "draft";
};
