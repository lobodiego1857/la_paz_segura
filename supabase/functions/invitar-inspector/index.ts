import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function respuesta(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respuesta({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !serviceRoleKey || !anonKey || !authorization) {
    return respuesta({ error: 'La función no está configurada o falta la sesión.' }, 500)
  }

  const clienteSesion = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: errorUsuario } = await clienteSesion.auth.getUser()
  if (errorUsuario || !user) return respuesta({ error: 'Sesión no válida.' }, 401)

  const clienteAdmin = createClient(supabaseUrl, serviceRoleKey)
  const { data: perfil, error: errorPerfil } = await clienteAdmin
    .from('perfiles')
    .select('rol, activo')
    .eq('id_usuario', user.id)
    .single()
  if (errorPerfil || perfil?.rol !== 'administrador' || perfil.activo !== true) {
    return respuesta({ error: 'Solo un Administrador activo puede invitar inspectores.' }, 403)
  }

  const cuerpo = await request.json().catch(() => null) as { correo?: unknown } | null
  const correo = typeof cuerpo?.correo === 'string' ? cuerpo.correo.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return respuesta({ error: 'Ingresa un correo electrónico válido.' }, 400)
  }

  const { error } = await clienteAdmin.auth.admin.inviteUserByEmail(correo)
  if (error) return respuesta({ error: `No se pudo enviar la invitación: ${error.message}` }, 400)
  return respuesta({ mensaje: 'Invitación enviada. El perfil queda como Inspector pendiente de activación.' })
})
