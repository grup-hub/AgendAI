// Configuração centralizada do Supabase
// Usa env vars quando disponíveis, com fallback para valores padrão
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const SUPABASE_URL = (url && url.startsWith('http')) ? url : 'https://wlmhtuqbzyethknlggwg.supabase.co'
export const SUPABASE_ANON_KEY = (anonKey && anonKey.startsWith('eyJ')) ? anonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbWh0dXFienlldGhrbmxnZ3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODU5MDYsImV4cCI6MjA4NDg2MTkwNn0.fW_XUljx6Ah4X4mcojv8DV2S5a4OCHc6vMbmuxWKdvE'
export const SUPABASE_SERVICE_ROLE_KEY = (serviceKey && serviceKey.startsWith('eyJ')) ? serviceKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbWh0dXFienlldGhrbmxnZ3dnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI4NTkwNiwiZXhwIjoyMDg0ODYxOTA2fQ.JtIBCauVIDPzYiWJCJSWA96NuTjIZmcD_A87rxpr-jM'
