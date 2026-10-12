export type OrderStatus =
  | "CHO_GAN"
  | "DA_GAN"
  | "DA_LAY_HANG"
  | "DANG_GIAO"
  | "HOAN_TAT"
  | "DA_HUY"
  | "CHUA_THANH_TOAN";

export interface AddressInfo {
  name: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  sender: AddressInfo;
  receiver: AddressInfo;
  packageType: string;
  packageWeightKg?: number;
  distanceKm: number;
  baseFee: number;
  surchargeFee: number;
  vipDiscountFee: number;
  totalFee: number;
  status: OrderStatus;
  statusText: string;
  createdAt: string;
  createdTimestamp: number;
  paid: boolean;
  paymentMethod?: "TIEN_MAT" | "VNPAY";
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehiclePlate: string;
    vehicleType: string;
  };
}

export interface QuoteBreakdown {
  distanceKm: number;
  baseFee: number;
  surchargeFee: number;
  vipDiscountFee: number;
  totalFee: number;
  estimatedMinutes: number;
}
