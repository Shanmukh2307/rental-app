'use client';

import { useEffect } from 'react';

// This is a dedicated component to ensure CSS resources are loaded correctly
export default function SearchPageResourceLoader() {
  useEffect(() => {
    // Simple approach that adds a class to document to force CSS resolution
    document.documentElement.classList.add('search-page-styles');
    
    return () => {
      document.documentElement.classList.remove('search-page-styles');
    };
  }, []);

  return null; // This component doesn't render anything
}
