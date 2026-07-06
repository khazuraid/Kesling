export function toRoman(num: number): string {
  if (num <= 0) return "";
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let r = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      r += syms[i];
      num -= vals[i];
    }
  }
  return r;
}
