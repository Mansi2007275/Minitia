import "./globals.css";
import Link from "next/link";
import { Inter } from "next/font/google";
import KeplrConnect from "./components/KeplrConnect";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Minitia — Proof-of-work AI task marketplace",
  description:
    "Minitia: trustless marketplace for objective, machine-verifiable deliverables with auditable proof and reputation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <nav className="site-nav">
          <div className="nav-container">
            <Link href="/" className="nav-logo">
              Minitia <span>PoW</span>
            </Link>
            <div className="nav-right">
              <div className="nav-links">
                <Link href="/" className="nav-link">
                  Tasks
                </Link>
                <Link href="/create" className="nav-link">
                  New task
                </Link>
              </div>
              <KeplrConnect />
            </div>
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
