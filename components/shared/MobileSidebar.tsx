'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MobileLink = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

export default function MobileSidebar({
  title,
  subtitle,
  links,
  extras,
}: {
  title: React.ReactNode;
  subtitle: string;
  links: MobileLink[];
  extras?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button (mobile only) */}
      <div className="flex items-center md:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen((v) => !v)}
          aria-label="Ouvrir le menu de l'espace"
        >
          {open ? <X className="h-5 w-5 text-slate-700" /> : <Menu className="h-5 w-5 text-slate-700" />}
        </Button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-slate-900 text-white shadow-xl p-6 flex flex-col justify-between">
            <div className="space-y-8">
              <div>
                <div className="text-2xl font-extrabold tracking-tight">{title}</div>
                <div className="mt-2 text-xs text-slate-400 font-medium uppercase tracking-wider">{subtitle}</div>
              </div>
              <nav className="space-y-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-semibold"
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
            {extras && <div className="space-y-4 border-t border-slate-700 pt-6">{extras}</div>}
          </div>
        </div>
      )}
    </>
  );
}
