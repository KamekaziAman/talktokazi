"use client"

import React from "react"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageSquare, Search, Paperclip, Menu, X, Trash } from "lucide-react"
import { getCurrentUser, logoutUser, isAdmin, getAllUsers, updateUserLastActive, getMessagesForUser, saveMessage, getUnreadCount, deleteUser, clearUserMessages } from "@/lib/auth"
import { importPublicKey, importPrivateKey } from "@/lib/encryption"
import type { Message, User } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatMessageTime } from "@/lib/utils"
import EmojiPicker from "../components/EmojiPicker"
import SimpleGifPicker from "../components/SimpleGifPicker"
import ImageMessage from "../components/ImageMessage"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AdminPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState<{ id: string; username: string } | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<{ [userId: string]: Message[] }>({})
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false)
  const [isDeleteChatDialogOpen, setIsDeleteChatDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true)
    setIsMounted(true)
    
    // Set sidebar state based on screen size
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768)
    }
    
    // Initial check
    handleResize()
    
    // Add event listener
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Function to refresh user list - moved here so it's defined before being used
  const refreshUserList = useCallback(async () => {
    if (!isClient) return;
    
    console.log("Refreshing user list...");
    setIsRefreshing(true);
    
    try {
      const allUsers = getAllUsers();
      console.log("Admin: Retrieved all users after refresh:", allUsers);
      setUsers(allUsers);
      
      // Initialize messages for each user
      const initialMessages: { [userId: string]: Message[] } = {};

      if (allUsers.length === 0) {
        console.log("Admin: No non-admin users found after refresh!");
      }

      // Get messages for each user from localStorage
      for (const user of allUsers) {
        console.log(`Admin: Getting messages for user: ${user.username} (${user.id})`);
        const userMessages = getMessagesForUser(user.id);
        initialMessages[user.id] = userMessages;
      }

      // Log all messages for debugging
      console.log("Admin: All messages after refresh:", initialMessages);
      setMessages(initialMessages);

      // Update selected user if needed
      if (allUsers.length > 0) {
        if (!selectedUser || !allUsers.find(u => u.id === selectedUser.id)) {
          console.log(`Admin: Setting selected user to ${allUsers[0].username}`);
          setSelectedUser(allUsers[0]);
        } else {
          console.log(`Admin: Keeping selected user as ${selectedUser.username}`);
        }
      } else {
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Error refreshing user list:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isClient, selectedUser]);

  // Function to check for new messages for the selected user
  const checkForNewMessages = useCallback(() => {
    if (!isClient || !selectedUser) return;
    
    try {
      // Get messages for selected user
      const userMessages = getMessagesForUser(selectedUser.id);
      
      // Update messages if there's a change in count or content
      if (!messages[selectedUser.id] || 
          messages[selectedUser.id].length !== userMessages.length || 
          JSON.stringify(messages[selectedUser.id]) !== JSON.stringify(userMessages)) {
        
        setMessages(prev => ({
          ...prev,
          [selectedUser.id]: userMessages
        }));
      }
    } catch (error) {
      console.error("Error checking for new messages:", error);
    }
  }, [isClient, selectedUser, messages]);

  // Set up interval to check for new messages every 0.5 seconds
  useEffect(() => {
    if (!isClient) return;
    
    const messagesInterval = setInterval(() => {
      checkForNewMessages();
    }, 500); // 0.5 seconds
    
    return () => clearInterval(messagesInterval);
  }, [isClient, checkForNewMessages]);

  useEffect(() => {
    // Only run on client side
    if (!isClient) return;

    const checkAuth = async () => {
      try {
        console.log("Checking authentication...");
        const currentUser = await getCurrentUser()
        if (!currentUser || !(await isAdmin(currentUser.id))) {
          router.push("/login")
          return
        }
        setAdmin(currentUser)

        // Load private key from localStorage
        const privateKeyString = localStorage.getItem("privateKey")
        if (!privateKeyString) {
          console.error("Private key not found")
          router.push("/login")
          return
        }

        // Import private key
        try {
          const importedPrivateKey = await importPrivateKey(privateKeyString)
          setPrivateKey(importedPrivateKey)
          
          // Load users and messages with our refresh function
          refreshUserList();
          
        } catch (error) {
          console.error("Crypto error:", error)
          router.push("/login")
        }
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router, isClient, refreshUserList])

  // Auto-scroll when messages change
  useEffect(() => {
    if (isClient && selectedUser && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isClient, selectedUser, messages]);

  const handleSelectUser = useCallback((user: User) => {
    setSelectedUser(user)
    updateUserLastActive(user.id)
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedUser || !admin || !privateKey) return;

    console.log(`Admin: Sending message to ${selectedUser.username}`);
    setIsLoading(true);

    try {
      // Using a sample RSA key - this would normally be fetched from a server
      const mockUserPublicKeyString =
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAstk92O/8ZF+4QNinB/k6JkXBGpBL9GVdQNq76QcQM2m8fAx0/ZAmAM6q2uNMsQOCHZVHy3SCTKxSOxTZLgVWUjHcKyRLDHKhuiSY72xC8H9AK1c4CuVwJf+caWWmGlAQwRvxnHY/lS32+8/2YhfMQbGHxwpFiXG2DnXo2qxnLzxt4QAnkCZnAyTgRMQJSuIDMxm4wkRJcyq6iDf1CmJyu7luYqNUO5dW4B9MtuxYQGiAwl1vGtZmLK90pUB+W84EcFLCkSJC7DS9Oa5CSxUO9L8+GKR8CwsZ4re6GjC0/p+xG1eP7JqYDLxvUOVWyFOPjoQp+UUqeLvVr8+5S6hmXwIDAQAB";
      const userPublicKey = await importPublicKey(mockUserPublicKeyString);

      // Create new message object with a stable ID format
      const message: Message = {
        id: `admin-${Date.now()}`,
        content: newMessage,
        sender: "admin",
        timestamp: new Date().toISOString(),
        isEncrypted: true,
        isRead: false,
        type: "text",
      };

      console.log(`Admin: Adding message to user ${selectedUser.username}:`, message);

      // Save message to localStorage for cross-page sharing
      saveMessage(selectedUser.id, message);

      // Add to local state
      setMessages((prev) => {
        const userMessages = [...(prev[selectedUser.id] || []), message];
        console.log(`Admin: User ${selectedUser.username} now has ${userMessages.length} messages`);
        return {
          ...prev,
          [selectedUser.id]: userMessages,
        };
      });

      // Ensure we scroll to the bottom after the message is added
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)

      // Clear input
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  }, [newMessage, selectedUser, admin, privateKey]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
  }, []);

  const handleGifSelect = useCallback((gifUrl: string) => {
    if (!selectedUser || !admin) return;
    
    setIsLoading(true);
    
    try {
      // Create a new GIF message
      const message: Message = {
        id: `gif-${Date.now()}`,
        content: "Sent a GIF",
        sender: "admin",
        timestamp: new Date().toISOString(),
        isEncrypted: true,
        isRead: false,
        type: "image",
        mediaUrl: gifUrl,
      };
      
      // Save message to localStorage
      saveMessage(selectedUser.id, message);
      
      // Add to local state
      setMessages((prev) => ({
        ...prev,
        [selectedUser.id]: [...(prev[selectedUser.id] || []), message],
      }));
      
      // Ensure we scroll to the bottom after the message is added
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
      
    } catch (error) {
      console.error("Failed to send GIF:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedUser, admin]);

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedUser || !admin) return

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
      const reader = new FileReader()
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string

        // Create new message object with a stable ID format
        const message: Message = {
          id: `image-${Date.now()}`,
          content: "Sent an image",
          sender: "admin",
          timestamp: new Date().toISOString(),
          isEncrypted: true,
          isRead: false,
          type: "image",
          mediaUrl: dataUrl,
        }

        // Save message to localStorage for persistence
        saveMessage(selectedUser.id, message);

        // Add to local state
        setMessages((prev) => ({
          ...prev,
          [selectedUser.id]: [...(prev[selectedUser.id] || []), message],
        }))

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

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (!selectedUser) return

      setMessages((prev) => ({
        ...prev,
        [selectedUser.id]: prev[selectedUser.id].filter((msg) => msg.id !== messageId),
      }))
    },
    [selectedUser],
  )

  const handleLogout = async () => {
    if (!isClient) return;
    await logoutUser()
    router.push("/login")
  }

  const handleDeleteUser = useCallback((user: User) => {
    setUserToDelete(user);
    setIsDeleteUserDialogOpen(true);
  }, []);

  const confirmDeleteUser = useCallback(() => {
    if (!userToDelete) return;
    
    try {
      // Delete the user
      deleteUser(userToDelete.id);
      
      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      
      // If the deleted user was selected, clear the selection
      if (selectedUser && selectedUser.id === userToDelete.id) {
        setSelectedUser(null);
      }
      
      // Close the dialog
      setIsDeleteUserDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }, [userToDelete, selectedUser]);

  const handleClearChat = useCallback(() => {
    if (!selectedUser) return;
    setIsDeleteChatDialogOpen(true);
  }, [selectedUser]);

  const confirmClearChat = useCallback(() => {
    if (!selectedUser) return;
    
    try {
      // Clear all messages for the selected user
      clearUserMessages(selectedUser.id);
      
      // Update local state
      setMessages(prev => ({
        ...prev,
        [selectedUser.id]: []
      }));
      
      // Close the dialog
      setIsDeleteChatDialogOpen(false);
    } catch (error) {
      console.error("Failed to clear chat:", error);
    }
  }, [selectedUser]);

  const filteredUsers = users.filter((user) => user.username.toLowerCase().includes(searchQuery.toLowerCase()))

  // Show loading state until client-side code has executed
  if (!isClient || !admin) {
    return <div className="min-h-screen flex items-center justify-center bg-[#121212] text-white">Loading...</div>
  }

  return (
    <div className="min-h-screen flex bg-[#121212] text-white">
      {/* Sidebar - now conditionally shown on mobile */}
      <div className={`${isSidebarOpen ? 'flex' : 'hidden'} md:flex flex-col h-screen border-r border-[#2a2a2a] w-full md:w-96 absolute md:relative z-10 bg-[#121212]`}>
        <div className="p-4 border-b border-[#2a2a2a] flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src="/logo1.jpeg" alt="Logo" className="h-6 w-6 rounded-full" />
              <h1 className="font-semibold">TalkToKazi</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                onClick={refreshUserList}
                disabled={isRefreshing}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isRefreshing ? 'animate-spin' : ''}`}>
                  <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-9 bg-[#2a2a2a] border-[#3a3a3a] text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">No users found</div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {filteredUsers.map((user) => (
                <div key={user.id} className="relative flex w-full">
                  <button
                    className={`flex-1 text-left p-4 hover:bg-[#2a2a2a] transition-colors ${
                      selectedUser?.id === user.id ? "bg-[#2a2a2a]" : ""
                    }`}
                    onClick={() => {
                      handleSelectUser(user);
                      // Close sidebar on mobile after selecting a user
                      if (window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#3a3a3a] flex items-center justify-center text-white font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate">{user.username}</span>
                        </div>
                        {isMounted && (
                          <div className="text-xs text-gray-400 mt-1 truncate">
                            Last active: {new Date(user.lastActive).toLocaleString("en-US", {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    className="w-12 h-auto flex items-center justify-center border-l border-[#3a3a3a] bg-[#1e1e1e] hover:bg-red-500/90 text-gray-400 hover:text-white transition-all duration-200"
                    title="Delete User"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUser(user);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Delete User</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-[#121212] border-b border-[#2a2a2a] py-4 px-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {!isSidebarOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-gray-400 hover:text-white hover:bg-[#2a2a2a] mr-2"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}
              {selectedUser ? (
                <h1 className="font-semibold">{selectedUser.username}</h1>
              ) : (
                <h1 className="font-semibold">Admin Dashboard</h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedUser && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearChat}
                  className="text-red-400 hover:text-red-300 hover:bg-[#2a2a2a] flex items-center gap-1"
                >
                  <Trash className="h-4 w-4" />
                  <span>Clear Chat</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-[#2a2a2a]">
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          {selectedUser ? (
            <>
              <div className="absolute inset-0 overflow-y-auto p-4 space-y-6 pb-20">
                {messages[selectedUser.id]?.length > 0 ? (
                  messages[selectedUser.id]?.map((message) => {
                    const isAdminMessage = message.sender === "admin"

                    return (
                      <div key={message.id} className={`flex ${isAdminMessage ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[80%]">
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              isAdminMessage ? "bg-[#1a73e8] text-white" : "bg-[#2a2a2a] text-white"
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
                          <div
                            className={`text-xs mt-1 text-gray-400 flex items-center ${isAdminMessage ? "justify-end" : "justify-start"}`}
                          >
                            <span>{isAdminMessage ? "Kazi" : selectedUser.username}</span>
                            <span className="mx-1">•</span>
                            <span>{formatMessageTime(message.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-400 p-8 bg-[#1e1e1e] rounded-md">
                      <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">No messages yet</h3>
                      <p className="text-sm">
                        This is the beginning of your conversation with {selectedUser.username}.
                        <br />Send a message to start chatting.
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="bg-[#1e1e1e] p-2 border-t border-[#2a2a2a] w-full absolute bottom-0 left-0 right-0">
                <div className="flex items-center gap-2 px-4">
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
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
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
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col">
              <MessageSquare className="h-12 w-12 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Select a user to start chatting</h3>
              <p className="text-center text-gray-400 max-w-md">
                Choose a user from the sidebar to view your conversation history and send messages.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <AlertDialogContent className="bg-[#1e1e1e] border border-[#3a3a3a] text-white rounded-lg shadow-lg max-w-md mx-auto">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <Trash className="h-5 w-5 text-red-400" />
              <span>Delete User</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-sm">
              Are you sure you want to delete <span className="text-white font-medium">{userToDelete?.username}</span>? This action cannot be undone and will remove all messages and data associated with this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 mt-4">
            <AlertDialogCancel className="bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] border border-[#3a3a3a] rounded-md px-4 py-2 transition-colors">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteUser}
              className="bg-red-600 text-white hover:bg-red-700 rounded-md px-4 py-2 font-medium flex items-center gap-1 transition-colors"
            >
              <Trash className="h-4 w-4" />
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Chat Confirmation Dialog */}
      <AlertDialog open={isDeleteChatDialogOpen} onOpenChange={setIsDeleteChatDialogOpen}>
        <AlertDialogContent className="bg-[#1e1e1e] border border-[#3a3a3a] text-white rounded-lg shadow-lg max-w-md mx-auto">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2">
              <Trash className="h-5 w-5 text-red-400" />
              <span>Clear Chat History</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-sm">
              Are you sure you want to clear all messages with <span className="text-white font-medium">{selectedUser?.username}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 mt-4">
            <AlertDialogCancel className="bg-[#2a2a2a] text-white hover:bg-[#3a3a3a] border border-[#3a3a3a] rounded-md px-4 py-2 transition-colors">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmClearChat}
              className="bg-red-600 text-white hover:bg-red-700 rounded-md px-4 py-2 font-medium flex items-center gap-1 transition-colors"
            >
              <Trash className="h-4 w-4" />
              Clear Chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
