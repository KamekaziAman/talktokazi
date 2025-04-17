export interface User {
  id: string
  username: string
  name: string
  password?: string
  lastActive: string
  publicKey?: string
  isAdmin?: boolean
}

export interface Message {
  id: string
  content: string
  sender: string // "user" or "admin"
  timestamp: string
  isEncrypted: boolean
  encryptedSymmetricKey?: string
  iv?: string
  isRead?: boolean
  type: "text" | "image" | "gif"
  mediaUrl?: string
}

export interface EncryptedMessage {
  encryptedMessage: string
  encryptedSymmetricKey: string
  iv: string
}
