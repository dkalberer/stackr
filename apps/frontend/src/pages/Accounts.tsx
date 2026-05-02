import { useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Fab,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Alert,
  Divider,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccounts, updateAccount, deleteAccount } from '../api/accounts'
import { queryKeys, type Account } from '../types'
import { AccountCard } from '../components/accounts/AccountCard'
import { AccountForm } from '../components/accounts/AccountForm'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { useToast } from '../hooks/useToast'
import { TEAL } from '../theme/theme'

export function Accounts() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; account: Account } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Account | null>(null)

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: queryKeys.accounts,
    queryFn: getAccounts,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      showSuccess('Konto gelöscht')
      setDeleteTarget(null)
    },
    onError: () => showError('Fehler beim Löschen'),
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updateAccount(id, { is_active }),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
      showSuccess(vars.is_active ? 'Konto aktiviert' : 'Konto archiviert')
      setArchiveTarget(null)
    },
    onError: () => showError('Fehler beim Archivieren'),
  })

  const handleContextMenu = useCallback((event: React.MouseEvent, account: Account) => {
    event.preventDefault()
    setMenuAnchor({ el: event.currentTarget as HTMLElement, account })
  }, [])

  const closeMenu = () => setMenuAnchor(null)

  const activeAccounts = accounts.filter((a) => a.is_active)
  const archivedAccounts = accounts.filter((a) => !a.is_active)

  if (error) {
    return (
      <Box sx={{ p: 2, pt: 3 }}>
        <Alert severity="error">Konten konnten nicht geladen werden.</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 3, maxWidth: 680, mx: 'auto', animation: 'fadeInUp 0.3s ease-out' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 3, pb: 2 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 0.5 }}
        >
          Vermögenskonten
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}
        >
          {isLoading ? (
            <Skeleton width={80} />
          ) : (
            `${activeAccounts.length} Konto${activeAccounts.length !== 1 ? 'en' : ''}`
          )}
        </Typography>
      </Box>

      {/* Active accounts */}
      <Box sx={{ px: 2 }}>
        {isLoading ? (
          <>
            {[0, 1, 2].map((i) => (
              <Box key={i} sx={{ mb: 1.5 }}>
                <Skeleton variant="rounded" height={80} />
              </Box>
            ))}
          </>
        ) : activeAccounts.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              px: 3,
              border: `1px dashed`,
              borderColor: 'divider',
              borderRadius: 3,
              mb: 2,
            }}
          >
            <AccountBalanceRoundedIcon
              sx={{ fontSize: 48, color: 'text.disabled', mb: 2, display: 'block', mx: 'auto' }}
            />
            <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', mb: 1 }}>
              Noch keine Konten
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Füge dein erstes Konto hinzu, um dein Nettovermögen zu verfolgen.
            </Typography>
            <Typography
              onClick={() => setFormOpen(true)}
              sx={{
                color: TEAL,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              + Konto hinzufügen
            </Typography>
          </Box>
        ) : (
          activeAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </Box>

      {/* Archived section */}
      {archivedAccounts.length > 0 && (
        <>
          <Divider sx={{ mx: 2, my: 2 }} />
          <Box sx={{ px: 2 }}>
            <Typography
              variant="overline"
              sx={{ color: 'text.disabled', letterSpacing: '0.1em', display: 'block', mb: 1.5 }}
            >
              Archiviert ({archivedAccounts.length})
            </Typography>
            {archivedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onContextMenu={handleContextMenu}
              />
            ))}
          </Box>
        </>
      )}

      {/* FAB */}
      <Fab
        color="primary"
        onClick={() => { setEditAccount(null); setFormOpen(true) }}
        sx={{
          position: 'fixed',
          bottom: 'calc(72px + env(safe-area-inset-bottom))',
          right: 20,
          zIndex: 50,
        }}
      >
        <AddRoundedIcon />
      </Fab>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { minWidth: 180, borderRadius: 2 } } }}
      >
        <MenuItem
          onClick={() => {
            setEditAccount(menuAnchor!.account)
            setFormOpen(true)
            closeMenu()
          }}
        >
          <ListItemIcon><EditRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText slotProps={{ primary: { style: { fontSize: '0.875rem' } } }}>
            Bearbeiten
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setArchiveTarget(menuAnchor!.account)
            closeMenu()
          }}
        >
          <ListItemIcon><ArchiveRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText slotProps={{ primary: { style: { fontSize: '0.875rem' } } }}>
            {menuAnchor?.account.is_active ? 'Archivieren' : 'Aktivieren'}
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setDeleteTarget(menuAnchor!.account)
            closeMenu()
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteRoundedIcon fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
          <ListItemText slotProps={{ primary: { style: { fontSize: '0.875rem' }, color: 'inherit' } }}>
            Löschen
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Account form dialog */}
      <AccountForm
        open={formOpen}
        account={editAccount}
        onClose={() => { setFormOpen(false); setEditAccount(null) }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Konto löschen"
        message={`„${deleteTarget?.name}" und alle zugehörigen Daten werden dauerhaft gelöscht.`}
        confirmLabel="Löschen"
        dangerous
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.is_active ? 'Konto archivieren' : 'Konto aktivieren'}
        message={
          archiveTarget?.is_active
            ? `„${archiveTarget?.name}" wird archiviert und erscheint nicht mehr in der monatlichen Erfassung.`
            : `„${archiveTarget?.name}" wird wieder aktiviert.`
        }
        confirmLabel={archiveTarget?.is_active ? 'Archivieren' : 'Aktivieren'}
        onConfirm={() => {
          if (archiveTarget) {
            archiveMutation.mutate({ id: archiveTarget.id, is_active: !archiveTarget.is_active })
          }
        }}
        onCancel={() => setArchiveTarget(null)}
      />
    </Box>
  )
}
