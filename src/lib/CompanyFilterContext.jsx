import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './supabase'

const CompanyFilterContext = createContext({})

export function CompanyFilterProvider({ children }) {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_companies')
        .select('id, code, name_th, name_en, is_active')
        .order('code')
      if (error) throw error
      setCompanies(data || [])
    } catch (err) {
      console.error('Error fetching companies:', err)
    } finally {
      setLoading(false)
    }
  }

  // Only active companies appear in filter dropdown (memoized for stable reference)
  const activeCompanies = useMemo(() => companies.filter(c => c.is_active !== false), [companies])

  // Stable set of active codes for filtering
  const activeCodes = useMemo(() => new Set(activeCompanies.map(c => c.code)), [activeCompanies])

  // A version counter that changes when filter-relevant state changes
  // Pages include this in their useMemo deps to re-filter when companies load or selection changes
  const filterVersion = useMemo(() => `${selectedCompany}-${[...activeCodes].join(',')}`, [selectedCompany, activeCodes])

  // Helper: client-side filter for data already fetched
  const filterByCompany = useCallback((items, companyField = 'company_entity') => {
    if (!items || items.length === 0) return items || []
    if (selectedCompany === 'all') {
      // If no companies loaded yet, return all items (don't filter out everything)
      if (activeCodes.size === 0) return items
      return items.filter(item => !item[companyField] || activeCodes.has(item[companyField]))
    }
    return items.filter(item => item[companyField] === selectedCompany)
  }, [selectedCompany, activeCodes])

  // Helper: filter related data by employee IDs from filtered employees
  const filterByEmployeeCompany = useCallback((items, employees, empIdField = 'employee_id') => {
    if (!items || !employees) return items || []
    const filteredEmpIds = new Set(filterByCompany(employees).map(e => e.id))
    return items.filter(item => filteredEmpIds.has(item[empIdField]))
  }, [filterByCompany])

  // Helper: add company filter to a Supabase query on hr_employees
  const applyCompanyFilter = useCallback((query, column = 'company_entity') => {
    if (selectedCompany === 'all') {
      const codes = [...activeCodes]
      if (codes.length > 0 && codes.length < companies.length) {
        return query.in(column, codes)
      }
      return query
    }
    return query.eq(column, selectedCompany)
  }, [selectedCompany, activeCodes, companies.length])

  const getFilterCodes = useCallback(() => {
    if (selectedCompany === 'all') return [...activeCodes]
    return [selectedCompany]
  }, [selectedCompany, activeCodes])

  const value = useMemo(() => ({
    companies,
    activeCompanies,
    selectedCompany,
    setSelectedCompany,
    getFilterCodes,
    applyCompanyFilter,
    filterByCompany,
    filterByEmployeeCompany,
    filterVersion,
    loading,
    refreshCompanies: fetchCompanies,
  }), [companies, activeCompanies, selectedCompany, getFilterCodes, applyCompanyFilter, filterByCompany, filterByEmployeeCompany, filterVersion, loading])

  return (
    <CompanyFilterContext.Provider value={value}>
      {children}
    </CompanyFilterContext.Provider>
  )
}

export function useCompanyFilter() {
  return useContext(CompanyFilterContext)
}
