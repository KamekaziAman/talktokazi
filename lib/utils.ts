import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMessageTime(timestamp: string): string {
  const messageDate = new Date(timestamp);
  const today = new Date();
  
  // Check if the message is from today
  const isToday = messageDate.toDateString() === today.toDateString();
  
  if (isToday) {
    // Display time only for today's messages
    return messageDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } else {
    // Display date + time for older messages
    return messageDate.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}
