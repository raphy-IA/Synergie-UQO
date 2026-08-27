import nodemailer from 'nodemailer';

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || 'Synergie UQO <synergie.uqo@gmail.com>';

  // Check if credentials are placeholders or not defined
  if (!host || host.includes('placeholder') || !user || user.includes('placeholder')) {
    console.log('✉️ [SMTP-Console] Envoi de courriel simulé :');
    console.log(`   Destinataire : ${to}`);
    console.log(`   Sujet        : ${subject}`);
    console.log(`   Contenu HTML :`);
    console.log(html);
    return { success: true, logged: true };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur SMTP Nodemailer :', error);
    throw error;
  }
}
