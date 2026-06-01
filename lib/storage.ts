import { TableClient } from '@azure/data-tables';
import { v4 as uuidv4 } from 'uuid';
import { CreditRequest, RequestStatus } from '@/types';

const TABLE_NAME = 'CreditRapideRequests';

function getClient(): TableClient {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error('AZURE_STORAGE_CONNECTION_STRING manquant');
  return TableClient.fromConnectionString(conn, TABLE_NAME);
}

export async function ensureTable(): Promise<void> {
  const client = getClient();
  await client.createTable().catch(() => {});
}

export async function createRequest(data: {
  nomDocument: string;
  montant: string;
  montantRetenu: string;
  recipientEmail: string;
}): Promise<CreditRequest> {
  const client = getClient();
  await ensureTable();

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  await client.createEntity({
    partitionKey: 'requests',
    rowKey: id,
    nomDocument: data.nomDocument,
    montant: data.montant,
    montantRetenu: data.montantRetenu,
    status: 'pending',
    createdAt,
    recipientEmail: data.recipientEmail,
  });

  return {
    id,
    nomDocument: data.nomDocument,
    montant: data.montant,
    montantRetenu: data.montantRetenu,
    status: 'pending',
    createdAt,
    recipientEmail: data.recipientEmail,
  };
}

export async function getRequest(id: string): Promise<CreditRequest | null> {
  try {
    const client = getClient();
    const entity = await client.getEntity('requests', id);
    return {
      id: entity.rowKey as string,
      nomDocument: entity.nomDocument as string,
      montant: entity.montant as string,
      montantRetenu: entity.montantRetenu as string,
      status: entity.status as RequestStatus,
      createdAt: entity.createdAt as string,
      processedAt: entity.processedAt as string | undefined,
      recipientEmail: entity.recipientEmail as string,
    };
  } catch {
    return null;
  }
}

export async function updateStatus(
  id: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const client = getClient();
  await client.updateEntity(
    {
      partitionKey: 'requests',
      rowKey: id,
      status,
      processedAt: new Date().toISOString(),
    },
    'Merge'
  );
}
