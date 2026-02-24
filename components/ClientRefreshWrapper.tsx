"use client";

import { ReactNode } from 'react';

interface ClientRefreshWrapperProps {
  children: ReactNode;
}

export default function ClientRefreshWrapper({ children }: ClientRefreshWrapperProps) {
  return (
    <>
      {children}
    </>
  );
}
