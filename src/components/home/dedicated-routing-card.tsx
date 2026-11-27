import { NetworkCheckRounded } from '@mui/icons-material'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { delayProxyByName } from 'tauri-plugin-mihomo-api'

import { useVerge } from '@/hooks/use-verge'

import { EnhancedCard } from './enhanced-card'

function RoutingRow({
  name,
  enabled,
  exit,
}: {
  name: string
  enabled: boolean
  exit: string
}) {
  const [result, setResult] = useState<string>('未检测')
  const [busy, setBusy] = useState(false)
  const check = async () => {
    setBusy(true)
    try {
      const response = await delayProxyByName(
        `${name}-Verge`,
        'https://www.gstatic.com/generate_204',
        5000,
      )
      setResult(response.delay > 0 ? `${response.delay} ms` : '检测失败')
    } catch {
      setResult('检测失败')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Box
      sx={{
        p: 1.25,
        mb: 1,
        bgcolor: 'var(--glass-muted)',
        borderRadius: 'var(--glass-radius-control)',
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        spacing={1}
      >
        <Typography variant="subtitle2">
          {name} · {enabled ? '已开启' : '未开启'}
        </Typography>
        <Button
          size="small"
          disabled={!enabled || busy}
          onClick={() => void check()}
        >
          {busy ? '检测中' : '检测'}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        当前出口：{exit || '未配置'}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        测试地址延迟：{enabled ? result : '未检测'} · 出口 IP：暂不支持
      </Typography>
    </Box>
  )
}

export function DedicatedRoutingCard() {
  const { verge } = useVerge()
  return (
    <EnhancedCard
      title="专用分流状态"
      icon={<NetworkCheckRounded />}
      iconColor="info"
    >
      {(['Claude', 'Codex'] as const).map((name) => {
        const routing =
          name === 'Claude' ? verge?.claude_routing : verge?.codex_routing
        return (
          <RoutingRow
            key={`${name}:${routing?.enabled}:${routing?.selected_exit}`}
            name={name}
            enabled={routing?.enabled ?? false}
            exit={routing?.selected_exit ?? ''}
          />
        )
      })}
    </EnhancedCard>
  )
}
