import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { AppBar, Box, Button, Container, Menu, MenuItem, Toolbar, Typography } from '@mui/material'
import { MouseEvent, ReactNode, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  label: string
  path: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

type NavEntry = NavItem | NavGroup

function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const navEntries: NavEntry[] = [
    { label: 'Raids', path: '/' },
    {
      label: 'Gear',
      items: [
        { label: 'Gear Wiki', path: '/gear/wiki' },
        { label: 'Gear Wishlist', path: '/gear/wishlist' },
        { label: 'Gear Planner', path: '/gear/planner' },
      ],
    },
    { label: 'TR Planner', path: '/tr-planner' },
  ]

  const handleMenuOpen = (event: MouseEvent<HTMLElement>, label: string) => {
    setAnchorEl(event.currentTarget)
    setOpenMenu(label)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setOpenMenu(null)
  }

  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => location.pathname === item.path)
  }

  const getActiveGroupLabel = (group: NavGroup) => {
    const active = group.items.find((item) => location.pathname === item.path)
    return active ? active.label : group.label
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Container maxWidth={false}>
          <Toolbar disableGutters>
            <Typography
              variant="h6"
              noWrap
              component={RouterLink}
              to="/"
              sx={{
                mr: 4,
                display: { xs: 'none', md: 'flex' },
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '.3rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              DDO AUDIT
            </Typography>

            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
              {navEntries.map((entry) => {
                if (isNavGroup(entry)) {
                  const isActive = isGroupActive(entry)
                  return (
                    <Box key={entry.label}>
                      <Button
                        onClick={(e) => handleMenuOpen(e, entry.label)}
                        variant={isActive ? 'contained' : 'text'}
                        color={isActive ? 'primary' : 'inherit'}
                        endIcon={<ArrowDropDownIcon />}
                        sx={{ my: 2 }}
                      >
                        {getActiveGroupLabel(entry)}
                      </Button>
                      <Menu
                        anchorEl={anchorEl}
                        open={openMenu === entry.label}
                        onClose={handleMenuClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                      >
                        {entry.items.map((item) => {
                          const isItemActive = location.pathname === item.path
                          return (
                            <MenuItem
                              key={item.path}
                              component={RouterLink}
                              to={item.path}
                              onClick={handleMenuClose}
                              selected={isItemActive}
                            >
                              {item.label}
                            </MenuItem>
                          )
                        })}
                      </Menu>
                    </Box>
                  )
                }

                const isActive = location.pathname === entry.path
                return (
                  <Button
                    key={entry.path}
                    component={RouterLink}
                    to={entry.path}
                    variant={isActive ? 'contained' : 'text'}
                    color={isActive ? 'primary' : 'inherit'}
                    sx={{ my: 2, display: 'block' }}
                  >
                    {entry.label}
                  </Button>
                )
              })}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>
    </Box>
  )
}
