'use client';

import React, { createContext, useContext } from 'react';

interface BusinessUserContextType {
  businessUserId: string | null;
}

const BusinessUserContext = createContext<BusinessUserContextType | undefined>(undefined);

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
  const context = useContext(BusinessUserContext);
  if (context === undefined) {
    throw new Error('useBusinessUser must be used within BusinessUserProvider');
  }
  return context;
}
