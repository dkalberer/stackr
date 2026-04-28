import { Box, Typography } from '@mui/material'
import { TEAL } from '../../theme/theme'

export function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-default)',
        gap: 3,
      }}
    >
      {/* Animated logo mark */}
      <Box sx={{ position: 'relative', width: 48, height: 48 }}>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            border: `2px solid ${TEAL}`,
            borderRadius: '12px',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontWeight: 600,
              fontSize: '1.25rem',
              color: TEAL,
              letterSpacing: '-0.05em',
            }}
          >
            S
          </Typography>
        </Box>
      </Box>

      {/* Loading dots */}
      <Box sx={{ display: 'flex', gap: 0.75 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: TEAL,
              opacity: 0.3,
              animation: 'dotPulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes dotPulse': {
                '0%, 80%, 100%': { opacity: 0.3, transform: 'scale(1)' },
                '40%': { opacity: 1, transform: 'scale(1.3)' },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  )
}
