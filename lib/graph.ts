const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const TOKEN_URL = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.AZURE_CLIENT_ID!,
    client_secret: process.env.AZURE_CLIENT_SECRET!,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph token error: ${err}`);
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function graphRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getGraphToken();
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph API ${path} → ${res.status}: ${err}`);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body: { content: string; contentType: string };
  from: { emailAddress: { address: string; name: string } };
  receivedDateTime: string;
  isRead: boolean;
}

const MAILBOX = process.env.GRAPH_MAILBOX ?? 'admin@dynamixmtl.com';

export async function getUnreadCreditRapideEmails(): Promise<GraphMessage[]> {
  const filter = encodeURIComponent(
    `subject eq 'CreditRapide' and isRead eq false`
  );
  const select = 'id,subject,body,bodyPreview,from,receivedDateTime,isRead';
  const data = await graphRequest<{ value: GraphMessage[] }>(
    `/users/${MAILBOX}/messages?$filter=${filter}&$select=${select}&$top=50`
  );
  const messages = data.value ?? [];
  return messages.sort(
    (a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
  );
}

export async function markAsRead(messageId: string): Promise<void> {
  await graphRequest(`/users/${MAILBOX}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true }),
  });
}

export async function sendMailViaGraph(params: {
  to: string;
  subject: string;
  htmlBody: string;
}): Promise<void> {
  await graphRequest(`/users/${MAILBOX}/sendMail`, {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject: params.subject,
        body: { contentType: 'HTML', content: params.htmlBody },
        toRecipients: [{ emailAddress: { address: params.to } }],
      },
      saveToSentItems: true,
    }),
  });
}
