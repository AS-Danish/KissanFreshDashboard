import { AuthProvider } from "@/context/AuthContext";
import { CategoryProvider } from "@/context/CategoryContext";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata = {
  title: "Kissan Fresh",
  description: "Dashboard For Kissan Fresh",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CategoryProvider>
            <AuthProvider>{children}</AuthProvider>
          </CategoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}