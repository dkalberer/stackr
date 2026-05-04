import { createTheme, alpha } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    terminal: {
      scanline: string
      glow: string
      dim: string
    }
  }
  interface PaletteOptions {
    terminal?: {
      scanline?: string
      glow?: string
      dim?: string
    }
  }
}

export const TEAL = '#00BFA5'
export const TEAL_DIM = '#00897B'
export const ORANGE = '#FF6E40'
export const BG_DEFAULT = '#12121F'
export const BG_PAPER = '#1A1A2E'
export const BG_ELEVATED = '#1E2035'
export const BORDER_COLOR = 'rgba(255,255,255,0.07)'

export const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  BANK_ACCOUNT: '#42A5F5',
  SAVINGS_ACCOUNT: '#66BB6A',
  PILLAR_3A: '#7C4DFF',
  INVESTMENT_DEPOT: '#00BFA5',
  CRYPTO: '#FF6E40',
  REAL_ESTATE: '#FFA726',
  LIABILITY: '#EF5350',
  OTHER: '#78909C',
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: TEAL,
      dark: TEAL_DIM,
      light: '#4DD0C4',
      contrastText: '#000',
    },
    secondary: {
      main: ORANGE,
      contrastText: '#000',
    },
    background: {
      default: BG_DEFAULT,
      paper: BG_PAPER,
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#388E3C',
    },
    error: {
      main: '#EF5350',
      light: '#EF9A9A',
      dark: '#C62828',
    },
    warning: {
      main: '#FFA726',
    },
    divider: BORDER_COLOR,
    text: {
      primary: 'rgba(255,255,255,0.92)',
      secondary: 'rgba(255,255,255,0.52)',
      disabled: 'rgba(255,255,255,0.28)',
    },
    terminal: {
      scanline: alpha(TEAL, 0.04),
      glow: alpha(TEAL, 0.2),
      dim: alpha(TEAL, 0.12),
    },
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontFamily: '"Syne", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    subtitle1: {
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.8125rem',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.6875rem',
      letterSpacing: '0.06em',
    },
    overline: {
      fontSize: '0.625rem',
      letterSpacing: '0.12em',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        :root {
          --teal: ${TEAL};
          --teal-dim: ${TEAL_DIM};
          --orange: ${ORANGE};
          --bg-default: ${BG_DEFAULT};
          --bg-paper: ${BG_PAPER};
          --bg-elevated: ${BG_ELEVATED};
          --border: ${BORDER_COLOR};
          color-scheme: dark;
        }
        * { box-sizing: border-box; }
        html {
          overflow-x: hidden;
        }
        body {
          background: ${BG_DEFAULT};
          overflow-x: hidden;
          max-width: 100vw;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(0,191,165,0.4); }

        /* Number formatting */
        .tabular-nums {
          font-variant-numeric: tabular-nums;
          font-feature-settings: "tnum";
        }
        .mono {
          font-family: "IBM Plex Mono", monospace;
          font-variant-numeric: tabular-nums;
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 ${alpha(TEAL, 0.3)}; }
          50% { box-shadow: 0 0 20px 4px ${alpha(TEAL, 0.15)}; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes countUp {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `,
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: BG_PAPER,
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: alpha(TEAL, 0.25),
            boxShadow: `0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px ${alpha(TEAL, 0.1)}`,
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px',
          '&:last-child': { paddingBottom: '16px' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 600,
          letterSpacing: '0.01em',
          borderRadius: 8,
        },
        contained: {
          boxShadow: `0 0 20px ${alpha(TEAL, 0.2)}`,
          '&:hover': {
            boxShadow: `0 0 30px ${alpha(TEAL, 0.35)}`,
          },
        },
        outlined: {
          borderColor: alpha(TEAL, 0.4),
          '&:hover': {
            borderColor: TEAL,
            backgroundColor: alpha(TEAL, 0.06),
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: `0 4px 20px ${alpha(TEAL, 0.4)}`,
          '&:hover': {
            boxShadow: `0 6px 28px ${alpha(TEAL, 0.55)}`,
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(BG_PAPER, 0.95),
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${BORDER_COLOR}`,
          height: 64,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.38)',
          minWidth: 'unset',
          paddingTop: 8,
          '&.Mui-selected': {
            color: TEAL,
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.625rem',
            letterSpacing: '0.06em',
            fontWeight: 600,
            textTransform: 'uppercase',
            '&.Mui-selected': { fontSize: '0.625rem' },
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: BORDER_COLOR },
            '&:hover fieldset': { borderColor: alpha(TEAL, 0.4) },
            '&.Mui-focused fieldset': { borderColor: TEAL, borderWidth: 1 },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: TEAL },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER_COLOR },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(TEAL, 0.4) },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: TEAL, borderWidth: 1 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: BG_ELEVATED,
        },
        elevation1: {
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        },
        elevation8: {
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          border: `1px solid ${BORDER_COLOR}`,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_ELEVATED,
          border: `1px solid ${BORDER_COLOR}`,
          backgroundImage: 'none',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: BORDER_COLOR,
          fontSize: '0.8125rem',
        },
        head: {
          fontSize: '0.625rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.38)',
          backgroundColor: BG_PAPER,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '0.6875rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: alpha(TEAL, 0.12) },
        bar: { borderRadius: 4 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid`,
          fontSize: '0.8125rem',
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: alpha('#fff', 0.06),
          '&::after': {
            background: `linear-gradient(90deg, transparent, ${alpha('#fff', 0.03)}, transparent)`,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: BG_ELEVATED,
          border: `1px solid ${BORDER_COLOR}`,
          fontSize: '0.75rem',
          fontFamily: '"IBM Plex Mono", monospace',
        },
        arrow: {
          color: BG_ELEVATED,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${BORDER_COLOR}`,
          minHeight: 40,
        },
        indicator: {
          backgroundColor: TEAL,
          height: 2,
          borderRadius: '2px 2px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 600,
          fontSize: '0.8125rem',
          letterSpacing: '0.02em',
          minHeight: 40,
          minWidth: 'unset',
          padding: '8px 16px',
          color: 'rgba(255,255,255,0.52)',
          '&.Mui-selected': { color: TEAL },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: TEAL,
            '& + .MuiSwitch-track': { backgroundColor: alpha(TEAL, 0.5) },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: BORDER_COLOR },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': { backgroundColor: alpha('#fff', 0.04) },
          '&.Mui-selected': {
            backgroundColor: alpha(TEAL, 0.1),
            '&:hover': { backgroundColor: alpha(TEAL, 0.14) },
          },
        },
      },
    },
  },
})
