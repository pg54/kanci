import fs from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://eejngwoigurlshprfhdd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlam5nd29pZ3VybHNocHJmaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg2MTA2MzksImV4cCI6MjA0NDE4NjYzOX0.lYyjyNrOUM3F8GH38BT_oodL82uhbJOCkL4KQSyPu4g'
const supabase = createClient(supabaseUrl, supabaseKey)

async function readSrtFile(filename) {
  try {
    const content = await fs.readFile(`./${filename}`, 'utf-8')
    return content
  }
  catch (error) {
    console.error(`Error reading ${filename}:`, error)
    return ''
  }
}

async function main() {
  const srtContent02 = await readSrtFile('SHDBZ S01E02.srt')
  const srtContent03 = await readSrtFile('SHDBZ S01E03.srt')

  // Query all records with status 1
  const { data, error } = await supabase
    .from('word')
    .select('*')

  if (error) {
    console.error('Supabase error:', error)
    return
  }

  if (data && data.length > 0) {
    for (const record of data) {
      // Update series_name and status
      record.series_name = 'TBBT'
      record.status = 3

      // Update episode
      if (srtContent02.includes(record.sentence)) {
        record.episode = 'S01E02'
      }
      else if (srtContent03.includes(record.sentence)) {
        record.episode = 'S01E03'
      }

      // Update the record
      const { data: updatedData, error: updateError } = await supabase
        .from('word')
        .update(record)
        .eq('id', record.id)

      if (updateError) {
        console.error('Update error for record', record.id, ':', updateError)
      }
      else {
        console.log('Updated record:', updatedData)
      }
    }
  }
  else {
    console.log('No records found')
  }
}

main()
