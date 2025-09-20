// deno-lint-ignore-file no-explicit-any
// Edge Function: send-push
// Envia uma Web Push lendo o campo profiles.push_subscription do usuário autenticado

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails('mailto:admin@financeapp.local', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  title?: string;
  body?: string;
  url?: string;
  userId?: string; // opcional, caso deseje enviar para outro usuário (admin)
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const [type, token] = auth.split(' ');
  if (type?.toLowerCase() !== 'bearer') return null;
  return token || null;
}

async function getAuthedUserId(req: Request): Promise<string | null> {
  try {
    const token = getBearerToken(req);
    if (!token) return null;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

async function getPushSubscription(userId: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('profiles')
    .select('push_subscription')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data?.push_subscription as any | null;
}

async function sendToSubscription(subscription: any, payload: any) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders } });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const authUserId = await getAuthedUserId(req);
    const targetUserId = body.userId || authUserId;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'not_authenticated' }), {
        status: 401,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    const subscription = await getPushSubscription(targetUserId);
    if (!subscription) {
      return new Response(JSON.stringify({ error: 'no_subscription' }), {
        status: 404,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    const payload = {
      title: body.title || 'FinanceApp',
      body: body.body || 'Você tem uma nova notificação.',
      url: body.url || '/',
    };

    const result = await sendToSubscription(subscription, payload);
    if (!result.ok) {
      return new Response(JSON.stringify({ error: 'send_failed', detail: result.error }), {
        status: 500,
        headers: { 'content-type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal_error', detail: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders },
    });
  }
});



