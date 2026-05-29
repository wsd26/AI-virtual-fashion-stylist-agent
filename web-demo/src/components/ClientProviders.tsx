"use client";

import { ReactNode } from "react";
import { UserProfileProvider } from "@/lib/userProfile";

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <UserProfileProvider>{children}</UserProfileProvider>;
}
