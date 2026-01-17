import "./globals.css";
import { DM_Sans, Outfit } from "next/font/google";

const display = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display"
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body"
});

export const metadata = {
  title: "Speed Reader Studio",
  description: "Upload text, PDF, or a URL and read at your own pace."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
