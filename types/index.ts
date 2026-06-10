export type Role = 'admin' | 'user';
export type ViewMode = 'admin' | 'user';

export type GemStatus = 'IN_STOCK' | 'WITH_VENDOR' | 'SOLD' | 'RETURNED';

export type CustodyAction =
  | 'CREATED'
  | 'ASSIGNED'
  | 'RETURNED'
  | 'SOLD'
  | 'REASSIGNED'
  | 'UPDATED';

export interface Vendor {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StoneType {
  id: number;
  name: string;
}

export interface Shape {
  id: number;
  name: string;
}

export interface Gem {
  id: number;
  code: string;
  qr_token: string;
  stone_type_id: number;
  stone_type_name: string;
  weight: string;          // DECIMAL returned as string from mysql2
  shape_id: number;
  shape_name: string;
  purchasing_price: string;
  bought_from_vendor_id: number;
  bought_from_vendor_name: string;
  current_vendor_id: number | null;
  current_vendor_name: string | null;
  asking_price: string | null;
  status: GemStatus;
  sold_price: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustodyLog {
  id: number;
  gem_id: number;
  action: CustodyAction;
  from_vendor_id: number | null;
  from_vendor_name: string | null;
  to_vendor_id: number | null;
  to_vendor_name: string | null;
  asking_price: string | null;
  sold_price: string | null;
  note: string | null;
  actor_phone: string | null;
  created_at: string;
}

export interface SessionData {
  phone: string;
  role: Role;
}
