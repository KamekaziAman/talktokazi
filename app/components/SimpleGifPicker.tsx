"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type GifPickerProps = {
  onGifSelect: (gifUrl: string) => void
}

const SimpleGifPicker = ({ onGifSelect }: GifPickerProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [gifs, setGifs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch trending GIFs when opened
  useEffect(() => {
    if (isOpen && gifs.length === 0 && !isLoading) {
      fetchTrendingGifs()
    }
  }, [isOpen, gifs.length, isLoading])

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

  // Clean up timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const fetchTrendingGifs = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Using GIPHY public beta key - in production use your own API key
      const response = await fetch('https://api.giphy.com/v1/gifs/trending?api_key=CdRKiCMbTnt9CkZTZ0lGukSczk6iT4Z6&limit=20')
      
      if (!response.ok) {
        throw new Error('Failed to fetch GIFs')
      }
      
      const data = await response.json()
      setGifs(data.data || [])
    } catch (err) {
      console.error('Error fetching GIFs:', err)
      setError('Failed to load GIFs. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      fetchTrendingGifs()
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=CdRKiCMbTnt9CkZTZ0lGukSczk6iT4Z6&q=${encodeURIComponent(query)}&limit=20`)
      
      if (!response.ok) {
        throw new Error('Failed to search GIFs')
      }
      
      const data = await response.json()
      setGifs(data.data || [])
    } catch (err) {
      console.error('Error searching GIFs:', err)
      setError('Failed to search GIFs. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    
    // Debounce search to avoid too many API calls
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchGifs(query)
    }, 500)
  }

  const handleGifClick = (gifUrl: string) => {
    onGifSelect(gifUrl)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "hover:bg-transparent relative",
          isOpen ? "text-white" : "text-gray-400 hover:text-white"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="rounded-md px-1.5 py-0.5">
          <span className="text-[12px] font-bold text-grey tracking-wider">GIF</span>
        </div>
      </Button>
      
      {isOpen && (
        <div className="absolute bottom-12 right-0 z-50 w-96 bg-[#2a2a2a] rounded-lg shadow-lg border border-[#3a3a3a] p-3">
          <div className="mb-3 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search GIFs..."
              className="pl-8 bg-[#1e1e1e] border-[#3a3a3a] text-white"
              value={searchQuery}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading && (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
            
            {error && (
              <div className="text-red-400 p-4 text-center">
                <p>{error}</p>
              </div>
            )}
            
            {!isLoading && !error && gifs.length === 0 && (
              <div className="text-gray-400 p-4 text-center">
                <p>No GIFs found. Try another search term.</p>
              </div>
            )}
            
            {!isLoading && !error && gifs.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {gifs.map((gif) => (
                  <div 
                    key={gif.id} 
                    className="cursor-pointer rounded overflow-hidden hover:opacity-80 transition-opacity"
                    onClick={() => handleGifClick(gif.images.fixed_height.url)}
                  >
                    <img 
                      src={gif.images.fixed_height.url} 
                      alt={gif.title} 
                      className="w-full h-auto object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleGifPicker 