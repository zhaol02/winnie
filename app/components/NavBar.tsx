"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./NavBar.module.css";

const navLinks = [
  { label: "Our Work", href: "/" },
  { label: "Upload", href: "/upload" },
  { label: "Admin", href: "/admin" },
];

export default function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>
          WinniePro Remodeling
        </Link>

        {/* Desktop links */}
        <ul className={styles.links} role="list">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={styles.link}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Hamburger button (mobile only) */}
        <button
          className={styles.hamburger}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className={styles.bar} />
          <span className={styles.bar} />
          <span className={styles.bar} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <ul
          id="mobile-menu"
          className={styles.mobileMenu}
          role="list"
          onClick={() => setMenuOpen(false)}
        >
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={styles.mobileLink}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
