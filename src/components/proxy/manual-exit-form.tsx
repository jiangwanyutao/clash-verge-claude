import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material'
import { useState } from 'react'

import {
  validHost,
  validFingerprint,
  validPort,
  validPublicKey,
  validUuid,
} from './manual-exit-validation'

type Node = Record<string, unknown>
const EMPTY_NODE: Node = {}
type Props = {
  initialValue?: Node
  onSave: (node: Node) => void
  onCancel: () => void
}

export function ManualExitForm({
  initialValue = EMPTY_NODE,
  onSave,
  onCancel,
}: Props) {
  const reality = (initialValue['reality-opts'] ?? {}) as Node
  const [name, setName] = useState(String(initialValue.name ?? ''))
  const [type, setType] = useState(String(initialValue.type ?? 'http'))
  const [server, setServer] = useState(String(initialValue.server ?? ''))
  const [port, setPort] = useState(String(initialValue.port ?? ''))
  const [username, setUsername] = useState(String(initialValue.username ?? ''))
  const [password, setPassword] = useState(String(initialValue.password ?? ''))
  const [uuid, setUuid] = useState(String(initialValue.uuid ?? ''))
  const [servername, setServername] = useState(
    String(initialValue.servername ?? ''),
  )
  const [publicKey, setPublicKey] = useState(
    String(reality['public-key'] ?? ''),
  )
  const [shortId, setShortId] = useState(String(reality['short-id'] ?? ''))
  const [flow, setFlow] = useState(String(initialValue.flow ?? ''))
  const [fingerprint, setFingerprint] = useState(
    String(initialValue['client-fingerprint'] || 'chrome'),
  )
  const fingerprints = [
    'chrome',
    'firefox',
    'safari',
    'ios',
    'android',
    'edge',
    'random',
  ]
  const [error, setError] = useState('')

  const save = () => {
    const p = Number(port)
    if (!name.trim() || !validHost(server.trim()) || !validPort(port)) {
      setError('请填写节点名称、IP 或域名及 1–65535 的端口。')
      return
    }
    if (
      type === 'vless' &&
      (!validUuid(uuid.trim()) ||
        !validHost(servername.trim()) ||
        !validPublicKey(publicKey.trim()) ||
        !validFingerprint(fingerprint.trim()) ||
        !/^(?:[0-9a-f]{2}){0,8}$/i.test(shortId.trim()))
    ) {
      setError('请检查 UUID、服务器名称、REALITY 公钥、客户端指纹和 short ID。')
      return
    }
    const node: Node = {
      ...(initialValue.type === type ? initialValue : {}),
      name: name.trim(),
      type,
      server: server.trim(),
      port: p,
    }
    if (type === 'vless') {
      Object.assign(node, {
        uuid: uuid.trim(),
        network: 'tcp',
        tls: true,
        servername: servername.trim(),
        'client-fingerprint': fingerprint.trim(),
        'reality-opts': {
          ...reality,
          'public-key': publicKey.trim(),
          'short-id': shortId.trim(),
        },
      })
      if (flow.trim()) node.flow = flow.trim()
      else delete node.flow
    } else {
      if (username) node.username = username
      else delete node.username
      if (password) node.password = password
      else delete node.password
    }
    onSave(node)
  }
  return (
    <Stack spacing={1.5}>
      <TextField
        label="节点名称"
        disabled={Boolean(initialValue.name)}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        select
        label="协议"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <MenuItem value="http">HTTP</MenuItem>
        <MenuItem value="socks5">SOCKS5</MenuItem>
        <MenuItem value="vless">VLESS + REALITY (TCP)</MenuItem>
      </TextField>
      <TextField
        label="IP 或域名"
        value={server}
        onChange={(e) => setServer(e.target.value)}
      />
      <TextField
        label="端口"
        type="number"
        value={port}
        onChange={(e) => setPort(e.target.value)}
      />
      {type === 'vless' ? (
        <>
          <TextField
            label="UUID"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
          />
          <TextField
            label="服务器名称 (SNI)"
            value={servername}
            onChange={(e) => setServername(e.target.value)}
          />
          <TextField
            select
            label="客户端指纹"
            value={fingerprint}
            onChange={(e) => setFingerprint(e.target.value)}
            helperText="通常填写 chrome"
          >
            {!fingerprints.includes(fingerprint) && (
              <MenuItem value={fingerprint}>{fingerprint}</MenuItem>
            )}
            {fingerprints.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="REALITY 公钥"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
          />
          <TextField
            label="Short ID（可选）"
            value={shortId}
            onChange={(e) => setShortId(e.target.value)}
          />
          <TextField
            label="Flow（可选）"
            value={flow}
            onChange={(e) => setFlow(e.target.value)}
          />
        </>
      ) : (
        <>
          <TextField
            label="用户名（可选）"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="密码（可选）"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={save}>
          保存节点
        </Button>
        <Button onClick={onCancel}>取消</Button>
      </Stack>
    </Stack>
  )
}
