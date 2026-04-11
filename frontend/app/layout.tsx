import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Intia - Decentralized AI Task Marketplace',
  description: 'AI-verified decentralized task marketplace MVP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="glass-nav">
          <div className="nav-container">
            <Link href="/" className="nav-logo">
              Intia MVP
            </Link>
            <div className="nav-links">
              <Link href="/" className="nav-link">Dashboard</Link>
              <Link href="/create" className="nav-link">Create Task</Link>
            </div>
          </div>
        </nav>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  );
}
