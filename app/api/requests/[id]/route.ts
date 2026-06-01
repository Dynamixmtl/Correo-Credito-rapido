import { NextRequest, NextResponse } from 'next/server';
import { getRequest } from '@/lib/storage';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const creditRequest = await getRequest(id);

  if (!creditRequest) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
  }

  return NextResponse.json(creditRequest);
}
