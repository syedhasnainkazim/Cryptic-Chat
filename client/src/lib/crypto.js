import CryptoJS from 'crypto-js';

// Derive a room-specific AES key from both user IDs (deterministic)
export const deriveKey = (id1, id2) => {
  const sorted = [id1, id2].sort().join(':');
  return CryptoJS.SHA256(sorted).toString();
};

// For groups: key is the conversation ID + a shared secret known to all members
export const deriveGroupKey = (conversationId) => {
  return CryptoJS.SHA256(`group:${conversationId}:crypticchat`).toString();
};

export const encrypt = (text, key) => {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, CryptoJS.enc.Hex.parse(key), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return {
    encryptedContent: encrypted.toString(),
    iv: iv.toString(CryptoJS.enc.Hex),
  };
};

export const decrypt = (encryptedContent, iv, key) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, CryptoJS.enc.Hex.parse(key), {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return '[encrypted message]';
  }
};
