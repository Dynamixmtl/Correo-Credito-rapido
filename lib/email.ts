import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_FROM,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: { ciphers: 'SSLv3' },
  });
}

export async function sendApprovalLinkEmail(params: {
  to: string;
  approvalUrl: string;
  nomDocument: string;
  montant: string;
  montantRetenu: string;
}): Promise<void> {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"CreditRapide" <${process.env.EMAIL_FROM}>`,
    to: params.to,
    subject: `CreditRapide – Lien d'approbation: ${params.nomDocument}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#1a3a5c;padding:24px 32px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Demande d'approbation de crédit</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#333;margin-top:0;">Une nouvelle demande de crédit requiert votre approbation :</p>
          <table style="border-collapse:collapse;width:100%;margin:20px 0;">
            <tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f0f4f8;font-weight:bold;width:50%;">Nom du document</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${params.nomDocument}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f0f4f8;font-weight:bold;">Montant</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${params.montant}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f0f4f8;font-weight:bold;">Montant retenu</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${params.montantRetenu}</td>
            </tr>
          </table>
          <a href="${params.approvalUrl}"
             style="display:inline-block;padding:14px 28px;background:#0078d4;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;margin-top:8px;">
            Accéder au formulaire d'approbation →
          </a>
          <p style="margin-top:24px;color:#666;font-size:12px;border-top:1px solid #eee;padding-top:16px;">
            Ce lien est unique et sécurisé. Il ne peut être utilisé qu'une seule fois.<br>
            Notification automatique – Système CreditRapide
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendDecisionNotification(params: {
  to: string;
  nomDocument: string;
  status: 'approved' | 'rejected';
  montant: string;
  montantRetenu: string;
}): Promise<void> {
  const transporter = createTransporter();
  const isApproved = params.status === 'approved';
  const label = isApproved ? 'APPROUVÉE' : 'REJETÉE';
  const color = isApproved ? '#107c10' : '#d13438';

  await transporter.sendMail({
    from: `"CreditRapide" <${process.env.EMAIL_FROM}>`,
    to: params.to,
    subject: `CreditRapide – Décision [${label}]: ${params.nomDocument}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#1a3a5c;padding:24px 32px;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Décision de demande de crédit</h1>
        </div>
        <div style="padding:32px;">
          <div style="background:${isApproved ? '#f0fff0' : '#fff0f0'};border-left:4px solid ${color};padding:16px;margin-bottom:24px;">
            <p style="margin:0;color:${color};font-weight:bold;font-size:18px;">
              La demande a été ${isApproved ? 'APPROUVÉE' : 'REJETÉE'}
            </p>
          </div>
          <table style="border-collapse:collapse;width:100%;margin:20px 0;">
            <tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f0f4f8;font-weight:bold;width:50%;">Nom du document</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${params.nomDocument}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f0f4f8;font-weight:bold;">Montant</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${params.montant}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border:1px solid #ddd;background:#f0f4f8;font-weight:bold;">Montant retenu</td>
              <td style="padding:10px 12px;border:1px solid #ddd;">${params.montantRetenu}</td>
            </tr>
          </table>
          <p style="margin-top:24px;color:#666;font-size:12px;border-top:1px solid #eee;padding-top:16px;">
            Notification automatique – Système CreditRapide
          </p>
        </div>
      </div>
    `,
  });
}
