"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Paperclip } from "lucide-react"
import { getCurrentUser, logoutUser, updateLastActivity, checkInactivity, updateUserLastActive, saveMessage, getMessagesForUser } from "@/lib/auth"
import { encryptMessage, importPublicKey, importPrivateKey } from "@/lib/encryption"
import type { Message } from "@/lib/types"
import { formatMessageTime } from "@/lib/utils"
import EmojiPicker from "../components/EmojiPicker"
import SimpleGifPicker from "../components/SimpleGifPicker"
import ImageMessage from "../components/ImageMessage"

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [adminPublicKey, setAdminPublicKey] = useState<CryptoKey | null>(null)
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [isClient, setIsClient] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Function to check for new messages
  const checkForNewMessages = useCallback(() => {
    if (!isClient || !user) return;
    
    try {
      // Get latest messages from localStorage
      const latestMessages = getMessagesForUser(user.id);
      
      // Update messages if there's a change in count or content
      if (messages.length !== latestMessages.length || 
          JSON.stringify(messages) !== JSON.stringify(latestMessages)) {
        
        console.log("New messages detected, updating state");
        setMessages(latestMessages);
      }
    } catch (error) {
      console.error("Error checking for new messages:", error);
    }
  }, [isClient, user, messages]);
  
  // Set up interval to check for new messages every 0.5 seconds
  useEffect(() => {
    if (!isClient) return;
    
    const messagesInterval = setInterval(() => {
      checkForNewMessages();
    }, 500); // 0.5 seconds
    
    return () => clearInterval(messagesInterval);
  }, [isClient, checkForNewMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isClient) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isClient])

  // Check for inactivity
  useEffect(() => {
    if (!isClient) return;
    
    const checkActivity = () => {
      if (checkInactivity()) {
        logoutUser().then(() => router.push("/login"))
      }
    }

    // Check activity every 30 seconds
    const activityInterval = setInterval(checkActivity, 30000)

    // Update activity on user interaction
    const handleUserActivity = () => {
      updateLastActivity()
    }

    // Add event listeners for user activity
    window.addEventListener("mousemove", handleUserActivity)
    window.addEventListener("keydown", handleUserActivity)
    window.addEventListener("click", handleUserActivity)
    window.addEventListener("touchstart", handleUserActivity)

    return () => {
      clearInterval(activityInterval)
      window.removeEventListener("mousemove", handleUserActivity)
      window.removeEventListener("keydown", handleUserActivity)
      window.removeEventListener("click", handleUserActivity)
      window.removeEventListener("touchstart", handleUserActivity)
    }
  }, [router, isClient])

  useEffect(() => {
    if (!isClient) return;
    
    const checkAuth = async () => {
      try {
        console.log("Checking authentication...")
        
        const currentUser = await getCurrentUser()
        console.log("Current user retrieved:", currentUser)
        
        if (!currentUser) {
          console.log("No current user found, redirecting to login")
          router.push("/login")
          return
        }

        // If user is admin, redirect to admin page
        if (currentUser.isAdmin) {
          console.log("User is admin, redirecting to admin page")
          router.push("/admin")
          return
        }

        console.log("Setting user:", currentUser)
        setUser(currentUser)
        updateUserLastActive(currentUser.id)

        // Load private key from localStorage
        const privateKeyString = localStorage.getItem("privateKey")
        console.log("Private key found in localStorage:", !!privateKeyString)
        
        if (!privateKeyString) {
          console.error("Private key not found")
          router.push("/login")
          return
        }

        try {
          // Import private key
          console.log("Importing private key...")
          const importedPrivateKey = await importPrivateKey(privateKeyString)
          console.log("Private key imported successfully")
          setPrivateKey(importedPrivateKey)

          // Mock admin public key (in a real app, this would be fetched from server)
          console.log("Importing admin public key...")
          // Using a sample RSA key - this would normally be fetched from a server
          const mockAdminPublicKeyString = 
            "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAstk92O/8ZF+4QNinB/k6JkXBGpBL9GVdQNq76QcQM2m8fAx0/ZAmAM6q2uNMsQOCHZVHy3SCTKxSOxTZLgVWUjHcKyRLDHKhuiSY72xC8H9AK1c4CuVwJf+caWWmGlAQwRvxnHY/lS32+8/2YhfMQbGHxwpFiXG2DnXo2qxnLzxt4QAnkCZnAyTgRMQJSuIDMxm4wkRJcyq6iDf1CmJyu7luYqNUO5dW4B9MtuxYQGiAwl1vGtZmLK90pUB+W84EcFLCkSJC7DS9Oa5CSxUO9L8+GKR8CwsZ4re6GjC0/p+xG1eP7JqYDLxvUOVWyFOPjoQp+UUqeLvVr8+5S6hmXwIDAQAB";
          const importedAdminPublicKey = await importPublicKey(mockAdminPublicKeyString)
          console.log("Admin public key imported successfully")
          setAdminPublicKey(importedAdminPublicKey)

          // Fetch messages from localStorage
          console.log("Getting messages for user:", currentUser.id)
          const userMessages = getMessagesForUser(currentUser.id)
          console.log(`Retrieved ${userMessages.length} messages for user`)
          setMessages(userMessages)
          
        } catch (importError) {
          console.error("Error during crypto operations:", importError)
          router.push("/login")
          return
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router, isClient])

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !user || !adminPublicKey) return

    setIsLoading(true)

    try {
      // Encrypt the message
      const encrypted = await encryptMessage(newMessage, adminPublicKey)

      // Create new message object
      const message: Message = {
        id: `user-message-${Date.now()}`,
        content: newMessage, // For display purposes, we'll show the unencrypted message
        sender: "user",
        timestamp: new Date().toISOString(),
        isEncrypted: true,
        encryptedSymmetricKey: encrypted.encryptedSymmetricKey,
        iv: encrypted.iv,
        isRead: false,
        type: "text",
      }

      // Save to localStorage for cross-page sharing
      saveMessage(user.id, message);

      // Add to local state
      setMessages((prev) => [...prev, message])

      // Ensure we scroll to the bottom after the message is added
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)

      // Clear input
      setNewMessage("")
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsLoading(false)
    }
  }, [newMessage, user, adminPublicKey])

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
  }, []);

  const handleGifSelect = useCallback((gifUrl: string) => {
    if (!user || !adminPublicKey) return;
    
    setIsLoading(true);
    
    try {
      // Create a new GIF message
      const message: Message = {
        id: `gif-${Date.now()}`,
        content: "Sent a GIF",
        sender: "user",
        timestamp: new Date().toISOString(),
        isEncrypted: true,
        isRead: false,
        type: "image",
        mediaUrl: gifUrl,
      };
      
      // Save message to localStorage
      saveMessage(user.id, message);
      
      // Add to local state
      setMessages(prev => [...prev, message]);
      
      // Ensure we scroll to the bottom after the message is added
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
      
    } catch (error) {
      console.error("Failed to send GIF:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, adminPublicKey]);

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user || !adminPublicKey) return

    // Validate file type and size
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    
    if (!validImageTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }
    
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      alert('Image is too large. Maximum size is 5MB.');
      return;
    }

    setIsLoading(true)

    try {
      // In a real app, you would upload the file to a server
      // For this demo, we'll create a data URL
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string

        // Create new message object
        const message: Message = {
          id: `image-${Date.now()}`,
          content: "Sent an image",
          sender: "user",
          timestamp: new Date().toISOString(),
          isEncrypted: true,
          isRead: false,
          type: "image",
          mediaUrl: dataUrl,
        }

        // Save to localStorage for persistence
        saveMessage(user.id, message);

        // Add to local state
        setMessages((prev) => [...prev, message])
        
        // Ensure we scroll to the bottom after the message is added
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
        
        setIsLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Failed to send image:", error)
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    if (!isClient) return;
    await logoutUser()
    router.push("/login")
  }

  // Show loading state until client-side code has executed
  if (!isClient || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white">Loading...</div>
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-white h-screen overflow-hidden">
      <header className="bg-[#121212] border-b border-[#2a2a2a] py-4 px-6 flex-shrink-0">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo1.jpeg" alt="Logo" className="h-6 w-6 rounded-full" />
            <h1 className="font-semibold">TalkToKazi</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-[#2a2a2a]">
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto p-4 space-y-6 pb-20">
          <div className="max-w-4xl mx-auto w-full">
            {messages.map((message) => {
              const isUserMessage = message.sender === "user"

              return (
                <div key={message.id} className={`flex ${isUserMessage ? "justify-start" : "justify-end"}`}>
                  <div className="max-w-[80%]">
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isUserMessage ? "bg-[#2a2a2a] text-white" : "bg-[#1a73e8] text-white"
                      }`}
                    >
                      {message.type === "text" && message.content}
                      {message.type === "image" && message.mediaUrl && (
                        <ImageMessage 
                          src={message.mediaUrl} 
                          alt="Shared image"
                          className="max-w-full rounded-md max-h-64 object-contain"
                        />
                      )}
                    </div>
                    <div className={`text-xs mt-1 text-gray-400 ${isUserMessage ? "text-left" : "text-right"}`}>
                      <span>{isUserMessage ? user.username : "Kazi"}</span>
                      <span className="mx-1">•</span>
                      <span>{formatMessageTime(message.timestamp)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="bg-[#1e1e1e] p-2 border-t border-[#2a2a2a] w-full absolute bottom-0 left-0 right-0">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full px-4">
            <input
              type="text"
              placeholder="Message Client..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-transparent"
              onClick={handleFileUpload}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
            <SimpleGifPicker onGifSelect={handleGifSelect} />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !newMessage.trim()}
              className="bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white rounded-md px-4 py-1"
            >
              Send
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
