import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "MeetUp — Video Calls & Chat",
  description:
    "A modern video calling and chat application with screen sharing, emoji support, and real-time communication.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-100 text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
