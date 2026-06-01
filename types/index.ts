export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface CreditRequest {
  id: string;
  nomDocument: string;
  montant: string;
  montantRetenu: string;
  status: RequestStatus;
  createdAt: string;
  processedAt?: string;
  recipientEmail: string;
}
