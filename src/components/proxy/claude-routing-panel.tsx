import {
  Alert,
  alpha,
  Box,
  Button,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { useLockFn } from 'ahooks'
import { useRef, useState } from 'react'

import { BaseDialog } from '@/components/base'
import { routingTraffic } from '@/components/rule/routing-traffic'
import { SpeedRounded } from '@/components/shared/lucide-icons'
import { ServiceBrandIcon } from '@/components/shared/service-brand-icon'
import { useVerge } from '@/hooks/use-verge'
import {
  getBuiltinRoutingRules,
  listSubscriptionExitNodes,
  snapshotSubscriptionExit,
} from '@/services/cmds'
import delayManager from '@/services/delay'
import { showNotice } from '@/services/notice-service'
import parseTraffic from '@/utils/parse-traffic'

import { addSnapshotNodes, importClaudeRouting } from './claude-routing-import'
import { ManualExitForm } from './manual-exit-form'
import { findManualExit, putManualExit } from './manual-exit-merge'
import { canEditManualNode } from './manual-exit-validation'
import {
  currentRoutingDelay,
  routingProtected,
  routingTestKey,
  routingTestTarget,
} from './routing-test-state'

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
  const theme = useTheme()
  const current =
    service === 'Claude' ? verge?.claude_routing : verge?.codex_routing
  const routing: Routing = {
    enabled: current?.enabled ?? false,
    selected_exit: current?.selected_exit ?? '',
    configuration: current?.configuration ?? '',
    exit_names: current?.exit_names ?? [],
    rules: current?.rules ?? null,
  }
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [configuration, setConfiguration] = useState('')
  const [exits, setExits] = useState('')
  const [error, setError] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualNode, setManualNode] = useState<
    Record<string, unknown> | undefined
  >()
  const [subscriptionNodes, setSubscriptionNodes] = useState<
    Array<{ name: string; source: string }>
  >([])
  const [subscriptionIndex, setSubscriptionIndex] = useState('')
  const [subscriptionProfileUid, setSubscriptionProfileUid] = useState('')
  const [excludedProviders, setExcludedProviders] = useState(0)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [rulesText, setRulesText] = useState('')
  const [defaultRules, setDefaultRules] = useState<string[]>([])
  const [useDefaultRules, setUseDefaultRules] = useState(false)
  const [delayResult, setDelayResult] = useState<{
    key: string
    value: number
  } | null>(null)
  const [testing, setTesting] = useState(false)
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
    setManualOpen(false)
    setSubscriptionNodes([])
    setSubscriptionIndex('')
    setSubscriptionProfileUid('')
    setOpen(true)
  }

  const openRules = async () => {
    setBusy(true)
    try {
      const defaults = await getBuiltinRoutingRules(service)
      setDefaultRules(defaults)
      setRulesText((routing.rules ?? defaults).join('\n'))
      setUseDefaultRules(routing.rules === null)
      setError('')
      setRulesOpen(true)
    } catch (failure) {
      showNotice.error(failure)
    } finally {
      setBusy(false)
    }
  }

  const saveRules = async () => {
    const rules = rulesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (!useDefaultRules && !rules.length) {
      setError('请至少填写一条规则，或恢复内置规则。')
      return
    }
    if (await save({ ...routing, rules: useDefaultRules ? null : rules }))
      setRulesOpen(false)
  }

  const loadSubscriptionNodes = async () => {
    setBusy(true)
    try {
      const result = await listSubscriptionExitNodes()
      setSubscriptionNodes(
        Array.from(
          new Map(
            result.nodes.map((node) => [
              JSON.stringify([node.source, node.name]),
              node,
            ]),
          ).values(),
        ),
      )
      setSubscriptionProfileUid(result.profile_uid)
      setExcludedProviders(result.excluded_override_providers)
      setSubscriptionIndex('')
      setError(result.nodes.length ? '' : '当前订阅没有可用的固定节点。')
    } catch {
      setError('无法读取当前订阅节点，请确认订阅已启用。')
    } finally {
      setBusy(false)
    }
  }

  const addSubscriptionNode = async () => {
    const node = subscriptionNodes[Number(subscriptionIndex)]
    if (subscriptionIndex === '' || !node) return
    setBusy(true)
    try {
      const yaml = await snapshotSubscriptionExit(
        node.name,
        node.source,
        subscriptionProfileUid,
      )
      const result = addSnapshotNodes(configuration, yaml)
      setConfiguration(result.configuration)
      setExits((previous) =>
        [
          ...previous
            .split('\n')
            .map((name) => name.trim())
            .filter(Boolean),
          node.name,
        ].join('\n'),
      )
      setError('')
    } catch {
      setError('无法添加该节点：请确认名称不重复、订阅可用且节点依赖有效。')
    } finally {
      setBusy(false)
    }
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
  const testKey = routingTestKey(
    service,
    selectedExit,
    routing.enabled,
    routing.configuration,
  )
  const delay = currentRoutingDelay(testKey, delayResult)
  const protectedRoute = routingProtected(routing.enabled, mode)

  const testUrl =
    verge?.default_latency_test?.trim() ||
    'http://cp.cloudflare.com/generate_204'
  const testTimeout = verge?.default_latency_timeout || 10000
  const runTest = useLockFn(async () => {
    const target = routingTestTarget(service, selectedExit, routing.enabled)
    if (!target) return
    setTesting(true)
    try {
      const result = await delayManager.unifiedDelayCheck(
        target,
        testUrl,
        testTimeout,
      )
      setDelayResult({ key: testKey, value: result.delay })
    } catch {
      setDelayResult({ key: testKey, value: 1e6 })
    } finally {
      setTesting(false)
    }
  })

  const exitSelect = (
    <TextField
      select
      size="small"
      label="出口节点"
      value={selectedExit}
      disabled={busy || testing || !routing.exit_names.length}
      sx={{ flex: 1, minWidth: 140 }}
      onChange={(event) => {
        setDelayResult(null)
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
        flex: '1 0 90px',
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
        bgcolor: 'var(--glass-bg)',
        border: '1px solid var(--glass-edge)',
        borderRadius: 'var(--glass-radius-card)',
        boxShadow: 'var(--glass-card-shadow)',
        backdropFilter: 'var(--glass-blur-card)',
        WebkitBackdropFilter: 'var(--glass-blur-card)',
        overflow: 'hidden',
        '@supports not (backdrop-filter: blur(1px))': {
          bgcolor: theme.palette.background.paper,
        },
      }}
    >
      {isFull ? (
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            gap: 1.5,
            mb: 1.5,
            mx: -2,
            mt: -2,
            px: 2,
            py: 1.5,
            borderBottom: '1px solid var(--glass-hairline)',
            ...(routing.enabled && {
              backgroundImage: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.16,
              )}, ${alpha(theme.palette.primary.main, 0.03)})`,
            }),
          }}
        >
          <ServiceBrandIcon service={service} size={40} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {service} 专用
            </Typography>
            <Typography variant="caption" color="text.secondary">
              策略组 {service}-Verge · {routing.exit_names.length} 个可选出口
            </Typography>
          </Box>
          <Switch
            checked={routing.enabled}
            disabled={busy || testing || !verge || !routing.exit_names.length}
            onChange={(_, enabled) => {
              void save({ ...routing, enabled })
            }}
          />
        </Stack>
      ) : (
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
          <ServiceBrandIcon service={service} size={28} />
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, flex: 1, minWidth: 0 }}
          >
            {service} 专用
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: routing.enabled ? 'success.main' : 'grey.500',
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: routing.enabled ? 'success.main' : 'text.secondary',
              }}
            >
              {routing.enabled ? '已启用' : '未启用'}
            </Typography>
          </Box>
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
      >
        {exitSelect}
        <Button
          variant="outlined"
          disabled={busy || testing || !selectedExit || !routing.enabled}
          onClick={runTest}
          startIcon={<SpeedRounded />}
          sx={{
            flexShrink: 0,
            color:
              delay != null ? delayManager.formatDelayColor(delay) : undefined,
          }}
        >
          {testing
            ? '检测中'
            : delay != null
              ? delayManager.formatDelay(delay)
              : '检测'}
        </Button>
        <Button
          variant="outlined"
          disabled={busy || testing || !verge}
          onClick={configure}
          sx={{ flexShrink: 0 }}
        >
          配置出口
        </Button>
        <Button
          variant="outlined"
          disabled={busy || testing || !verge}
          onClick={() => void openRules()}
        >
          编辑规则
        </Button>
      </Stack>

      {isFull && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ mt: 1.5, flexWrap: 'wrap' }}
        >
          {statBox('活动连接', `${traffic.count}`)}
          {statBox(
            '实时流量',
            `↑${formatBytes(traffic.upload)} ↓${formatBytes(traffic.download)}`,
          )}
          {statBox(
            '防泄漏',
            protectedRoute ? '已保护' : '未生效',
            protectedRoute ? 'success.main' : 'text.secondary',
          )}
        </Stack>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {statusText}
      </Typography>

      {routing.enabled && mode !== 'rule' && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {mode
            ? `当前不是规则模式，${service} 专用分流不会按规则生效。请先切换到“规则”。`
            : `尚未确认代理模式，${service} 专用分流的保护状态未知。`}
        </Alert>
      )}
      <BaseDialog
        open={open}
        title={`${service} 出口配置`}
        okBtn="保存配置"
        cancelBtn="取消"
        loading={busy}
        disableCancel={busy}
        disableOk={manualOpen}
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
          <Typography variant="subtitle2">添加出口</Typography>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap' }}
          >
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => {
                setManualNode(undefined)
                setManualOpen(true)
                setError('')
              }}
            >
              手动填写节点
            </Button>
            <Button
              variant="outlined"
              disabled={busy || !routing.selected_exit}
              onClick={() => {
                try {
                  const node = findManualExit(
                    configuration,
                    routing.selected_exit,
                  )
                  if (!node || !canEditManualNode(node))
                    throw new Error(
                      '当前出口不是可用表单编辑的 HTTP、SOCKS5 或 VLESS REALITY 节点。',
                    )
                  setManualNode(node)
                  setManualOpen(true)
                  setError('')
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : '无法读取当前节点。',
                  )
                }
              }}
            >
              编辑当前节点
            </Button>
            <Button
              variant="outlined"
              disabled={busy}
              onClick={() => void loadSubscriptionNodes()}
            >
              选择订阅节点
            </Button>
          </Stack>
          {manualOpen && (
            <ManualExitForm
              key={manualNode ? String(manualNode.name) : 'new'}
              initialValue={manualNode}
              onCancel={() => setManualOpen(false)}
              onSave={(node) => {
                try {
                  setConfiguration(
                    putManualExit(configuration, node, !!manualNode),
                  )
                  if (!manualNode)
                    setExits((previous) =>
                      [
                        ...previous
                          .split('\n')
                          .map((name) => name.trim())
                          .filter(Boolean),
                        String(node.name),
                      ].join('\n'),
                    )
                  setManualOpen(false)
                  setError('')
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : '无法保存节点。',
                  )
                }
              }}
            />
          )}
          {subscriptionNodes.length > 0 && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                select
                label="订阅节点"
                value={subscriptionIndex}
                onChange={(event) => setSubscriptionIndex(event.target.value)}
                sx={{ flex: 1 }}
              >
                {subscriptionNodes.map((node, index) => (
                  <MenuItem
                    key={JSON.stringify([node.source, node.name])}
                    value={String(index)}
                  >
                    {node.name} · {node.source}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="outlined"
                disabled={busy || subscriptionIndex === ''}
                onClick={() => void addSubscriptionNode()}
              >
                添加
              </Button>
            </Stack>
          )}
          {excludedProviders > 0 && (
            <Alert severity="info">
              部分订阅集合使用覆盖设置，暂不能安全地列出其中的节点。
            </Alert>
          )}
          <Typography variant="caption" color="text.secondary">
            订阅节点以固定快照保存，不随订阅更新自动变化；节点更新后请重新添加。填写或添加后，请点击下方“保存配置”。
          </Typography>
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
      <BaseDialog
        open={rulesOpen}
        title={`${service} 分流规则`}
        okBtn="保存规则"
        cancelBtn="取消"
        loading={busy}
        onClose={() => setRulesOpen(false)}
        onCancel={() => setRulesOpen(false)}
        onOk={() => void saveRules()}
        contentSx={{ width: { xs: 280, sm: 520 } }}
      >
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Typography variant="body2">
            每行填写规则类型和值，例如 DOMAIN-SUFFIX,example.com 或
            IP-CIDR,1.2.3.0/24；目标自动使用专用出口。删除某条规则后，对应流量将跟随其他规则处理。
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="分流规则"
            multiline
            minRows={10}
            maxRows={18}
            value={rulesText}
            disabled={busy}
            onChange={(event) => {
              setRulesText(event.target.value)
              setUseDefaultRules(false)
            }}
            slotProps={{
              input: { sx: { fontFamily: 'monospace', fontSize: 13 } },
            }}
          />
          <Button
            disabled={busy}
            onClick={() => {
              setRulesText(defaultRules.join('\n'))
              setUseDefaultRules(true)
              setError('')
            }}
          >
            恢复内置规则
          </Button>
        </Stack>
      </BaseDialog>
    </Box>
  )
}
