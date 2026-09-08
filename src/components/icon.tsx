import { ArrowLeftIcon } from 'phosphor-react-native/src/icons/ArrowLeft';
import { InfoIcon } from 'phosphor-react-native/src/icons/Info';
import { HouseIcon } from 'phosphor-react-native/src/icons/House';
import { ClockIcon } from 'phosphor-react-native/src/icons/Clock';
import { ListChecksIcon } from 'phosphor-react-native/src/icons/ListChecks';
import { CheckSquareIcon } from 'phosphor-react-native/src/icons/CheckSquare';
import { SquareIcon } from 'phosphor-react-native/src/icons/Square';
import { FlagCheckeredIcon } from 'phosphor-react-native/src/icons/FlagCheckered';
import { ArrowsClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { ArrowUUpLeftIcon } from 'phosphor-react-native/src/icons/ArrowUUpLeft';
import { ArrowBendUpRightIcon } from 'phosphor-react-native/src/icons/ArrowBendUpRight';
import { ArrowBendUpLeftIcon } from 'phosphor-react-native/src/icons/ArrowBendUpLeft';
import { PlayIcon } from 'phosphor-react-native/src/icons/Play';
import { PauseIcon } from 'phosphor-react-native/src/icons/Pause';
import { StopIcon } from 'phosphor-react-native/src/icons/Stop';
import type { ComponentProps } from 'react';
import { ArrowDownIcon } from 'phosphor-react-native/src/icons/ArrowDown';
import { ArrowUpIcon } from 'phosphor-react-native/src/icons/ArrowUp';
import { ArrowsInIcon } from 'phosphor-react-native/src/icons/ArrowsIn';
import { ArrowsOutIcon } from 'phosphor-react-native/src/icons/ArrowsOut';
import { BedIcon } from 'phosphor-react-native/src/icons/Bed';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CaretDownIcon } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretUpIcon } from 'phosphor-react-native/src/icons/CaretUp';
import { CheckIcon } from 'phosphor-react-native/src/icons/Check';
import { CoffeeIcon } from 'phosphor-react-native/src/icons/Coffee';
import { CornersInIcon } from 'phosphor-react-native/src/icons/CornersIn';
import { CornersOutIcon } from 'phosphor-react-native/src/icons/CornersOut';
import { CrosshairIcon } from 'phosphor-react-native/src/icons/Crosshair';
import { ForkKnifeIcon } from 'phosphor-react-native/src/icons/ForkKnife';
import { GasPumpIcon } from 'phosphor-react-native/src/icons/GasPump';
import { ListNumbersIcon } from 'phosphor-react-native/src/icons/ListNumbers';
import { MagnifyingGlassIcon } from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import { MapTrifoldIcon } from 'phosphor-react-native/src/icons/MapTrifold';
import { MotorcycleIcon } from 'phosphor-react-native/src/icons/Motorcycle';
import { NavigationArrowIcon } from 'phosphor-react-native/src/icons/NavigationArrow';
import { PathIcon } from 'phosphor-react-native/src/icons/Path';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PlusIcon } from 'phosphor-react-native/src/icons/Plus';
import { PlusCircleIcon } from 'phosphor-react-native/src/icons/PlusCircle';
import { SlidersHorizontalIcon } from 'phosphor-react-native/src/icons/SlidersHorizontal';
import { TrashIcon } from 'phosphor-react-native/src/icons/Trash';
import { WarningCircleIcon } from 'phosphor-react-native/src/icons/WarningCircle';
import { XIcon } from 'phosphor-react-native/src/icons/X';

// Import only the Phosphor icons used by the app.
const icons = {
  'information-outline': InfoIcon,
  home: HouseIcon,
  clock: ClockIcon, checklist: ListChecksIcon, 'check-square': CheckSquareIcon, square: SquareIcon,
  'turn-left': ArrowBendUpLeftIcon,
  'turn-right': ArrowBendUpRightIcon,
  'turn-uturn': ArrowUUpLeftIcon,
  'turn-roundabout': ArrowsClockwiseIcon,
  'turn-arrive': FlagCheckeredIcon,

  play: PlayIcon, pause: PauseIcon, stop: StopIcon,
  'map-outline': MapTrifoldIcon,
  'motorbike': MotorcycleIcon,
  'format-list-numbered': ListNumbersIcon,
  'map-marker-path': PathIcon,
  'routes': PathIcon,
  'chevron-up': CaretUpIcon,
  'chevron-down': CaretDownIcon,
  'crosshairs-gps': CrosshairIcon,
  'fit-to-screen-outline': CornersOutIcon,
  'collapse-view': CornersInIcon,
  'arrow-expand': ArrowsOutIcon,
  'arrow-collapse': ArrowsInIcon,
  'tune-variant': SlidersHorizontalIcon,
  'close': XIcon,
  'pencil-outline': PencilSimpleIcon,
  'magnify': MagnifyingGlassIcon,
  'arrow-left': ArrowLeftIcon,
  'arrow-up': ArrowUpIcon,
  'arrow-down': ArrowDownIcon,
  'navigation-variant': NavigationArrowIcon,
  'navigation-variant-outline': NavigationArrowIcon,
  'trash-can-outline': TrashIcon,
  'delete-outline': TrashIcon,
  'alert-circle-outline': WarningCircleIcon,
  'plus-circle': PlusCircleIcon,
  'check': CheckIcon,
  'plus': PlusIcon,
  'gas-station': GasPumpIcon,
  'silverware-fork-knife': ForkKnifeIcon,
  'coffee-outline': CoffeeIcon,
  'bed-outline': BedIcon,
  'camera-outline': CameraIcon,
  'map-marker-outline': MapPinIcon,
} as const;

export type IconName = keyof typeof icons;
export type IconProps = {
  name: IconName;
  size?: number;
  color: string;
  style?: ComponentProps<typeof MapTrifoldIcon>['style'];
};

export function Icon({ name, size = 20, color, style }: IconProps) {
  const Glyph = icons[name];
  return <Glyph size={size} color={color} weight="regular" style={style} />;
}
