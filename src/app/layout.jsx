import { StoreInitializer } from "@/components/StoreInitializer";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata = {
  title: "Kissan Fresh",
  description: "Dashboard For Kissan Fresh",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <StoreInitializer>
            {children}
          </StoreInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}
