import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Synergie <span className="text-amber-500">UQO</span></h3>
          <p className="text-sm text-slate-400">
            Fédérer la communauté universitaire de l'UQO autour de l'entraide, du mentorat et du développement professionnel.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Navigation</h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li><Link href="/a-propos" className="hover:text-amber-500 transition-colors">À Propos</Link></li>
            <li><Link href="/partenaires" className="hover:text-amber-500 transition-colors">Nos Partenaires</Link></li>
            <li><Link href="/blog" className="hover:text-amber-500 transition-colors">Actualités & Blog</Link></li>
            <li><Link href="/adhesion" className="hover:text-amber-500 transition-colors">Devenir Membre</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Légal & Contact</h4>
          <p className="text-sm text-slate-400 leading-relaxed">
            Application conforme à la Loi 25 (Québec) sur la protection des renseignements personnels.
          </p>
          <p className="text-xs text-slate-500 mt-4">
            © {new Date().getFullYear()} Synergie UQO. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
