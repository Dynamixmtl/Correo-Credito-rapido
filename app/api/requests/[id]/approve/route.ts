import { NextRequest, NextResponse } from 'next/server';
import { getRequest, updateStatus } from '@/lib/storage';
import { sendDecisionNotification } from '@/lib/email';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const creditRequest = await getRequest(id);

  if (!creditRequest) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  if (creditRequest.status !== 'pending') {
    return NextResponse.json(
      { error: 'Cette demande a déjà été traitée' },
      { status: 409 }
    );
  }

  await updateStatus(id, 'approved');

  await sendDecisionNotification({
    to: creditRequest.recipientEmail,
    nomDocument: creditRequest.nomDocument,
    montant: creditRequest.montant,
    montantRetenu: creditRequest.montantRetenu,
    status: 'approved',
  });

  return NextResponse.json({ success: true, status: 'approved' });
}
