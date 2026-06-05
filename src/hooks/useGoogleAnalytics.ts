import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface GAStats {
  today: number
  yesterday: number
  last7Days: number
  last15Days: number
  last30Days: number
  last3Months: number
  last6Months: number
  last365Days: number
  allTime: number
}

export interface GAResponse {
  domestic?: GAStats
  international?: GAStats
}

export interface UseGoogleAnalyticsResult {
  data: GAResponse | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Google Analytics 통계를 조회하는 React Hook
 * @param region 조회할 지역 - 'domestic' (대한민국), 'international' (해외), 'both' (둘 다, 기본값)
 */
export function useGoogleAnalytics(
  region: 'domestic' | 'international' | 'both' = 'both'
): UseGoogleAnalyticsResult {
  const [data, setData] = useState<GAResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      // URL에 region 파라미터 추가
      const url = `get-ga-stats?region=${region}`

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        url,
        {
          method: 'GET',
        }
      )

      if (functionError) {
        throw new Error(functionError.message)
      }

      if (!functionData) {
        throw new Error('No data returned from function')
      }

      if (functionData.success) {
        setData(functionData.data)
      } else {
        throw new Error(functionData.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Analytics fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [region])

  return { data, loading, error, refetch: fetchStats }
}
