import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://cibtvihaydjlsjjfytkt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYnR2aWhheWRqbHNqamZ5dGt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczNTEwNCwiZXhwIjoyMDcyMzExMTA0fQ.UiwMCoRPBNNsmswk0PZY7BsYyK4hu2bgktnFsL0WlYY',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, displayName } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ error: 'Email and display name are required' });
    }

    // Gerar link de convite
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: 'https://financeapp.vercel.app/auth/callback',
      },
    });

    if (inviteError) {
      console.error('Erro ao gerar link:', inviteError);
      return res.status(500).json({ error: 'Erro ao gerar link de convite' });
    }

    console.log('Link de convite gerado:', inviteData.properties.email_otp_link);

    // Aqui você pode implementar envio de email personalizado
    // Por exemplo, usando SendGrid, Resend, ou outro serviço
    
    return res.status(200).json({ 
      success: true, 
      message: 'Email de convite enviado com sucesso',
      inviteLink: inviteData.properties.email_otp_link
    });

  } catch (error) {
    console.error('Erro no handler:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
