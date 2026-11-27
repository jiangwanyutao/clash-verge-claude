import type { BoxProps, SvgIconProps, TypographyProps } from '@mui/material'
import { Box, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  MemoryRounded,
} from '@/components/shared/lucide-icons'
import { LightweightTrafficErrorBoundary } from '@/components/shared/traffic-error-boundary'
import { useConnectionData } from '@/hooks/use-connection-data'
import { useMemoryData } from '@/hooks/use-memory-data'
import { useTrafficData } from '@/hooks/use-traffic-data'
import { useVerge } from '@/hooks/use-verge'
import { useVisibility } from '@/hooks/use-visibility'
import parseTraffic from '@/utils/parse-traffic'

import { routingSpeed, type RoutingSpeed } from './routing-speed'
import { TrafficGraph, type TrafficRef } from './traffic-graph'

export const LayoutTraffic = () => {
  const { t } = useTranslation()
  const { verge } = useVerge()

  const trafficGraph = verge?.traffic_graph ?? true
  const displayMemory = verge?.enable_memory_usage ?? true

  const trafficRef = useRef<TrafficRef>(null)
  const pageVisible = useVisibility()
  const routingEnabled = !!(
    verge?.claude_routing?.enabled || verge?.codex_routing?.enabled
  )
  const {
    response: { data: connections },
  } = useConnectionData({ enabled: pageVisible && routingEnabled })
  const latestRef = useRef<{ data: IConnectionsItem[]; at: number } | null>(
    null,
  )
  const initialConnectionsRef = useRef(connections)
  const [speeds, setSpeeds] = useState<RoutingSpeed | null>(null)

  useEffect(() => {
    if (connections !== initialConnectionsRef.current) {
      latestRef.current = {
        data: connections.activeConnections,
        at: performance.now(),
      }
    }
  }, [connections])

  useEffect(() => {
    let previous: typeof latestRef.current = null
    const timer = window.setInterval(() => {
      const current = latestRef.current
      if (
        !pageVisible ||
        !routingEnabled ||
        !current ||
        performance.now() - current.at > 4000
      ) {
        previous = null
        setSpeeds(null)
        return
      }
      if (previous && current.at !== previous.at) {
        setSpeeds(
          routingSpeed(previous.data, current.data, current.at - previous.at),
        )
      }
      previous = current
    }, 1000)
    return () => window.clearInterval(timer)
  }, [pageVisible, routingEnabled])

  const {
    response: { data: traffic },
    connected,
  } = useTrafficData({ enabled: pageVisible })
  const {
    response: { data: memory },
  } = useMemoryData({ enabled: displayMemory && pageVisible })

  useEffect(() => {
    if (trafficRef.current) {
      trafficRef.current.appendData({
        up: traffic?.up || 0,
        down: traffic?.down || 0,
        upTotal: traffic?.upTotal || 0,
        downTotal: traffic?.downTotal || 0,
      })
    }
  }, [traffic])

  const [up, upUnit] = parseTraffic(traffic?.up || 0)
  const [down, downUnit] = parseTraffic(traffic?.down || 0)
  const [inuse, inuseUnit] = parseTraffic(memory?.inuse || 0)

  const boxStyle: Pick<BoxProps, 'sx'> = {
    sx: {
      display: 'flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
    },
  }
  const iconStyle: Pick<SvgIconProps, 'sx'> = {
    sx: { mr: '8px', fontSize: 16 },
  }
  const valStyle: Pick<TypographyProps, 'component' | 'sx'> = {
    component: 'span',
    sx: {
      flex: '1 1 56px',
      userSelect: 'none',
      textAlign: 'center',
      fontVariantNumeric: 'tabular-nums',
    },
  }
  const unitStyle: Pick<TypographyProps, 'component' | 'color' | 'sx'> = {
    component: 'span',
    color: 'grey.500',
    sx: {
      flex: '0 1 27px',
      userSelect: 'none',
      fontSize: '12px',
      textAlign: 'right',
    },
  }

  const cardSx = {
    p: 1.5,
    bgcolor: 'var(--glass-bg-strong)',
    border: '1px solid var(--glass-edge)',
    borderRadius: 'var(--glass-radius-card)',
    boxShadow: 'var(--glass-card-shadow)',
  }

  return (
    <LightweightTrafficErrorBoundary>
      <Box
        className="glass-stagger"
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={cardSx}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              实时流量
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                className={connected ? 'glass-pulse' : undefined}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: connected ? 'success.main' : 'grey.500',
                  color: connected ? 'success.main' : 'grey.500',
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: connected ? 'success.main' : 'text.secondary' }}
              >
                {connected ? '流量连接正常' : '流量未连接'}
              </Typography>
            </Box>
          </Box>
          {trafficGraph && pageVisible && (
            <div
              style={{ width: '100%', height: 60, marginBottom: 6 }}
              onClick={trafficRef.current?.toggleStyle}
            >
              <TrafficGraph ref={trafficRef} />
            </div>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box
              title={`${t('home.components.traffic.metrics.uploadSpeed')}`}
              {...boxStyle}
              sx={{
                ...boxStyle.sx,
              }}
            >
              <ArrowUpwardRounded
                {...iconStyle}
                color={(traffic?.up || 0) > 0 ? 'secondary' : 'disabled'}
              />
              <Typography {...valStyle} color="secondary">
                {up}
              </Typography>
              <Typography {...unitStyle}>{upUnit}/s</Typography>
            </Box>

            <Box
              title={`${t('home.components.traffic.metrics.downloadSpeed')}`}
              {...boxStyle}
              sx={{
                ...boxStyle.sx,
              }}
            >
              <ArrowDownwardRounded
                {...iconStyle}
                color={(traffic?.down || 0) > 0 ? 'primary' : 'disabled'}
              />
              <Typography {...valStyle} color="primary">
                {down}
              </Typography>
              <Typography {...unitStyle}>{downUnit}/s</Typography>
            </Box>

            {displayMemory && (
              <Box
                title={`${t('home.components.traffic.metrics.memoryUsage')} `}
                {...boxStyle}
                sx={{
                  ...boxStyle.sx,
                  cursor: 'auto',
                }}
                color={'disabled'}
                onClick={async () => {}}
              >
                <MemoryRounded {...iconStyle} />
                <Typography {...valStyle}>{inuse}</Typography>
                <Typography {...unitStyle}>{inuseUnit}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {(['Claude', 'Codex'] as const).map((service) => {
          const routing =
            service === 'Claude' ? verge?.claude_routing : verge?.codex_routing
          const enabled = routing?.enabled
          const speed = enabled && pageVisible ? speeds?.[service] : null
          const format = (value: number) => `${parseTraffic(value).join(' ')}/s`
          return (
            <Box
              key={service}
              title={`当前出口：${routing?.selected_exit || '未配置'}。仅统计经过此专用分流组的活动连接；短连接及关闭时的尾流量可能未计入。`}
              sx={cardSx}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {service} 专用
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    className={enabled ? 'glass-pulse' : undefined}
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: enabled ? 'success.main' : 'grey.500',
                      color: enabled ? 'success.main' : 'grey.500',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: enabled ? 'success.main' : 'text.secondary',
                    }}
                  >
                    {enabled ? '已启用' : '未启用'}
                  </Typography>
                </Box>
              </Box>
              <Typography
                variant="caption"
                component="div"
                data-numeric
                sx={{
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  fontSize: '0.7rem',
                }}
              >
                ↑ {speed ? format(speed.up) : '—'} {' · '} ↓{' '}
                {speed ? format(speed.down) : '—'}
              </Typography>
            </Box>
          )
        })}
      </Box>
    </LightweightTrafficErrorBoundary>
  )
}
