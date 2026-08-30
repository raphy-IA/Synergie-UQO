'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { name: 'Accueil', href: '/' },
    { name: 'À Propos', href: '/a-propos' },
    { name: 'Partenaires', href: '/partenaires' },
    { name: 'Actualités & Blog', href: '/blog' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-2xl font-extrabold text-blue-900 tracking-tight">
              Synergie <span className="text-amber-500">UQO</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors hover:text-blue-900 ${
                  pathname === link.href ? 'text-blue-900 border-b-2 border-amber-500 pb-1' : 'text-slate-600'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Action CTA Buttons (desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className={buttonVariants({
                variant: 'outline',
                className: 'border-blue-900 text-blue-900 hover:bg-blue-50 font-bold'
              })}
            >
              Espace Membre
            </Link>
            <Link
              href="/adhesion"
              className={buttonVariants({
                variant: 'default',
                className: 'bg-blue-900 hover:bg-blue-950 text-white font-bold'
              })}
            >
              Devenir Membre
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Ouvrir le menu"
            >
              {mobileOpen ? <X className="h-5 w-5 text-slate-700" /> : <Menu className="h-5 w-5 text-slate-700" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 pb-4 pt-2 shadow-lg">
          <nav className="flex flex-col space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                  pathname === link.href
                    ? 'text-blue-900 bg-blue-50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-blue-900'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-100">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className={buttonVariants({
                variant: 'outline',
                className: 'border-blue-900 text-blue-900 hover:bg-blue-50 font-bold w-full'
              })}
            >
              Espace Membre
            </Link>
            <Link
              href="/adhesion"
              onClick={() => setMobileOpen(false)}
              className={buttonVariants({
                variant: 'default',
                className: 'bg-blue-900 hover:bg-blue-950 text-white font-bold w-full'
              })}
            >
              Devenir Membre
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
