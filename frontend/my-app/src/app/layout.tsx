import "./globals.css";
import Navbar from "../components/Navbar";
import { ToastProvider } from "../context/ToastContext";

export const metadata = {
  title: "UpSprint",
  description: "Competitive Programming Leaderboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col">
        <ToastProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-8 animate-in fade-in duration-500">
            {children}
          </main>
          <footer className="border-t border-[var(--card-border)] py-6 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} UpSprint. All rights reserved.
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
