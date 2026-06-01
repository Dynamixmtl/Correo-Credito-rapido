'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  requestId: string;
}

type DecisionState = 'idle' | 'loading' | 'error';

export function ApprovalForm({ requestId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<DecisionState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleDecision(action: 'approve' | 'reject') {
    setState('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Une erreur est survenue.');
      }
      router.push(`/confirmation/${action}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setState('error');
    }
  }

  const isLoading = state === 'loading';

  return (
    <div>
      <div className="border-t border-gray-200 pt-6">
        <p className="text-sm font-semibold text-gray-600 mb-4">Votre décision :</p>
        <div className="flex gap-4">
          <button
            onClick={() => handleDecision('approve')}
            disabled={isLoading}
            className="flex-1 py-3 px-6 rounded-lg bg-gov-success text-white font-bold text-base
                       hover:bg-green-700 active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {isLoading ? 'Traitement…' : 'Approuver'}
          </button>
          <button
            onClick={() => handleDecision('reject')}
            disabled={isLoading}
            className="flex-1 py-3 px-6 rounded-lg bg-gov-danger text-white font-bold text-base
                       hover:bg-red-700 active:scale-95 transition-all duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {isLoading ? 'Traitement…' : 'Rejeter'}
          </button>
        </div>
        {state === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Cette action est définitive et ne peut pas être annulée.
        </p>
      </div>
    </div>
  );
}
