import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// Generic hook for fetching data from Supabase
export function useSupabase(table, options = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { select = '*', orderBy = 'created_at', ascending = false, filters = [], limit } = options

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from(table).select(select)
      filters.forEach(f => {
        if (f.op === 'eq') query = query.eq(f.col, f.val)
        else if (f.op === 'ilike') query = query.ilike(f.col, f.val)
        else if (f.op === 'gte') query = query.gte(f.col, f.val)
        else if (f.op === 'lte') query = query.lte(f.col, f.val)
        else if (f.op === 'in') query = query.in(f.col, f.val)
      })
      if (orderBy) query = query.order(orderBy, { ascending })
      if (limit) query = query.limit(limit)
      const { data: result, error: err } = await query
      if (err) throw err
      setData(result || [])
    } catch (e) {
      setError(e.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [table, select, orderBy, ascending, JSON.stringify(filters), limit])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch, setData }
}

// Insert
export async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select()
  if (error) throw error
  return data[0]
}

// Update
export async function updateRow(table, id, updates) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select()
  if (error) throw error
  return data[0]
}

// Delete
export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// Bulk insert
export async function bulkInsert(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select()
  if (error) throw error
  return data
}

// Format number with commas (Thai style)
export function fmt(n, decimals = 0) {
  if (n == null) return '-'
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Format date
export function fmtDate(d, lang = 'th') {
  if (!d) return '-'
  const dt = new Date(d)
  if (lang === 'th') {
    return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()+543}`
  }
  return dt.toLocaleDateString('en-GB')
}
