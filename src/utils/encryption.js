// Simple decryption utility
export const decryptMessage = (encryptedContent) => {
  try {
    // If it's already decrypted text, return as is
    if (typeof encryptedContent !== 'string' || !encryptedContent.includes(':')) {
      return encryptedContent;
    }
    
    // Simple base64 decode (replace with actual decryption logic)
    return atob(encryptedContent);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedContent; // Return original if decryption fails
  }
};