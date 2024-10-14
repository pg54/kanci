import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eejngwoigurlshprfhdd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam5nd29pZ3VybHNocHJmaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg2MTA2MzksImV4cCI6MjA0NDE4NjYzOX0.lYyjyNrOUM3F8GH38BT_oodL82uhbJOCkL4KQSyPu4g'
const supabase = createClient(supabaseUrl, supabaseKey)
export default supabase
