import "server-only";

// Compatibilidad temporal para cualquier importación antigua. La clave de
// servicio vive únicamente en el módulo server-only canónico.
export { supabaseAdmin } from "@/utils/supabase/admin";
