import { NextRequest, NextResponse } from 'next/server';
import { createRequest } from '@/lib/storage';

// Called by Power Automate when a CreditRapide email is received.
// Body: { nomDocument, montant, montantRetenu, recipientEmail }
// Header: x-api-key: <API_SECRET_KEY>
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== process.env.API_SECRET_KEY) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const { nomDocument, montant, montantRetenu, recipientEmail } = body;

  if (!nomDocument || !montant || !montantRetenu) {
    return NextResponse.json(
      { error: 'Champs requis manquants: nomDocument, montant, montantRetenu' },
      { status: 400 }
    );
  }

  const creditRequest = await createRequest({
    nomDocument,
    montant,
    montantRetenu,
    recipientEmail: recipientEmail || process.env.NOTIFICATION_RECIPIENT || '',
  });

  const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/approval/${creditRequest.id}`;

  return NextResponse.json({ id: creditRequest.id, approvalUrl }, { status: 201 });
}
