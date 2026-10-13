export type CustomerProfile = { name: string; phone: string; email: string };
export type CustomerAddress = { id: string; label: string; recipient: string; phone: string; detail: string; isDefault: boolean };

export const CUSTOMER_STORAGE_KEY = "mini-ong-vang-customer-profile-demo-v1";
export const INITIAL_CUSTOMER_PROFILE: CustomerProfile = {
  name: "Nguyễn Thu Hà", phone: "0900000001", email: "thuha.nguyen@example.com",
};
export const INITIAL_CUSTOMER_ADDRESSES: CustomerAddress[] = [{
  id: "home", label: "Nhà riêng", recipient: "Nguyễn Thu Hà", phone: "0900000001",
  detail: "123 Nguyễn Văn Linh, Phường Tân Phú, Quận 7, TP.HCM", isDefault: true,
}];

export function readCustomerDemo(): { profile: CustomerProfile; addresses: CustomerAddress[] } {
  if (typeof window === "undefined") return { profile: INITIAL_CUSTOMER_PROFILE, addresses: INITIAL_CUSTOMER_ADDRESSES };
  try {
    const raw = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null && "profile" in parsed && "addresses" in parsed) {
        const data = parsed as { profile: CustomerProfile; addresses: CustomerAddress[] };
        if (typeof data.profile?.name === "string" && typeof data.profile?.phone === "string" &&
          typeof data.profile?.email === "string" && Array.isArray(data.addresses)) return data;
      }
    }
  } catch { /* Invalid demo data falls back to the sample. */ }
  return { profile: INITIAL_CUSTOMER_PROFILE, addresses: INITIAL_CUSTOMER_ADDRESSES };
}
