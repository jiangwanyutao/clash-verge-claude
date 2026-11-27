import { Paper, ThemeProvider } from '@mui/material'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'

import { BaseErrorBoundary } from '@/components/base'
import { LayoutSidebar } from '@/components/layout/layout-sidebar'
import { NoticeManager } from '@/components/layout/notice-manager'
import { ServiceMigrationDialog } from '@/components/layout/service-migration-dialog'
import { SysproxyPrivilegeDialog } from '@/components/layout/sysproxy-privilege-dialog'
import {
  WindowControls,
  WindowResizeHandles,
} from '@/components/layout/window-controller'
import { useI18n } from '@/hooks/use-i18n'
import { useVerge } from '@/hooks/use-verge'
import { useWindowDecorations } from '@/hooks/use-window'
import { useEventBus } from '@/services/bus'
import { handleNoticeMessage } from '@/services/notice-handlers'
import { useThemeMode } from '@/services/states'
import getSystem from '@/utils/get-system'

import {
  useCustomTheme,
  useLoadingOverlay,
  usePendingFailures,
} from './_layout/hooks'

import 'dayjs/locale/ru'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)

const OS = getSystem()

const Layout = () => {
  const mode = useThemeMode()
  const isDark = mode !== 'light'
  const { t } = useTranslation()
  const { theme } = useCustomTheme()
  const { verge } = useVerge()
  const { language } = verge ?? {}
  const navCollapsed = verge?.collapse_navbar ?? false
  const { switchLanguage } = useI18n()
  const navigate = useNavigate()
  const themeReady = useMemo(() => Boolean(theme), [theme])
  const windowControlsRef = useRef<any>(null)
  const { decorated } = useWindowDecorations()

  const customTitlebar = useMemo(
    () =>
      decorated === false ? (
        <div className="the_titlebar">
          <div
            className="the_titlebar-drag-region"
            data-tauri-drag-region="true"
          />
          <WindowControls ref={windowControlsRef} />
        </div>
      ) : null,
    [decorated],
  )

  useLoadingOverlay(themeReady)

  const handleNotice = useCallback(
    (payload: [string, string]) => {
      const [status, msg] = payload
      try {
        handleNoticeMessage(status, msg, t, navigate)
      } catch (error) {
        console.error('[通知处理] 失败:', error)
      }
    },
    [t, navigate],
  )

  useEventBus(handleNotice)
  usePendingFailures()

  useEffect(() => {
    if (language) {
      dayjs.locale(language === 'zh' ? 'zh-cn' : language)
      switchLanguage(language)
    }
  }, [language, switchLanguage])

  if (!themeReady) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: mode === 'light' ? '#fff' : '#181a1b',
          transition: 'background 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: mode === 'light' ? '#333' : '#fff',
        }}
      ></div>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      {/* 左侧底部窗口控制按钮 */}
      <NoticeManager position={verge?.notice_position} />
      <ServiceMigrationDialog />
      <SysproxyPrivilegeDialog />
      <div
        style={{
          animation: 'fadeIn 0.5s',
          WebkitAnimation: 'fadeIn 0.5s',
        }}
      />
      <style>
        {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}
      </style>
      <Paper
        square
        elevation={0}
        className={`${OS} layout${navCollapsed ? ' layout--nav-collapsed' : ''}`}
        onContextMenu={(e) => {
          if (
            OS === 'windows' &&
            !['input', 'textarea'].includes(
              e.currentTarget.tagName.toLowerCase(),
            ) &&
            !e.currentTarget.isContentEditable
          ) {
            e.preventDefault()
          }
        }}
        sx={[
          ({ palette }) => ({
            position: 'relative',
            bgcolor: palette.background.default,
            backgroundImage: 'var(--user-background-image)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundBlendMode: 'var(--background-blend-mode)',
            borderRadius: 'var(--glass-radius-window)',
            border: '1px solid var(--glass-edge)',
            boxShadow: 'var(--glass-card-shadow)',
            '& .the_titlebar': {
              bgcolor: 'var(--glass-bg-strong)',
              borderColor: 'var(--glass-hairline)',
            },
            '& .layout-content': {
              gap: 1,
              p: 1,
              minHeight: 0,
            },
            '& .layout-content__left, & .layout-content__right': {
              bgcolor: 'var(--glass-bg)',
              border: '1px solid var(--glass-edge)',
              borderRadius: 'var(--glass-radius-window)',
              backdropFilter: 'var(--glass-blur-window)',
              WebkitBackdropFilter: 'var(--glass-blur-window)',
              overflow: 'hidden',
              minWidth: 0,
              '@supports not (backdrop-filter: blur(1px))': {
                bgcolor: palette.background.paper,
              },
            },
            '& .layout-content__left': {
              flex: '0 0 200px',
              bgcolor: 'var(--glass-bg-strong)',
              '@supports not (backdrop-filter: blur(1px))': {
                bgcolor: palette.background.paper,
              },
            },
            '& .layout-content__right .the-content': {
              top: 0,
              right: 0,
            },
            '& .layout-content__left .the-traffic > div': {
              mx: 1,
              p: 1.5,
              bgcolor: 'var(--glass-bg-strong)',
              border: '1px solid var(--glass-edge)',
              borderRadius: 'var(--glass-radius-card)',
              boxShadow: 'var(--glass-card-shadow)',
            },
          }),
          OS === 'linux'
            ? {
                width: '100vw',
                height: '100vh',
              }
            : {},
        ]}
      >
        {decorated === false && <WindowResizeHandles />}

        {/* Custom titlebar - rendered only when decorated is false, memoized for performance */}
        {customTitlebar}

        <div className="layout-content">
          <LayoutSidebar isDark={isDark} isCollapsed={navCollapsed} />

          <div className="layout-content__right">
            <div className="the-bar"></div>
            <div className="the-content">
              <BaseErrorBoundary>
                <Outlet />
              </BaseErrorBoundary>
            </div>
          </div>
        </div>
      </Paper>
    </ThemeProvider>
  )
}

export default Layout
