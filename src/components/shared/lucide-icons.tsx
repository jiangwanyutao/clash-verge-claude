import { SvgIcon, type SvgIconProps } from '@mui/material'
import {
  Activity as LucideActivity,
  ArrowDown as LucideArrowDown,
  ArrowDownAZ as LucideArrowDownAZ,
  ArrowDownToLine as LucideArrowDownToLine,
  ArrowUp as LucideArrowUp,
  ArrowUpDown as LucideArrowUpDown,
  ArrowUpToLine as LucideArrowUpToLine,
  Bug as LucideBug,
  Calendar as LucideCalendar,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronRight as LucideChevronRight,
  ChevronUp as LucideChevronUp,
  CircleCheck as LucideCircleCheck,
  CircleEllipsis as LucideCircleEllipsis,
  CircleExclamationPoint as LucideCircleExclamationPoint,
  CirclePause as LucideCirclePause,
  CirclePlay as LucideCirclePlay,
  CircleQuestionMark as LucideCircleQuestionMark,
  CircleX as LucideCircleX,
  CircuitBoard as LucideCircuitBoard,
  ClipboardPaste as LucideClipboardPaste,
  Clock as LucideClock,
  ClockArrowLeft as LucideClockArrowLeft,
  ClockArrowUp as LucideClockArrowUp,
  CloudDownload as LucideCloudDownload,
  CloudUpload as LucideCloudUpload,
  Code as LucideCode,
  Columns3 as LucideColumns3,
  Copy as LucideCopy,
  Database as LucideDatabase,
  Download as LucideDownload,
  ExternalLink as LucideExternalLink,
  Eye as LucideEye,
  EyeOff as LucideEyeOff,
  FileText as LucideFileText,
  Flame as LucideFlame,
  Gauge as LucideGauge,
  Globe as LucideGlobe,
  GripVertical as LucideGripVertical,
  House as LucideHouse,
  Inbox as LucideInbox,
  Info as LucideInfo,
  LayoutGrid as LucideLayoutGrid,
  Link2 as LucideLink2,
  ListChecks as LucideListChecks,
  LocateFixed as LucideLocateFixed,
  LockOpen as LucideLockOpen,
  MapPin as LucideMapPin,
  Maximize2 as LucideMaximize2,
  MemoryStick as LucideMemoryStick,
  Minimize2 as LucideMinimize2,
  Minus as LucideMinus,
  Monitor as LucideMonitor,
  Network as LucideNetwork,
  Paintbrush as LucidePaintbrush,
  Pencil as LucidePencil,
  Plus as LucidePlus,
  Puzzle as LucidePuzzle,
  RefreshCw as LucideRefreshCw,
  Repeat as LucideRepeat,
  RotateCw as LucideRotateCw,
  Route as LucideRoute,
  Router as LucideRouter,
  Rows3 as LucideRows3,
  ScrollText as LucideScrollText,
  Search as LucideSearch,
  SearchX as LucideSearchX,
  Server as LucideServer,
  Settings as LucideSettings,
  ShieldCheck as LucideShieldCheck,
  Shuffle as LucideShuffle,
  Signpost as LucideSignpost,
  Split as LucideSplit,
  Square as LucideSquare,
  SquareCheck as LucideSquareCheck,
  SquareMinus as LucideSquareMinus,
  Table2 as LucideTable2,
  TextAlignStart as LucideTextAlignStart,
  Trash as LucideTrash,
  TriangleExclamationPoint as LucideTriangleExclamationPoint,
  Undo2 as LucideUndo2,
  Unlink as LucideUnlink,
  Wifi as LucideWifi,
  WifiHigh as LucideWifiHigh,
  WifiLow as LucideWifiLow,
  WifiOff as LucideWifiOff,
  WifiZero as LucideWifiZero,
  X as LucideX,
} from 'lucide-react'
import type { ElementType } from 'react'
import { FaGithub, FaTelegram } from 'react-icons/fa6'

export type { SvgIconComponent } from '@mui/icons-material'

const wrap = (Icon: ElementType) =>
  function MuiLucideIcon({ style, ...rest }: SvgIconProps) {
    return (
      <SvgIcon component={Icon} {...rest} style={{ fill: 'none', ...style }} />
    )
  }

