import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Resource Booking",
  description: "Book shared rooms, vehicles, equipment and tools without overlaps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
