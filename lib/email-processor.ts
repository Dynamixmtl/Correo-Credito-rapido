import { getUnreadCreditRapideEmails, markAsRead, sendMailViaGraph } from './graph';
import { createRequest } from './storage';

export async function processIncomingEmails(): Promise<void> {
  let emails;
  try {
    emails = await getUnreadCreditRapideEmails();
  } catch (err) {
    console.error('[email-processor] Failed to fetch emails:', err);
    return;
  }

  for (const email of emails) {
    const senderAddress = email.from?.emailAddress?.address ?? '';

    if (!senderAddress.toLowerCase().endsWith('@csdm.qc.ca')) {
      await markAsRead(email.id).catch(() => {});
      continue;
    }

    const rawBody = email.body?.contentType === 'html'
      ? email.body.content.replace(/<[^>]+>/g, '').trim()
      : (email.body?.content ?? email.bodyPreview ?? '').trim();

    const cleanBody = rawBody.replace(/\s+/g, '').trim();
    const parts = cleanBody.split(';');

    if (parts.length < 3) {
      console.warn(`[email-processor] Skipping email ${email.id}: body has ${parts.length} parts, expected 3`);
      await markAsRead(email.id).catch(() => {});
      continue;
    }

    const [nomDocument, montant, montantRetenu] = parts;

    try {
      const creditRequest = await createRequest({
        nomDocument,
        montant,
        montantRetenu,
        recipientEmail: senderAddress,
        senderEmail: senderAddress,
      });

      const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/approval/${creditRequest.id}`;

      await sendMailViaGraph({
        to: senderAddress,
        subject: `CreditRapide – Lien d'approbation : ${nomDocument}`,
        htmlBody: `
          <p>Bonjour,</p>
          <p>Votre demande de crédit rapide a été reçue. Veuillez transmettre ce lien au fournisseur :</p>
          <p><a href="${approvalUrl}">Accéder au formulaire d'approbation</a></p>
          <p><strong>Détails de la demande :</strong><br>
          - Nom du document : ${nomDocument}<br>
          - Montant : ${montant}<br>
          - Montant retenu : ${montantRetenu}</p>
          <p>Ce lien est à usage unique. Une fois la décision prise, vous recevrez une notification.</p>
        `,
      });

      await markAsRead(email.id);
      console.log(`[email-processor] Processed email ${email.id} → request ${creditRequest.id}`);
    } catch (err) {
      console.error(`[email-processor] Error processing email ${email.id}:`, err);
    }
  }
}