const wrapFilled = (Icon: ElementType) =>
  function MuiFilledIcon(props: SvgIconProps) {
    return <SvgIcon component={Icon} inheritViewBox {...props} />
  }

export const AccessTimeOutlined = wrap(LucideClock)
export const AccessTimeRounded = wrap(LucideClock)
export const Add = wrap(LucidePlus)
export const AdminPanelSettingsOutlined = wrap(LucideShieldCheck)
export const AltRouteOutlined = wrap(LucideRoute)
export const ArrowDownward = wrap(LucideArrowDown)
export const ArrowDownwardRounded = wrap(LucideArrowDown)
export const ArrowDropDown = wrap(LucideChevronDown)
export const ArrowUpwardRounded = wrap(LucideArrowUp)
export const BugReportRounded = wrap(LucideBug)
export const CancelOutlined = wrap(LucideCircleX)
export const CheckBoxOutlineBlankRounded = wrap(LucideSquare)
export const CheckBoxRounded = wrap(LucideSquareCheck)
export const CheckCircleOutlineRounded = wrap(LucideCircleCheck)
export const CheckCircleOutlined = wrap(LucideCircleCheck)
export const CheckRounded = wrap(LucideCheck)
export const ChevronRight = wrap(LucideChevronRight)
export const ChevronRightRounded = wrap(LucideChevronRight)
export const ClearRounded = wrap(LucideX)
export const Close = wrap(LucideX)
export const CloseFullscreenRounded = wrap(LucideMinimize2)
export const CloseRounded = wrap(LucideX)
export const CloudDownloadRounded = wrap(LucideCloudDownload)
export const CloudUploadOutlined = wrap(LucideCloudUpload)
export const CloudUploadRounded = wrap(LucideCloudUpload)
export const CodeRounded = wrap(LucideCode)
export const ComputerRounded = wrap(LucideMonitor)
export const ContentCopy = wrap(LucideCopy)
export const ContentCopyRounded = wrap(LucideCopy)
export const ContentPasteRounded = wrap(LucideClipboardPaste)
export const CropSquare = wrap(LucideSquare)
export const Delete = wrap(LucideTrash)
export const DeleteForeverRounded = wrap(LucideTrash)
export const DeleteOutlined = wrap(LucideTrash)
export const DeleteRounded = wrap(LucideTrash)
export const DeveloperBoardOutlined = wrap(LucideCircuitBoard)
export const DirectionsRounded = wrap(LucideSignpost)
export const DnsOutlined = wrap(LucideServer)
export const DownloadRounded = wrap(LucideDownload)
export const DragIndicator = wrap(LucideGripVertical)
export const DragIndicatorRounded = wrap(LucideGripVertical)
export const EditRounded = wrap(LucidePencil)
export const ErrorOutlineRounded = wrap(LucideCircleExclamationPoint)
export const EventOutlined = wrap(LucideCalendar)
export const ExpandLess = wrap(LucideChevronUp)
export const ExpandLessRounded = wrap(LucideChevronUp)
export const ExpandMore = wrap(LucideChevronDown)
export const ExpandMoreRounded = wrap(LucideChevronDown)
export const ExtensionOutlined = wrap(LucidePuzzle)
export const FeaturedPlayListRounded = wrap(LucideListChecks)
export const FilterNone = wrap(LucideCopy)
export const ForkRightOutlined = wrap(LucideSplit)
export const FormatPaintRounded = wrap(LucidePaintbrush)
export const GitHub = wrapFilled(FaGithub)
export const HelpOutlineRounded = wrap(LucideCircleQuestionMark)
export const HelpOutlined = wrap(LucideCircleQuestionMark)
export const HistoryEduOutlined = wrap(LucideScrollText)
export const HomeOutlined = wrap(LucideHouse)
export const InboxRounded = wrap(LucideInbox)
export const IndeterminateCheckBoxRounded = wrap(LucideSquareMinus)
export const InfoOutlined = wrap(LucideInfo)
export const InfoRounded = wrap(LucideInfo)
export const KeyboardArrowUp = wrap(LucideChevronUp)
export const LanOutlined = wrap(LucideNetwork)
export const LanRounded = wrap(LucideNetwork)
export const LanguageOutlined = wrap(LucideGlobe)
export const LanguageRounded = wrap(LucideGlobe)
export const LaunchOutlined = wrap(LucideExternalLink)
export const Link = wrap(LucideLink2)
export const LinkOff = wrap(LucideUnlink)
export const LinkRounded = wrap(LucideLink2)
export const LocalFireDepartmentRounded = wrap(LucideFlame)
export const LocationOnOutlined = wrap(LucideMapPin)
export const LockOpenOutlined = wrap(LucideLockOpen)
export const MemoryRounded = wrap(LucideMemoryStick)
export const Minimize = wrap(LucideMinus)
export const MultipleStopRounded = wrap(LucideArrowUpDown)
export const MyLocationRounded = wrap(LucideLocateFixed)
export const NetworkCheck = wrap(LucideWifi)
export const NetworkCheckRounded = wrap(LucideWifi)
export const OpenInFullRounded = wrap(LucideMaximize2)
export const OpenInNewRounded = wrap(LucideExternalLink)
export const PauseCircleOutlineRounded = wrap(LucideCirclePause)
export const PauseCircleOutlined = wrap(LucideCirclePause)
export const PendingOutlined = wrap(LucideCircleEllipsis)
export const PlayCircleOutlineRounded = wrap(LucideCirclePlay)
export const RefreshOutlined = wrap(LucideRefreshCw)
export const RefreshRounded = wrap(LucideRefreshCw)
export const RestartAltRounded = wrap(LucideRotateCw)
export const RestoreRounded = wrap(LucideClockArrowLeft)
export const RouterOutlined = wrap(LucideRouter)
export const SearchOffRounded = wrap(LucideSearchX)
export const SearchRounded = wrap(LucideSearch)
export const SettingsOutlined = wrap(LucideSettings)
export const SettingsRounded = wrap(LucideSettings)
export const Shuffle = wrap(LucideShuffle)
export const SignalWifi0Bar = wrap(LucideWifiZero)
export const SignalWifi1Bar = wrap(LucideWifiLow)
export const SignalWifi2Bar = wrap(LucideWifi)
export const SignalWifi3Bar = wrap(LucideWifiHigh)
export const SignalWifi4Bar = wrap(LucideWifi)
export const SortByAlphaRounded = wrap(LucideArrowDownAZ)
export const SortRounded = wrap(LucideArrowUpDown)
export const SpeedOutlined = wrap(LucideGauge)
export const SpeedRounded = wrap(LucideGauge)
export const StorageOutlined = wrap(LucideDatabase)
export const SubjectOutlined = wrap(LucideTextAlignStart)
export const SwapVertRounded = wrap(LucideArrowUpDown)
export const SwitchAccessShortcutRounded = wrap(LucideRepeat)
export const TableChartRounded = wrap(LucideTable2)
export const TableRowsRounded = wrap(LucideRows3)
export const Telegram = wrapFilled(FaTelegram)
export const TextSnippetOutlined = wrap(LucideFileText)
export const TroubleshootRounded = wrap(LucideActivity)
export const UndoRounded = wrap(LucideUndo2)
export const UpdateOutlined = wrap(LucideClockArrowUp)
export const VerticalAlignBottomRounded = wrap(LucideArrowDownToLine)
export const VerticalAlignTopRounded = wrap(LucideArrowUpToLine)
export const ViewColumnRounded = wrap(LucideColumns3)
export const ViewModuleRounded = wrap(LucideLayoutGrid)
export const VisibilityOffOutlined = wrap(LucideEyeOff)
export const VisibilityOffRounded = wrap(LucideEyeOff)
export const VisibilityOutlined = wrap(LucideEye)
export const VisibilityRounded = wrap(LucideEye)
export const WarningRounded = wrap(LucideTriangleExclamationPoint)
export const WifiOff = wrap(LucideWifiOff)
export const WifiOutlined = wrap(LucideWifi)
export const WifiTetheringOffRounded = wrap(LucideWifiOff)
export const WifiTetheringRounded = wrap(LucideWifi)
