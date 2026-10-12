export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, "");
  return /^0[3|5|7|8|9][0-9]{8}$/.test(cleaned);
}

export function getCancelRemainingSeconds(createdTimestamp: number): number {
  const elapsed = Math.floor((Date.now() - createdTimestamp) / 1000);
  const remaining = 300 - elapsed;
  return remaining > 0 ? remaining : 0;
}

export function formatSecondsToTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
