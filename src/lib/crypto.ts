const ALGO = 'AES-GCM';

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(text: string, passphrase: string): Promise<{ encryptedText: string; iv: string; salt: string }> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(text));
  return {
    encryptedText: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

export async function decryptMessage(encryptedText: string, iv: string, salt: string, passphrase: string): Promise<string> {
  const toUint8 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const key = await deriveKey(passphrase, toUint8(salt));
  const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv: toUint8(iv) }, key, toUint8(encryptedText));
  return new TextDecoder().decode(decrypted);
}
