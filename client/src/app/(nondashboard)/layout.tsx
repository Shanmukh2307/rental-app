"use client";

import React, { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar';
import { useGetAuthUserQuery } from '@/state/api';
import { NAVBAR_HEIGHT } from '@/lib/constants';
import { usePathname, useRouter } from 'next/navigation';
const Layout = ({children}:{children:React.ReactNode}) => {
  const { data : authUser, isLoading: authLoading, isError: authError } = useGetAuthUserQuery();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // If auth request is done (success or error), we can proceed
    if (!authLoading) {
      // If we have a user and they're a manager, redirect them
      if (authUser) {
        const userRole = authUser.userRole?.toLowerCase();
        if (
          (userRole === 'manager' && pathname.startsWith('/search')) ||
          (userRole === 'manager' && pathname === "/")
        ) {
          router.push('/managers/properties', {scroll: false});
        } else {
          setIsLoading(false);
        }
      } else {
        // User is not authenticated or there was an error - this is fine for non-dashboard pages
        setIsLoading(false);
      }
    }
  }, [authUser, authLoading, pathname, router, authError]);
  
  // Show simple loading while checking auth, but don't block for too long
  useEffect(() => {
    // Set a timeout to stop loading after a reasonable time
    // This prevents infinite loading if there's an issue with auth
    const timer = setTimeout(() => {
      if (isLoading) setIsLoading(false);
    }, 2000); // 2 seconds max wait
    
    return () => clearTimeout(timer);
  }, [isLoading]);
  
  if (isLoading) return <>Loading...</>
  console.log("Auth User:", authUser);
  return (
    <div className='size-full'>
        <Navbar/>
        <main className={`h-full flex w-full flex-col`}
            style={{paddingTop:`${NAVBAR_HEIGHT}px`}}
        >
            {children}
        </main>
    </div>
  )
}

export default Layout