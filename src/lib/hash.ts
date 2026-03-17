export function canonicalizeJson(value: unknown): string {
  const sortObject = (v: any): any => {
    if (Array.isArray(v)) return v.map(sortObject);
    if (v && typeof v === "object") {
      const out: Record<string, any> = {};
      Object.keys(v).sort().forEach((k) => (out[k] = sortObject(v[k])));
      return out;
    }
    return v;
  };
  return JSON.stringify(sortObject(value));
}

export async function sha256Hex(input: string): Promise<string> {
  // Browser crypto
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback (non-cryptographic) – only for dev environments without WebCrypto
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ("fnv1a_" + (h >>> 0).toString(16)).padStart(8, "0");
}

export function shortHash(hex: string): string {
  if (!hex) return "";
  return hex.length <= 12 ? hex : `${hex.slice(0, 6)}…${hex.slice(-6)}`;
}
