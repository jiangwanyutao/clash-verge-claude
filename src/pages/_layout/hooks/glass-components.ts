import { alpha, Components, Theme } from '@mui/material'

import { glassBlur, glassRadius } from '@/pages/_theme'

const glassVar = {
  glass: 'var(--glass-bg)',
  glassStrong: 'var(--glass-bg-strong)',
  edge: 'var(--glass-edge)',
  hairline: 'var(--glass-hairline)',
  muted: 'var(--glass-muted)',
  cardShadow: 'var(--glass-card-shadow)',
}

const overlaySurface = {
  backgroundColor: glassVar.glassStrong,
  backgroundImage: 'none',
  border: `1px solid ${glassVar.edge}`,
  backdropFilter: glassBlur.overlay,
  WebkitBackdropFilter: glassBlur.overlay,
}

// Backdrop blur is limited to overlays and cards; plain Papers stay
// translucent only, because long lists of them make blur too expensive.
export const createGlassComponents = (): Components<Theme> => ({
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
      outlined: {
        backgroundColor: glassVar.glass,
        borderColor: glassVar.edge,
      },
      rounded: {
        borderRadius: glassRadius.card,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundColor: glassVar.glass,
        border: `1px solid ${glassVar.edge}`,
        borderRadius: glassRadius.card,
        backdropFilter: glassBlur.card,
        WebkitBackdropFilter: glassBlur.card,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        ...overlaySurface,
        borderRadius: glassRadius.window,
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        ...overlaySurface,
        borderRadius: glassRadius.control + 2,
      },
    },
  },
  MuiPopover: {
    styleOverrides: {
      paper: {
        ...overlaySurface,
        borderRadius: glassRadius.control + 2,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        ...overlaySurface,
        borderRadius: 0,
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: ({ theme }) => ({
        ...overlaySurface,
        color: theme.palette.text.primary,
        borderRadius: 8,
        fontSize: 12,
      }),
      arrow: {
        color: glassVar.glassStrong,
      },
    },
  },
  MuiButton: {
    defaultProps: {
      disableElevation: true,
    },
    styleOverrides: {
      root: {
        borderRadius: glassRadius.control,
        textTransform: 'none',
        fontWeight: 500,
      },
      outlined: {
        borderColor: glassVar.hairline,
        backgroundColor: glassVar.muted,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: glassRadius.control,
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 999,
        fontWeight: 500,
      },
      outlined: {
        borderColor: glassVar.hairline,
        backgroundColor: glassVar.muted,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: glassRadius.control,
        '&.Mui-selected': {
          backgroundColor: alpha(theme.palette.primary.main, 0.14),
        },
        '&.Mui-selected:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.2),
        },
      }),
    },
  },
  MuiSwitch: {
    styleOverrides: {
      track: {
        borderRadius: 999,
      },
    },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        borderRadius: glassRadius.control,
        backgroundColor: glassVar.muted,
      },
      notchedOutline: {
        borderColor: glassVar.hairline,
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: glassVar.hairline,
      },
    },
  },
})
