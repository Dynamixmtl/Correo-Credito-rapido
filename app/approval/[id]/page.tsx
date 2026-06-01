import { getRequest } from '@/lib/storage';
import { ApprovalForm } from '@/components/ApprovalForm';
import { StatusBadge } from '@/components/StatusBadge';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ApprovalPage({ params }: Props) {
  const { id } = await params;
  const request = await getRequest(id);

  if (!request) {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow p-8 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Demande introuvable</h2>
        <p className="text-gray-500">
          Ce lien est invalide ou a expiré. Veuillez contacter l&apos;émetteur de la demande.
        </p>
      </div>
    );
  }

  if (request.status !== 'pending') {
    return (
      <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow p-8">
        <h2 className="text-xl font-bold text-gray-700 mb-6">Détails de la demande</h2>
        <RequestDetails
          nomDocument={request.nomDocument}
          montant={request.montant}
          montantRetenu={request.montantRetenu}
        />
        <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Statut de la décision :</p>
          <StatusBadge status={request.status} />
          {request.processedAt && (
            <p className="text-xs text-gray-400 mt-2">
              Traitée le{' '}
              {new Date(request.processedAt).toLocaleString('fr-CA', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow p-8">
      <h2 className="text-xl font-bold text-gov-blue mb-2">
        Formulaire d&apos;approbation
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Veuillez examiner les détails ci-dessous et prendre votre décision.
      </p>
      <RequestDetails
        nomDocument={request.nomDocument}
        montant={request.montant}
        montantRetenu={request.montantRetenu}
      />
      <ApprovalForm requestId={request.id} />
    </div>
  );
}

function RequestDetails({
  nomDocument,
  montant,
  montantRetenu,
}: {
  nomDocument: string;
  montant: string;
  montantRetenu: string;
}) {
  const rows = [
    { label: 'Nom du document', value: nomDocument },
    { label: 'Montant', value: montant },
    { label: 'Montant retenu', value: montantRetenu },
  ];

  return (
    <table className="w-full border-collapse mb-6">
      <tbody>
        {rows.map(({ label, value }) => (
          <tr key={label}>
            <td className="py-3 px-4 bg-gov-light border border-gray-200 font-semibold text-gov-blue w-1/2 text-sm">
              {label}
            </td>
            <td className="py-3 px-4 border border-gray-200 text-gray-800 text-sm">
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
