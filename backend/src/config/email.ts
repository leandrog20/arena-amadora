import { env } from './env'

/**
 * Serviço de e-mail usando Resend (https://resend.com).
 * Funciona em produção com API key real; em dev loga no console.
 */

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  // Em dev sem API key, apenas loga
  if (!env.RESEND_API_KEY) {
    console.log(`📧 [DEV] Email para ${options.to}:`)
    console.log(`   Assunto: ${options.subject}`)
    console.log(`   HTML: ${options.html.substring(0, 200)}...`)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Erro ao enviar email:', error)
    throw new Error(`Falha ao enviar email: ${response.status}`)
  }
}

export function buildPasswordResetEmail(resetLink: string): { subject: string; html: string } {
  return {
    subject: 'Arena Amadora — Recuperar Senha',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #7c3aed;">Arena Amadora</h2>
        <p>Você solicitou a recuperação de senha.</p>
        <p>Clique no botão abaixo para redefinir sua senha. Este link expira em 15 minutos.</p>
        <a href="${resetLink}"
           style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Redefinir Senha
        </a>
        <p style="color: #666; font-size: 14px;">Se você não solicitou esta alteração, ignore este email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Arena Amadora — Plataforma de Torneios</p>
      </div>
    `,
  }
}
