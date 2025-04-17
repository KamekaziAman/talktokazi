"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2, Check, ImageIcon, Smile } from "lucide-react"
import type { Message } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"

interface ChatInterfaceProps {
  messages: Message[]
  currentUserId: string
  isAdmin?: boolean
  onDeleteMessage?: (messageId: string) => void
  onMarkAsRead?: (messageId: string) => void
}

export function ChatInterface({
  messages,
  currentUserId,
  isAdmin = false,
  onDeleteMessage,
  onMarkAsRead,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString()
  }

  // Group messages by date
  const groupedMessages: { [date: string]: Message[] } = {}
  messages.forEach((message) => {
    const date = formatDate(message.timestamp)
    if (!groupedMessages[date]) {
      groupedMessages[date] = []
    }
    groupedMessages[date].push(message)
  })

  const handleImageClick = (url: string) => {
    setImagePreview(url)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs px-3 py-1 rounded-full">
              {date}
            </div>
          </div>

          {dateMessages.map((message) => {
            const isCurrentUser = message.sender !== "admin"
            const isUserMessage = message.sender === "user"

            return (
              <div key={message.id} className={cn("flex gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
                {!isCurrentUser && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">KZ</AvatarFallback>
                  </Avatar>
                )}

                <div className="max-w-[80%]">
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 inline-block",
                      isCurrentUser
                        ? "bg-emerald-600 text-white rounded-br-none"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none",
                    )}
                  >
                    {message.type === "text" && message.content}

                    {message.type === "image" && message.mediaUrl && (
                      <div className="cursor-pointer" onClick={() => handleImageClick(message.mediaUrl!)}>
                        <img
                          src={message.mediaUrl || "/placeholder.svg"}
                          alt="Shared image"
                          className="max-w-full rounded-md max-h-64 object-contain"
                        />
                      </div>
                    )}

                    {message.type === "gif" && message.mediaUrl && (
                      <div>
                        <img
                          src={message.mediaUrl || "/placeholder.svg"}
                          alt="GIF"
                          className="max-w-full rounded-md max-h-64 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      "text-xs mt-1 text-slate-500 flex items-center",
                      isCurrentUser ? "justify-end" : "justify-start",
                    )}
                  >
                    <span>{formatTime(message.timestamp)}</span>

                    {message.isEncrypted && (
                      <span className="ml-2 inline-flex items-center">
                        <span className="text-emerald-500 dark:text-emerald-400">•</span>
                        <span className="ml-1">Encrypted</span>
                      </span>
                    )}

                    {isAdmin && isUserMessage && (
                      <div className="flex items-center ml-2">
                        {!message.isRead && onMarkAsRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-slate-400 hover:text-emerald-500"
                            onClick={() => onMarkAsRead(message.id)}
                          >
                            <Check className="h-3 w-3" />
                            <span className="sr-only">Mark as read</span>
                          </Button>
                        )}

                        {message.isRead && <span className="text-emerald-500 text-xs ml-1">Seen</span>}

                        {onDeleteMessage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-slate-400 hover:text-red-500 ml-1"
                            onClick={() => onDeleteMessage(message.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {!isAdmin && !isUserMessage && message.isRead && (
                      <span className="text-emerald-500 text-xs ml-2">Seen</span>
                    )}
                  </div>
                </div>

                {isCurrentUser && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                      {currentUserId.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )
          })}
        </div>
      ))}
      <div ref={messagesEndRef} />

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img
              src={imagePreview || "/placeholder.svg"}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function MessageInput({
  onSendMessage,
  onSendMedia,
  isLoading,
}: {
  onSendMessage: (content: string) => void
  onSendMedia: (file: File, type: "image" | "gif") => void
  isLoading: boolean
}) {
  const [message, setMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const fileType = file.type.startsWith("image/gif") ? "gif" : "image"
      onSendMedia(file, fileType)
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleEmojiSelect = (emoji: any) => {
    setMessage((prev) => prev + emoji.native)
    setShowEmojiPicker(false)
  }

  return (
    <form className="flex gap-2 items-end" onSubmit={handleSubmit}>
      <div className="flex-1 relative">
        <div className="flex items-center gap-2 mb-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-5 w-5 text-slate-500" />
            <span className="sr-only">Add image</span>
          </Button>

          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <Smile className="h-5 w-5 text-slate-500" />
                <span className="sr-only">Add emoji</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-none" align="start">
              <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
            </PopoverContent>
          </Popover>
        </div>

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

        <textarea
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
      </div>

      <Button type="submit" disabled={isLoading || !message.trim()} className="mb-0">
        {isLoading ? "Sending..." : "Send"}
      </Button>
    </form>
  )
}
