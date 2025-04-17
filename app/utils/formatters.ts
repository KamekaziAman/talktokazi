/**
 * Format a timestamp to display time only for today's messages, 
 * and date with time for older messages
 */
export const formatMessageTime = (timestamp: string): string => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  
  // Check if the message is from today
  const isToday = messageDate.toDateString() === now.toDateString();
  
  if (isToday) {
    // For today's messages, show only time (12-hour format)
    return messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } else {
    // For older messages, show date and time
    return messageDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}; 