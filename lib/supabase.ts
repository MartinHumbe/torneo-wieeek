import { createClient } from '@supabase/supabase-js';

// Pega tu URL y Key reales directamente entre las comillas simples
const supabaseUrl = 'https://slndtzmwoijunqxgiyli.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsbmR0em13b2lqdW5xeGdpeWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NjIwODcsImV4cCI6MjEwNzQzODA4N30.PNGdVEAgDB-zvLJP5fEmTGA5DEL0Y0SWCjbwjW_4SBg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);