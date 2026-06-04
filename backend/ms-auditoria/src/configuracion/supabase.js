const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('⚠️ [SUPABASE CONFIG]: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
        realtime: {
            transport: WebSocket
        }
    }
);

module.exports = supabase;
