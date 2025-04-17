"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Smile } from "lucide-react"

// Common emoji sets - add more emojis to make the grid bigger
const EMOJI_SETS = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓'],
  gestures: ['👋', '👌', '✌️', '🤞', '👍', '👎', '👏', '🙌', '🤝', '💪', '🤲', '🤟', '🤙', '👈', '👉', '👆', '👇', '✋', '🤚', '👊', '✊', '🤛', '🤜', '🤌', '👌', '🙏', '🤲'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦄', '🦓', '🦍', '🦒', '🐘', '🦛', '🐊', '🐢', '🐬', '🐋', '🦈'],
  food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🌮', '🍕', '🍔', '🍟', '🍦', '🍩', '🧁', '🍫', '☕'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💋', '💯', '💢', '💥', '💫', '💦', '💨', '💤', '💭'],
  objects: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🎱', '🎲', '🎮', '🎯', '🎭', '🎨', '🎬', '🎤', '📱', '💻', '⌚', '📷', '🔋', '💡', '🔨', '🧲', '🧰', '🧪', '🧸']
}

type EmojiPickerProps = {
  onEmojiSelect: (emoji: string) => void
}

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<keyof typeof EMOJI_SETS>('smileys')
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close the picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Only add the listener when the picker is open
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        variant="ghost"
        size="icon"
        className="text-gray-400 hover:text-white hover:bg-transparent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Smile className="h-5 w-5" />
      </Button>
      
      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-[#2a2a2a] rounded-lg shadow-lg z-50 w-96 border border-[#3a3a3a]">
          <div className="flex border-b border-[#3a3a3a]">
            {Object.keys(EMOJI_SETS).map((category) => (
              <button
                key={category}
                className={`flex-1 p-2 text-xs ${activeTab === category ? 'bg-[#3a3a3a] text-white' : 'text-gray-400 hover:bg-[#333]'}`}
                onClick={() => setActiveTab(category as keyof typeof EMOJI_SETS)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="p-3 max-h-72 overflow-y-auto">
            <div className="grid grid-cols-6 gap-3">
              {EMOJI_SETS[activeTab].map((emoji, index) => (
                <button
                  key={index}
                  className="h-14 w-14 flex items-center justify-center hover:bg-[#3a3a3a] rounded text-3xl"
                  onClick={() => {
                    onEmojiSelect(emoji)
                    // Don't close the picker after selecting an emoji
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmojiPicker 