"use client";

import { useRouter } from "next/navigation";

export default function BackLink({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div onClick={() => router.back()} className="cursor-pointer">
      {children}
    </div>
  );
}