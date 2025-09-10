// utils/encryption.js
import CryptoJS from 'crypto-js';

export const generateRandomKey = () => {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
};

export const encryptMessage = (message, key) => {
  try {
    if (!message || typeof message !== 'string' || !key) {
      console.warn('Invalid input for encryption; returning original message.');
      return message;
    }
    return CryptoJS.AES.encrypt(message, key).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return message;
  }
};

export const decryptMessage = (encryptedContent, key) => {
  try {
    if (!encryptedContent || typeof encryptedContent !== 'string' || !key) {
      console.warn('Invalid input for decryption; returning original content.');
      return encryptedContent;
    }
    const bytes = CryptoJS.AES.decrypt(encryptedContent, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedContent;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedContent;
  }
};