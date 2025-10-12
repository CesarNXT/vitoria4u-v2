'use client';

import React, { createContext, useContext } from 'react';

interface BusinessUserContextType {
  businessUserId: string | null;
}

const BusinessUserContext = createContext<BusinessUserContextType>({
  businessUserId: null,
});

export function BusinessUserProvider({
  children,
  businessUserId,
}: {
  children: React.ReactNode;
  businessUserId: string | null;
}) {
  return (
    <BusinessUserContext.Provider value={{ businessUserId }}>
      {children}
    </BusinessUserContext.Provider>
  );
}

export function useBusinessUser() {
  return useContext(BusinessUserContext);
}
