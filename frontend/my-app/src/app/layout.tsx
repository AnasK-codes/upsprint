import "../styles/globals.css";
import Navbar from "../components/Navbar";
import { ToastProvider } from "../hooks/useToast";
import { AuthProvider } from "../hooks/useAuth";

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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col">
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 w-full">{children}</main>
            <footer className="border-t border-[var(--card-border)] py-6 text-center text-sm text-gray-500">
              &copy; {new Date().getFullYear()} UpSprint. All rights reserved.
            </footer>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
