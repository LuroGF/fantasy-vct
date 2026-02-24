"use client";

interface RefreshWrapperProps {
  children: React.ReactNode;
}

export default function RefreshWrapper({ children }: RefreshWrapperProps) {
  return (
    <>
      {children}
    </>
  );
}
