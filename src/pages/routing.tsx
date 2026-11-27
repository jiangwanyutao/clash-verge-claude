import { Box, Typography } from '@mui/material'

import { BasePage } from '@/components/base'
import { ClaudeRoutingPanel } from '@/components/proxy/claude-routing-panel'
import { useConnectionData } from '@/hooks/use-connection-data'
import { useClashConfigData } from '@/providers/app-data-context'

const RoutingPage = () => {
  const { clashConfig } = useClashConfigData()
  const mode = clashConfig?.mode?.toLowerCase() ?? 'rule'
  const { response } = useConnectionData({ enabled: true })
  const connections = response.data.activeConnections

  return (
    <Box
      sx={{
        height: '100%',
        '& .base-container, & .base-container > section': {
          backgroundColor: 'transparent !important',
        },
      }}
    >
      <BasePage
        full
        title="专用分流"
        contentStyle={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mx: '10px', mt: 0.5, mb: 1.5 }}
        >
          为 Claude、Codex 等 AI 服务指定独立出口，避免与常规流量混用节点。
        </Typography>
        <Box
          className="glass-stagger"
          sx={{
            mx: '10px',
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
            },
          }}
        >
          <ClaudeRoutingPanel
            mode={mode}
            service="Claude"
            variant="full"
            connections={connections}
          />
          <ClaudeRoutingPanel
            mode={mode}
            service="Codex"
            variant="full"
            connections={connections}
          />
        </Box>
      </BasePage>
    </Box>
  )
}

export default RoutingPage
