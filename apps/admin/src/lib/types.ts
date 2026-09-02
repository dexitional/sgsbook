export interface ContactPerson {
  id: string;
  clientId: string;
  name: string;
  phone: string | null;
  email: string | null;
  designation: string | null;
  isPrimary: boolean;
  status: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  location: string | null;
  organisation: string | null;
  imageUrl: string | null;
  type: "INTERNAL" | "EXTERNAL";
  status: boolean;
  createdAt: string;
  contacts: ContactPerson[];
  _count?: { UbsRequest: number };
}

export type ItemType = "FACILITY" | "ADDON";

export interface Item {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  amount: number | null;
  intamount: number | null;
  extamount: number | null;
  itemType: ItemType;
  status: boolean;
  createdAt: string;
}

export type RequestStatus = "PENDED" | "REJECTED" | "APPROVED" | "COMPLETED";

export interface PackageAddon {
  id: string;
  itemId: string;
  packageId: string;
  item: Item;
}

export interface RequestPackage {
  id: string;
  itemId: string;
  bookStart: string | null;
  bookEnd: string | null;
  bookItem: Item;
  UbsAddon: PackageAddon[];
}

export interface BookingRequest {
  id: string;
  clientId: string | null;
  title: string;
  description: string | null;
  status: RequestStatus;
  chargeAmount: number | null;
  createdAt: string;
  client: Client | null;
  packages: RequestPackage[];
}

export interface Payment {
  id: string;
  requestId: string | null;
  description: string | null;
  paidName: string | null;
  paidRef: string | null;
  paidAmount: number | null;
  paidAt: string;
  request: BookingRequest | null;
}

export interface Role {
  id: number;
  title: string;
  description: string;
  status: boolean;
}

export interface UserAccount {
  id: number;
  tag: string;
  username: string;
  name: string | null;
  locked: boolean;
  status: boolean;
  createdAt: string;
  roles: { id: number; title: string }[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
