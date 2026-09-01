/**
 * 표기 변환은 전부 여기서만 한다.
 * DB 는 금액을 만원 단위 정수로, 면적을 ㎡ 실수로만 들고 있다.
 */

const PYEONG_PER_M2 = 3.3058;

/** 125000 → '12억 5,000' / 9500 → '9,500만' */
export function formatPrice(manwon: number): string {
  if (manwon < 10000) return `${manwon.toLocaleString()}만`;
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  return rest === 0 ? `${eok}억` : `${eok}억 ${rest.toLocaleString()}`;
}

/** 84.97 → '84.97㎡ (25.7평)' */
export function formatArea(m2: number): string {
  return `${m2.toFixed(2)}㎡ (${(m2 / PYEONG_PER_M2).toFixed(1)}평)`;
}

/** 4863.2 → '4,863' (만원/평) */
export function formatPpy(ppy: number): string {
  return Math.round(ppy).toLocaleString();
}

/** '2026-08-31' → '26.08.31' */
export function formatDate(isoDate: string): string {
  return isoDate.slice(2).replace(/-/g, ".");
}

/** -1 → 'B1' / 12 → '12층' */
export function formatFloor(floor: number): string {
  return floor < 0 ? `B${Math.abs(floor)}` : `${floor}층`;
}
