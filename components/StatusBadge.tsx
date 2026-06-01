import { RequestStatus } from '@/types';

const config: Record<RequestStatus, { label: string; className: string }> = {
  pending: {
    label: 'En attente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  approved: {
    label: 'Approuvée',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  rejected: {
    label: 'Rejetée',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = config[status];
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${className}`}
    >
      {label}
    </span>
  );
}
