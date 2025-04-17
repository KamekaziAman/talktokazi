// Real implementation of encryption using Web Crypto API

// Helper to check if we're in a browser environment
const isBrowser = typeof window !== "undefined" && window.crypto && window.crypto.subtle;

/**
 * Generate a key pair for asymmetric encryption
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    return window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );
  } catch (error) {
    console.error("Error generating key pair:", error);
    throw new Error("Failed to generate encryption keys: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Export public key to string format for storage
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error("Error exporting public key:", error);
    throw new Error("Failed to export public key: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Export private key to string format for storage
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error("Error exporting private key:", error);
    throw new Error("Failed to export private key: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Import public key from string format
 */
export async function importPublicKey(publicKeyString: string): Promise<CryptoKey> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    const keyData = base64ToArrayBuffer(publicKeyString);
    return window.crypto.subtle.importKey(
      "spki",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"],
    );
  } catch (error) {
    console.error("Error importing public key:", error);
    throw new Error("Failed to import public key: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Import private key from string format
 */
export async function importPrivateKey(privateKeyString: string): Promise<CryptoKey> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    const keyData = base64ToArrayBuffer(privateKeyString);
    return window.crypto.subtle.importKey(
      "pkcs8",
      keyData,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"],
    );
  } catch (error) {
    console.error("Error importing private key:", error);
    throw new Error("Failed to import private key: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Generate a symmetric key for AES-GCM encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    return window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    );
  } catch (error) {
    console.error("Error generating AES key:", error);
    throw new Error("Failed to generate AES key: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Export AES key to string format
 */
export async function exportAESKey(key: CryptoKey): Promise<string> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return arrayBufferToBase64(exported);
  } catch (error) {
    console.error("Error exporting AES key:", error);
    throw new Error("Failed to export AES key: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Import AES key from string format
 */
export async function importAESKey(keyString: string): Promise<CryptoKey> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    const keyData = base64ToArrayBuffer(keyString);
    return window.crypto.subtle.importKey(
      "raw",
      keyData,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    );
  } catch (error) {
    console.error("Error importing AES key:", error);
    throw new Error("Failed to import AES key: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Encrypt a message using AES-GCM
 */
export async function encryptMessage(
  message: string,
  recipientPublicKey: CryptoKey,
): Promise<{
  encryptedMessage: string
  encryptedSymmetricKey: string
  iv: string
}> {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  try {
    // Generate a random symmetric key for this message
    const symmetricKey = await generateAESKey();

    // Generate a random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the message with the symmetric key
    const encodedMessage = new TextEncoder().encode(message);
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      symmetricKey,
      encodedMessage,
    );

    // Export the symmetric key
    const exportedSymmetricKey = await exportAESKey(symmetricKey);

    // Encrypt the symmetric key with the recipient's public key
    const encryptedSymmetricKey = await encryptWithPublicKey(exportedSymmetricKey, recipientPublicKey);

    return {
      encryptedMessage: arrayBufferToBase64(encryptedData),
      encryptedSymmetricKey,
      iv: arrayBufferToBase64(iv),
    };
  } catch (error) {
    console.error("Error encrypting message:", error);
    throw new Error("Failed to encrypt message: " + (error instanceof Error ? error.message : "Unknown error"));
  }
}

/**
 * Decrypt a message using AES-GCM
 */
export async function decryptMessage(
  encryptedMessage: string,
  encryptedSymmetricKey: string,
  iv: string,
  privateKey: CryptoKey,
): Promise<string> {
  // Decrypt the symmetric key with the private key
  const symmetricKeyString = await decryptWithPrivateKey(encryptedSymmetricKey, privateKey)

  // Import the symmetric key
  const symmetricKey = await importAESKey(symmetricKeyString)

  // Decrypt the message
  const encryptedData = base64ToArrayBuffer(encryptedMessage)
  const ivData = base64ToArrayBuffer(iv)

  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivData,
    },
    symmetricKey,
    encryptedData,
  )

  return new TextDecoder().decode(decryptedData)
}

/**
 * Encrypt data with a public key
 */
async function encryptWithPublicKey(data: string, publicKey: CryptoKey): Promise<string> {
  const encodedData = new TextEncoder().encode(data)
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    encodedData,
  )

  return arrayBufferToBase64(encryptedData)
}

/**
 * Decrypt data with a private key
 */
async function decryptWithPrivateKey(encryptedData: string, privateKey: CryptoKey): Promise<string> {
  const data = base64ToArrayBuffer(encryptedData)
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    data,
  )

  return new TextDecoder().decode(decryptedData)
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  // Create a Uint8Array from the ArrayBuffer
  const bytes = new Uint8Array(buffer);
  
  // Convert the Uint8Array to a binary string
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  // Use the browser's btoa function to convert the binary string to base64
  return window.btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (!isBrowser) {
    throw new Error("Crypto operations can only be performed in a browser environment");
  }
  
  // Use the browser's atob function to convert base64 to binary string
  const binaryString = window.atob(base64);
  
  // Create a Uint8Array from the binary string
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}
