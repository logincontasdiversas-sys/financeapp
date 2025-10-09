// 🎯 SOLUÇÃO DEFINITIVA - ADMIN API COM SERVICE ROLE
// Substitua o handleCreateUser em AdminUsersManagement.tsx

import { createClient } from '@supabase/supabase-js';

// Cliente admin com Service Role Key
const supabaseAdmin = createClient(
  'https://cibtvihaydjlsjjfytkt.supabase.co',
  'SUA_SERVICE_ROLE_KEY_AQUI', // Pegue em Supabase > Settings > API > Service Role
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const handleCreateUser = async (email: string, displayName: string, phone: string, isAdmin: boolean, accessType: string) => {
  try {
    console.log('[CREATE_USER] Iniciando criação:', { email, displayName, phone, isAdmin, accessType });

    // 1. Cria user via admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true, // Confirma email automaticamente
      user_metadata: { 
        display_name: displayName, 
        phone, 
        is_admin: isAdmin, 
        access_type: accessType 
      },
    });

    if (createError) {
      console.error('[CREATE_USER] Admin create error:', createError);
      return { success: false, message: 'Erro no admin create: ' + createError.message };
    }

    const userId = newUser.user.id;
    console.log('[CREATE_USER] User criado:', userId);

    // 2. UPSERT em profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId, // Corrigido: usar user_id em vez de id
        email,
        display_name: displayName,
        phone_number: phone,
        is_admin: isAdmin,
        access_type: accessType,
        whatsapp_active: false,
        role: isAdmin ? 'admin' : 'user',
        onboarding_done: false,
      });

    if (profileError) {
      console.error('[CREATE_USER] Profile upsert error:', profileError);
      // Rollback: Deleta do auth
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, message: 'Erro no profile: ' + profileError.message };
    }

    console.log('[CREATE_USER] Profile criado com sucesso');

    // 3. Manda email de invite via generateLink
    const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        emailRedirectTo: 'http://192.168.1.9:8080/auth/callback', // URL de confirmação
      },
    });

    if (inviteError) {
      console.warn('[CREATE_USER] Invite error (não crítico):', inviteError);
    } else {
      console.log('[CREATE_USER] Invite link gerado:', inviteLink.properties.email_otp_link);
    }

    console.log('[CREATE_USER] Sucesso completo:', userId);
    return { success: true, user: newUser.user };
  } catch (error) {
    console.error('[CREATE_USER] Geral error:', error);
    return { success: false, message: (error as Error).message };
  }
};

export default handleCreateUser;
