// This file dynamically imports AWS Amplify UI styles
import React, { useEffect } from 'react';
import '@aws-amplify/ui-react/styles.css';

// This is a React component that ensures the styles are loaded properly
export default function AuthStyles() {
  // Using useEffect to ensure the styles are loaded client-side only
  useEffect(() => {
    // This empty effect ensures the component is mounted client-side
    // which helps Next.js recognize that the CSS is actually being used
    document.documentElement.classList.add('amplify-styles-loaded');
    
    return () => {
      document.documentElement.classList.remove('amplify-styles-loaded');
    };
  }, []);
  
  return null;
}
