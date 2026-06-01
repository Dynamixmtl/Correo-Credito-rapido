interface Props {
  params: Promise<{ action: string }>;
}

export default async function ConfirmationPage({ params }: Props) {
  const { action } = await params;
  const isApproved = action === 'approve';

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white rounded-xl shadow p-10 text-center">
      <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl
        ${isApproved ? 'bg-green-100' : 'bg-red-100'}`}>
        {isApproved ? '✓' : '✗'}
      </div>
      <h2 className={`text-2xl font-bold mb-3 ${isApproved ? 'text-gov-success' : 'text-gov-danger'}`}>
        {isApproved ? 'Demande approuvée' : 'Demande rejetée'}
      </h2>
      <p className="text-gray-500 text-base mb-6">
        {isApproved
          ? 'Votre décision d\'approbation a été enregistrée avec succès. L\'émetteur de la demande sera notifié.'
          : 'Votre décision de rejet a été enregistrée avec succès. L\'émetteur de la demande sera notifié.'}
      </p>
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-400">
        Vous pouvez fermer cette fenêtre.
      </div>
    </div>
  );
}
