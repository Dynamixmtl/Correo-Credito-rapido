import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CreditRapide – Formulaire d\'approbation',
  description: 'Système d\'approbation de demandes de crédit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-gov-blue text-white shadow-md">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
              <span className="text-gov-blue font-bold text-sm">CR</span>
            </div>
            <span className="font-semibold text-lg tracking-wide">CreditRapide</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-10">{children}</main>
        <footer className="mt-auto border-t border-gray-200 py-4">
          <p className="text-center text-xs text-gray-400">
            Système d&apos;approbation sécurisé – Accès confidentiel
          </p>
        </footer>
      </body>
    </html>
  );
}
