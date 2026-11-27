import { type ComponentType, type ReactNode } from 'react'

import ConnectionsSvg from '@/assets/image/itemicon/connections.svg?react'
import HomeSvg from '@/assets/image/itemicon/home.svg?react'
import LogsSvg from '@/assets/image/itemicon/logs.svg?react'
import ProfilesSvg from '@/assets/image/itemicon/profiles.svg?react'
import ProxiesSvg from '@/assets/image/itemicon/proxies.svg?react'
import RulesSvg from '@/assets/image/itemicon/rules.svg?react'
import SettingsSvg from '@/assets/image/itemicon/settings.svg?react'
import UnlockSvg from '@/assets/image/itemicon/unlock.svg?react'
import { AltRouteOutlined as AltRouteOutlinedIcon } from '@/components/shared/lucide-icons'
import { DnsOutlined as DnsOutlinedIcon } from '@/components/shared/lucide-icons'
import { ForkRightOutlined as ForkRightOutlinedIcon } from '@/components/shared/lucide-icons'
import { HomeOutlined as HomeOutlinedIcon } from '@/components/shared/lucide-icons'
import { LanguageOutlined as LanguageOutlinedIcon } from '@/components/shared/lucide-icons'
import { LockOpenOutlined as LockOpenOutlinedIcon } from '@/components/shared/lucide-icons'
import { SettingsOutlined as SettingsOutlinedIcon } from '@/components/shared/lucide-icons'
import { SubjectOutlined as SubjectOutlinedIcon } from '@/components/shared/lucide-icons'
import { WifiOutlined as WifiOutlinedIcon } from '@/components/shared/lucide-icons'

import { navigationItems } from './_navigation-meta'
import ConnectionsPage from './connections'
import HomePage from './home'
import LogsPage from './logs'
import ProfilePage from './profiles'
import ProxyPage from './proxies'
import RoutingPage from './routing'
import RulesPage from './rules'
import SettingPage from './settings'
import UnlockPage from './unlock'

type NavigationItem = {
  label: (typeof navigationItems)[keyof typeof navigationItems]['label']
  path: string
  icon: ReactNode[]
  Component: ComponentType
}

export const navItems: NavigationItem[] = [
  {
    ...navigationItems.home,
    icon: [<HomeOutlinedIcon key="mui" />, <HomeSvg key="svg" />],
    Component: HomePage,
  },
  {
    ...navigationItems.proxies,
    icon: [<WifiOutlinedIcon key="mui" />, <ProxiesSvg key="svg" />],
    Component: ProxyPage,
  },
  {
    ...navigationItems.routing,
    icon: [<AltRouteOutlinedIcon key="mui" />, <RulesSvg key="svg" />],
    Component: RoutingPage,
  },
  {
    ...navigationItems.profiles,
    icon: [<DnsOutlinedIcon key="mui" />, <ProfilesSvg key="svg" />],
    Component: ProfilePage,
  },
  {
    ...navigationItems.connections,
    icon: [<LanguageOutlinedIcon key="mui" />, <ConnectionsSvg key="svg" />],
    Component: ConnectionsPage,
  },
  {
    ...navigationItems.rules,
    icon: [<ForkRightOutlinedIcon key="mui" />, <RulesSvg key="svg" />],
    Component: RulesPage,
  },
  {
    ...navigationItems.logs,
    icon: [<SubjectOutlinedIcon key="mui" />, <LogsSvg key="svg" />],
    Component: LogsPage,
  },
  {
    ...navigationItems.unlock,
    icon: [<LockOpenOutlinedIcon key="mui" />, <UnlockSvg key="svg" />],
    Component: UnlockPage,
  },
  {
    ...navigationItems.settings,
    icon: [<SettingsOutlinedIcon key="mui" />, <SettingsSvg key="svg" />],
    Component: SettingPage,
  },
]
