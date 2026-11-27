import {
  Alert,
  Avatar,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useLockFn } from 'ahooks'
import { useRef, useState } from 'react'

import { BaseDialog } from '@/components/base'
import { routingTraffic } from '@/components/rule/routing-traffic'
import { useVerge } from '@/hooks/use-verge'
import { showNotice } from '@/services/notice-service'
import parseTraffic from '@/utils/parse-traffic'

import { addSnapshotNodes, importClaudeRouting } from './claude-routing-import'

type Routing = Required<NonNullable<IVergeConfig['claude_routing']>>

const formatBytes = (bytes: number) => parseTraffic(bytes).join(' ')

const EMPTY_CONNECTIONS: IConnectionsItem[] = []

export function ClaudeRoutingPanel({
  mode,
  service = 'Claude',
  variant = 'compact',
  connections = EMPTY_CONNECTIONS,
}: {
  mode: string
  service?: 'Claude' | 'Codex'
  variant?: 'compact' | 'full'
  connections?: IConnectionsItem[]
}) {
  const { verge, patchVerge } = useVerge()
  const current =
    service === 'Claude' ? verge?.claude_routing : verge?.codex_routing
  const routing: Routing = {
    enabled: current?.enabled ?? false,
    selected_exit: current?.selected_exit ?? '',
    configuration: current?.configuration ?? '',
    exit_names: current?.exit_names ?? [],
  }
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [configuration, setConfiguration] = useState('')
  const [exits, setExits] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const snapshotRef = useRef<HTMLInputElement>(null)

  const save = useLockFn(async (next: Routing) => {
    setBusy(true)
    try {
      await patchVerge(
        service === 'Claude'
          ? { claude_routing: next }
          : { codex_routing: next },
      )
      return true
    } catch (failure) {
      showNotice.error(failure)
      return false
    } finally {
      setBusy(false)
    }
  })

  const configure = () => {
    setConfiguration(routing.configuration)
    setExits(routing.exit_names.join('\n'))
    setError('')
    setOpen(true)
  }

  const importText = (source: string) => {
    try {
      const imported = importClaudeRouting(source, service)
      setConfiguration(imported.configuration)
      setExits(imported.exit_names.join('\n'))
      setError('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '导入失败。')
    }
  }

  const saveConfiguration = async () => {
    const exitNames = exits
      .split('\n')
      .map((name) => name.trim())
      .filter(Boolean)
    if (!exitNames.length) {
      setError('请至少填写一个出口名称。')
      return
    }
    const selected = exitNames.includes(routing.selected_exit)
      ? routing.selected_exit
      : exitNames[0]
    if (
      await save({
        ...routing,
        configuration,
        exit_names: exitNames,
        selected_exit: selected,
      })
    ) {
      setOpen(false)
    }
  }

  const isFull = variant === 'full'
  const traffic = routingTraffic(connections, `${service}-Verge`)
  const selectedExit = routing.exit_names.includes(routing.selected_exit)
    ? routing.selected_exit
    : ''

  const exitSelect = (
    <TextField
      select
      size="small"
      label="出口节点"
      value={selectedExit}
      disabled={busy || !routing.exit_names.length}
      sx={{ flex: 1, minWidth: 0 }}
      onChange={(event) => {
        void save({ ...routing, selected_exit: event.target.value })
      }}
    >
      {routing.exit_names.map((name) => (
        <MenuItem key={name} value={name}>
          {name}
        </MenuItem>
      ))}
    </TextField>
  )

  const statusText = !routing.exit_names.length
    ? '尚未配置出口，请先选择“配置出口”。'
    : routing.enabled
      ? '保护已开启；出口不可用时，专用请求将被阻断。'
      : `专用分流已关闭，${service} 跟随当前订阅规则。出口配置仍然保留。`

  const statBox = (label: string, value: string, accent?: string) => (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        p: 1,
        borderRadius: 'var(--glass-radius-control)',
        bgcolor: 'var(--glass-muted)',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: accent,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Box>
  )

  return (
    <Box
      sx={{
        p: isFull ? 2 : 1.5,
        bgcolor: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-edge)',
        borderRadius: 'var(--glass-radius-card)',
        boxShadow: 'var(--glass-card-shadow)',
      }}
    >
      {isFull ? (
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'var(--glass-muted)',
              color: 'primary.main',
              fontWeight: 700,
              border: '1px solid var(--glass-edge)',
            }}
          >
            {service[0]}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {service}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              策略组 {service}-Verge · {routing.exit_names.length} 个可选出口
            </Typography>
          </Box>
          <Switch
            checked={routing.enabled}
            disabled={busy || !verge || !routing.exit_names.length}
            onChange={(_, enabled) => {
              void save({ ...routing, enabled })
            }}
          />
        </Stack>
      ) : (
        <Stack
          direction="row"
          spacing={1.5}
          useFlexGap
          sx={{ alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}
        >
          <FormControlLabel
            label={`${service} 专用分流`}
            control={
              <Switch
                checked={routing.enabled}
                disabled={busy || !verge || !routing.exit_names.length}
                onChange={(_, enabled) => {
                  void save({ ...routing, enabled })
                }}
              />
            }
          />
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', mt: isFull ? 0 : 1 }}
      >
        {exitSelect}
        <Button
          variant="outlined"
          disabled={busy || !verge}
          onClick={configure}
          sx={{ flexShrink: 0 }}
        >
          配置出口
        </Button>
      </Stack>

      {isFull && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          {statBox('活动连接', `${traffic.count}`)}
          {statBox(
            '实时流量',
            `↑${formatBytes(traffic.upload)} ↓${formatBytes(traffic.download)}`,
          )}
          {statBox(
            '防泄漏',
            routing.enabled ? '已保护' : '未开启',
            routing.enabled ? 'success.main' : 'text.secondary',
          )}
        </Stack>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {statusText}
      </Typography>

      <Box
        component="details"
        sx={{ mt: 0.5, color: 'text.secondary', typography: 'body2' }}
      >
        <Box
          component="summary"
          sx={{ cursor: 'pointer', width: 'fit-content' }}
        >
          查看分流说明
        </Box>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          仅对经过本软件的流量生效；请设置应用代理或开启本软件系统代理。
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          开启专用分流并使用规则模式时，所选节点不可用会阻断专用请求，不自动直连或切换出口。请选择符合要求的固定节点以恢复连接。
        </Typography>
      </Box>
      {routing.enabled && mode !== 'rule' && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          当前不是规则模式，{service} 专用分流不会按规则生效。请先切换到“规则”。
        </Alert>
      )}
      <BaseDialog
        open={open}
        title={`${service} 出口配置`}
        okBtn="保存配置"
        cancelBtn="取消"
        loading={busy}
        disableCancel={busy}
        contentSx={{ width: { xs: 280, sm: 520 } }}
        onClose={() => {
          if (!busy) setOpen(false)
        }}
        onCancel={() => setOpen(false)}
        onOk={() => {
          void saveConfiguration()
        }}
      >
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">
            可导入原版运行配置中的 {service} 代理组，或粘贴出口
            YAML。专用出口须为固定节点，暂不支持由代理集合提供的动态节点、直连或自动切换组。
            密码和订阅地址只保存在本机，请勿公开分享。
          </Typography>
          <input
            ref={fileRef}
            type="file"
            accept=".yaml,.yml,.json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              if (file.size > 1024 * 1024) {
                setError('请选择小于 1 MB 的配置文件。')
                return
              }
              try {
                importText(await file.text())
              } catch {
                setError('无法读取配置文件。')
              }
            }}
          />
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            从 YAML 文件导入
          </Button>
          <Typography variant="body2">
            如果 VPS 使用动态订阅，可从其缓存的 YAML 文件添加固定节点快照。
            快照不会自动更新；订阅变更后需重新导入。请勿分享包含密码的文件。
          </Typography>
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            原版缓存目录：%APPDATA%\io.github.clash-verge-rev.clash-verge-rev\proxy_providers
          </Typography>
          <input
            ref={snapshotRef}
            type="file"
            accept=".yaml,.yml,.json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              if (file.size > 1024 * 1024) {
                setError('请选择小于 1 MB 的配置文件。')
                return
              }
              try {
                const result = addSnapshotNodes(
                  configuration,
                  await file.text(),
                )
                setConfiguration(result.configuration)
                setExits((previous) =>
                  [
                    ...previous
                      .split('\n')
                      .map((name) => name.trim())
                      .filter(Boolean),
                    ...result.names,
                  ].join('\n'),
                )
                setError('')
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : '无法读取配置文件。',
                )
              }
            }}
          />
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => snapshotRef.current?.click()}
          >
            添加订阅节点快照
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="出口配置 YAML"
            multiline
            minRows={8}
            maxRows={16}
            value={configuration}
            disabled={busy}
            onChange={(event) => setConfiguration(event.target.value)}
            slotProps={{
              input: { sx: { fontFamily: 'monospace', fontSize: 13 } },
            }}
          />
          <Button
            disabled={busy || !configuration.trim()}
            onClick={() => importText(configuration)}
          >
            提取出口并移除无关设置
          </Button>
          <TextField
            label="可选出口名称（每行一个）"
            helperText="填写上述固定节点或单节点代理组的名称，每行一个。"
            multiline
            minRows={2}
            value={exits}
            disabled={busy}
            onChange={(event) => setExits(event.target.value)}
          />
        </Stack>
      </BaseDialog>
    </Box>
  )
}
