import { Box } from '@mui/material'
import { RiClaudeFill, RiOpenaiFill } from 'react-icons/ri'

export function ServiceBrandIcon({
  service,
  size = 28,
}: {
  service: 'Claude' | 'Codex'
  size?: number
}) {
  const Glyph = service === 'Claude' ? RiClaudeFill : RiOpenaiFill
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--glass-muted)',
        border: '1px solid var(--glass-edge)',
        borderRadius: 'var(--glass-radius-control)',
        color: 'primary.main',
      }}
    >
      <Glyph size={Math.round(size * 0.5)} />
    </Box>
  )
}
