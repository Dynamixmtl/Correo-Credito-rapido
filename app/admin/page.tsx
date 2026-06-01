import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/auth';
import { getAllRequests } from '@/lib/storage';
import { StatusBadge } from '@/components/StatusBadge';
import { AdminLogoutButton } from '@/components/AdminLogoutButton';
import { CreditRequest } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const authenticated = await getAdminSession();
  if (!authenticated) redirect('/admin/login');

  let requests: CreditRequest[] = [];
  let storageError = false;

  try {
    requests = await getAllRequests();
  } catch {
    storageError = true;
  }

  const total = requests.length;
  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gov-blue">Tableau de bord</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Demandes reçues via CreditRapide
          </p>
        </div>
        <AdminLogoutButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: total, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'En attente', value: pending, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
          { label: 'Approuvées', value: approved, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Rejetées', value: rejected, color: 'bg-red-50 text-red-700 border-red-200' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gov-blue">Toutes les demandes</h2>
        </div>

        {storageError ? (
          <div className="p-8 text-center text-red-600">
            Erreur de connexion au stockage Azure. Vérifiez la configuration.
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Aucune demande reçue pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Nom du document</th>
                  <th className="px-4 py-3 text-left">Montant</th>
                  <th className="px-4 py-3 text-left">Montant retenu</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Reçu le</th>
                  <th className="px-4 py-3 text-left">Traité le</th>
                  <th className="px-4 py-3 text-left">Expéditeur</th>
                  <th className="px-4 py-3 text-left">Lien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {req.nomDocument}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{req.montant}</td>
                    <td className="px-4 py-3 text-gray-700">{req.montantRetenu}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleString('fr-CA', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {req.processedAt
                        ? new Date(req.processedAt).toLocaleString('fr-CA', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {req.recipientEmail}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`${appUrl}/approval/${req.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gov-accent hover:underline text-xs font-medium"
                      >
                        Voir →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
