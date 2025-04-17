"use client"

import { useState, useEffect, useCallback } from 'react'
import { X, Download } from 'lucide-react'

type ImageMessageProps = {
  src: string
  alt: string
  className?: string
}

const ImageMessage = ({ src, alt, className = "" }: ImageMessageProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const openModal = () => {
    if (!hasError) {
      setIsModalOpen(true)
      // Prevent scrolling on body when modal is open
      document.body.style.overflow = 'hidden'
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    // Re-enable scrolling
    document.body.style.overflow = 'auto'
  }

  const downloadImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Create a temporary anchor element
    const a = document.createElement('a')
    a.href = src
    
    // Extract filename from URL or use the alt text
    let filename = src.split('/').pop()
    if (!filename || filename.length < 3) {
      // If we couldn't get a filename, use the alt text or default
      filename = alt.replace(/\s+/g, '-').toLowerCase() || 'image'
      
      // Add file extension if missing
      if (!filename.includes('.')) {
        if (src.includes('data:image/png')) {
          filename += '.png'
        } else if (src.includes('data:image/jpeg') || src.includes('data:image/jpg')) {
          filename += '.jpg'
        } else if (src.includes('data:image/gif')) {
          filename += '.gif'
        } else if (src.includes('data:image/webp')) {
          filename += '.webp'
        } else {
          filename += '.png' // Default extension
        }
      }
    }
    
    a.download = filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Handle escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isModalOpen) {
      closeModal()
    }
  }, [isModalOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <>
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] rounded-md">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        
        {hasError && (
          <div className="flex flex-col items-center justify-center bg-[#1e1e1e] rounded-md p-4 text-red-400">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="mb-2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        )}
        
        <img 
          src={src} 
          alt={alt} 
          className={`${className} ${isLoading || hasError ? 'invisible h-0' : 'visible cursor-pointer'}`}
          onLoad={handleLoad}
          onError={handleError}
          onClick={openModal}
        />
      </div>

      {/* Image Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={closeModal}
        >
          <div 
            className="relative max-w-[90%] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-12 right-0 flex items-center space-x-2">
              <button 
                className="p-1.5 rounded-full bg-gray-800/80 text-white hover:bg-gray-700/80"
                onClick={downloadImage}
                title="Download"
              >
                <Download size={18} />
              </button>
              <button 
                className="p-1.5 rounded-full bg-gray-800/80 text-white hover:bg-gray-700/80"
                onClick={closeModal}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <img 
              src={src} 
              alt={alt} 
              className="max-h-[85vh] max-w-full object-contain" 
            />
          </div>
        </div>
      )}
    </>
  )
}

export default ImageMessage 