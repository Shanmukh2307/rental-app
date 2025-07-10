"use client";

import StoreProvider from "@/state/redux";
import { Authenticator } from "@aws-amplify/ui-react";
// Only import the Auth component, not the styles
import Auth from "./(auth)/authProvider";

const Providers=({children}:{children:React.ReactNode}) => {
  return (
    <StoreProvider>
      <Authenticator.Provider>
        <Auth>{children}</Auth>
      </Authenticator.Provider>
    </StoreProvider>
  );
};
export default Providers;