import { Box, Paper, Stack, Typography } from '@mui/material'

import { useConnectionData } from '@/hooks/use-connection-data'
import parseTraffic from '@/utils/parse-traffic'

// eslint-disable-next-line react-refresh/only-export-components
export function routingTraffic(connections: IConnectionsItem[], group: string) {
  return connections.reduce(
    (total, connection) => {
      if (connection.chains?.includes(group)) {
        total.count += 1
        total.upload += connection.upload
        total.download += connection.download
      }
      return total
    },
    { count: 0, upload: 0, download: 0 },
  )
}

const formatBytes = (bytes: number) => parseTraffic(bytes).join(' ')

export function RoutingTraffic({ enabled }: { enabled: boolean }) {
  const { response } = useConnectionData({ enabled })
  const connections = response.data.activeConnections

  return (
    <Paper
      variant="outlined"
      sx={{
        mx: '10px',
        p: 1.5,
        bgcolor: 'var(--glass-bg-strong)',
        borderColor: 'var(--glass-edge)',
        borderRadius: 'var(--glass-radius-card)',
        boxShadow: 'var(--glass-card-shadow)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <Typography variant="subtitle2">专用分流流量</Typography>
      <Typography variant="caption" color="text.secondary">
        仅统计当前经过专用代理组的活动连接，连接关闭后不再计入；不是历史总量。
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
        {['Claude', 'Codex'].map((service) => {
          const total = routingTraffic(connections, `${service}-Verge`)
          return (
            <Box
              key={service}
              sx={{
                flex: 1,
                p: 1,
                borderRadius: 'var(--glass-radius-control)',
                bgcolor: 'var(--glass-muted)',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {service} · {total.count} 个活动连接
              </Typography>
              <Typography variant="body2" color="text.secondary">
                上传 {formatBytes(total.upload)} · 下载{' '}
                {formatBytes(total.download)}
              </Typography>
            </Box>
          )
        })}
      </Stack>
    </Paper>
  )
}
