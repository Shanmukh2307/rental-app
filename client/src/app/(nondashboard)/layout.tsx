"use client";

import React, { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar';
import { useGetAuthUserQuery } from '@/state/api';
import { NAVBAR_HEIGHT } from '@/lib/constants';
import { usePathname, useRouter } from 'next/navigation';
const Layout = ({children}:{children:React.ReactNode}) => {
  const { data : authUser ,isLoading :authLoading } = useGetAuthUserQuery();
  const router = useRouter();
      const pathname = usePathname();
      const [isLoading, setIsLoading] = useState(true);
  
      useEffect(()=> {
           if(authUser){
              const userRole = authUser.userRole?.toLowerCase();
              if(
              (userRole === 'manager' && pathname.startsWith('/search')) ||
              (userRole === 'manager' && pathname === "/")
              ) {
                  router.push(
                      '/managers/properties',
                      {scroll : false}
                  );
                }else{
                  setIsLoading(false);
                }
              }else if (!authLoading) {
               // User is not authenticated and auth query is complete
                 setIsLoading(false);
              }

      },[authUser, pathname, router]);
      if(authLoading || isLoading) return <>Loading...</>
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