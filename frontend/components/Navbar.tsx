import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="site-nav">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          Minitia <span>PoW</span>
        </Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">
            Tasks
          </Link>
          <Link href="/create" className="nav-link">
            New task
          </Link>
        </div>
      </div>
    </nav>
  );
}
