import CryptoJS from 'crypto-js';

// Shared secret key (in production, use secure key exchange or backend-managed keys)
const SECRET_KEY = 'your-secret-key-12345'; // Replace with a secure key

// Encrypt message
export const encryptMessage = (message) => {
  try {
    if (!message || typeof message !== 'string') {
      return message;
    }
    return CryptoJS.AES.encrypt(message, SECRET_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return message; // Fallback to plaintext if encryption fails
  }
};

// Decrypt message
export const decryptMessage = (encryptedContent) => {
  try {
    if (!encryptedContent || typeof encryptedContent !== 'string') {
      return encryptedContent;
    }
    const bytes = CryptoJS.AES.decrypt(encryptedContent, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails (e.g., invalid ciphertext), return original
    return decrypted || encryptedContent;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedContent; // Fallback to original if decryption fails
  }
};