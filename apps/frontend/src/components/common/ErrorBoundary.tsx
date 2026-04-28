import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Box, Typography, Button } from '@mui/material'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { TEAL } from '../../theme/theme'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            gap: 2,
            background: 'var(--bg-default)',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'error.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
            }}
          >
            <WarningAmberRoundedIcon sx={{ color: 'error.main', fontSize: 32 }} />
          </Box>
          <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', color: 'text.primary' }}>
            Etwas ist schiefgelaufen
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 320 }}>
            {this.state.error?.message ?? 'Ein unerwarteter Fehler ist aufgetreten.'}
          </Typography>
          <Button
            variant="outlined"
            onClick={this.handleReset}
            sx={{ mt: 1, borderColor: TEAL, color: TEAL }}
          >
            Zur Startseite
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}
