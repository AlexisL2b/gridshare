export type UserType = "HOST" | "CLIENT";
export type OfferStatus = "ACTIVE" | "INACTIVE" | "FULL";
export type ContractStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TransactionType = "STORE" | "RESTORE";

export interface User {
  id: string;
  email: string;
  name: string;
  type: UserType;
  estimatedProduction: number;
  createdAt: string;
  updatedAt: string;
}

export interface Battery {
  id: string;
  userId: string;
  capacityKwh: number;
  availableKwh: number;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorageOffer {
  id: string;
  hostId: string;
  batteryId: string;
  capacityKwh: number;
  remainingKwh: number;
  pricePerKwh: number;
  status: OfferStatus;
  host?: User;
  createdAt: string;
  updatedAt: string;
}

export interface StorageContract {
  id: string;
  offerId: string;
  clientId: string;
  allocatedKwh: number;
  usedKwh: number;
  pricePerKwh: number;
  status: ContractStatus;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnergyTransaction {
  id: string;
  contractId: string;
  type: TransactionType;
  amountKwh: number;
  pricePerKwh: number;
  totalCost: number;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
