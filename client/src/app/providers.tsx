"use client";

import StoreProvider from "@/state/redux";
import { Authenticator } from "@aws-amplify/ui-react";
// Only import the Auth component, not the styles
import Auth from "./(auth)/authProvider";

const Providers=({children}:{children:React.ReactNode}) => {
  // Determine if we're on an authentication page
  const isAuthPage = typeof window !== 'undefined' && 
    (window.location.pathname.includes('/login') || 
     window.location.pathname.includes('/signup'));
  
  return (
    <StoreProvider>
      <Authenticator.Provider>
        <Auth>{children}</Auth>
      </Authenticator.Provider>
    </StoreProvider>
  );
};
export default Providers;