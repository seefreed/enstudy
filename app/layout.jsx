import "./globals.css";
import { Literata, Unbounded } from "next/font/google";

const display = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display"
});

const body = Literata({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
