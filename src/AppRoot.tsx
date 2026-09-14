"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "@/App";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { createQueryClient } from "@/lib/queryClient";

/** SPA ildizi — QueryClient bir marta yaratiladi (eski main.tsx o'rnida). */
export default function AppRoot() {
  const [queryClient] = useState<QueryClient>(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary label="App">
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
