export type ThemeId = 'modern' | 'ocean' | 'emerald' | 'sunset' | 'dark';

export interface ThemeColors {
  id: ThemeId;
  name: string;
  bgColor: string;
  bgHex: string; // for pptxgenjs without hash
  titleColor: string;
  titleHex: string;
  bodyColor: string;
  bodyHex: string;
  accentColor: string;
  accentHex: string;
  cardBg: string;
  border: string;
  isDark?: boolean;
}

export type CoreSlideElementType = 'text' | 'bullet';

export type ExtendedSlideElementType =
  | 'subtitle'
  | 'quote'
  | 'image'
  | 'table'
  | 'chart'
  | 'shape';

export type SlideElementType = CoreSlideElementType | ExtendedSlideElementType;

export interface BaseSlideElement {
  id: string;
  type: SlideElementType;
  content: string;
  line: number;
  link?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  lineSpacing?: number;
}

/**
 * Text paragraph element
 */
export interface TextElement extends BaseSlideElement {
  type: 'text';
}

/**
 * Bullet point element
 */
export interface BulletElement extends BaseSlideElement {
  type: 'bullet';
}

/**
 * Subtitle or section description element
 */
export interface SubtitleElement extends BaseSlideElement {
  type: 'subtitle';
}

/**
 * Blockquote element with optional attribution
 */
export interface QuoteElement extends BaseSlideElement {
  type: 'quote';
  author?: string;
}

/**
 * Image element supporting URLs, data URIs, and device uploads
 */
export interface ImageElement extends BaseSlideElement {
  type: 'image';
  src: string;
  url?: string;
  alt?: string;
  fit?: 'contain' | 'cover' | 'fill';
}

export type ShapeType =
  | 'rect'
  | 'round-rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'triangle'
  | 'star';

export interface ShapeElement extends BaseSlideElement {
  type: 'shape';
  shapeType: ShapeType;
  fillColor?: string;
  fillHex?: string;
  strokeColor?: string;
  strokeHex?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface TableElement extends BaseSlideElement {
  type: 'table';
  headers: string[];
  rows: string[][];
  headerBg?: string;
  borderColor?: string;
}

export type ChartType = 'bar' | 'column' | 'pie' | 'doughnut' | 'line' | 'area';

export interface ChartDataItem {
  label: string;
  value: number;
}

export interface ChartElement extends BaseSlideElement {
  type: 'chart';
  chartType: ChartType;
  title?: string;
  data: ChartDataItem[];
  categories?: string[];
  series?: Array<{ name: string; values: number[] }>;
}

export type SlideElement =
  | TextElement
  | BulletElement
  | SubtitleElement
  | QuoteElement
  | ImageElement
  | TableElement
  | ChartElement
  | ShapeElement;

export type SlideLayout =
  | 'title'
  | 'title-content'
  | 'two-column'
  | 'text-image'
  | 'image-text'
  | 'full-image'
  | 'blank';

export const VALID_SLIDE_LAYOUTS: readonly SlideLayout[] = [
  'title',
  'title-content',
  'two-column',
  'text-image',
  'image-text',
  'full-image',
  'blank',
] as const;

export type TransitionStyle =
  | 'none'
  | 'fade'
  | 'push'
  | 'wipe'
  | 'split'
  | 'cut'
  | 'zoom'
  | 'dissolve'
  | 'blinds'
  | 'checker'
  | 'circle'
  | 'diamond'
  | 'comb'
  | 'cover'
  | 'pull'
  | 'wheel'
  | 'newsflash';

export const VALID_TRANSITION_STYLES: readonly TransitionStyle[] = [
  'none',
  'fade',
  'push',
  'wipe',
  'split',
  'cut',
  'zoom',
  'dissolve',
  'blinds',
  'checker',
  'circle',
  'diamond',
  'comb',
  'cover',
  'pull',
  'wheel',
  'newsflash',
] as const;

export type TransitionDirection =
  | 'left'
  | 'right'
  | 'up'
  | 'down'
  | 'horz'
  | 'vert'
  | 'horizontal'
  | 'vertical'
  | 'in'
  | 'out'
  | 'l'
  | 'r'
  | 'u'
  | 'd';

export type TransitionSpeed = 'slow' | 'med' | 'fast';

export interface SlideTransition {
  style: TransitionStyle;
  direction?: TransitionDirection;
  speed?: TransitionSpeed;
  duration?: number;
}

export interface Slide {
  id: string;
  index: number;
  title: string;
  line: number;
  layout?: SlideLayout;
  transition?: SlideTransition;
  elements: SlideElement[];
  notes?: string;
  background?: string;
}

export interface PresentationMetadata {
  author?: string;
  description?: string;
  date?: string;
}

export interface Presentation {
  title: string;
  theme: ThemeId;
  transition?: SlideTransition;
  slides: Slide[];
  metadata?: PresentationMetadata;
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export type IssueCode =
  | 'EMPTY_PRESENTATION'
  | 'BATCH_LIMIT_EXCEEDED'
  | 'MISSING_PRESENTATION_DECLARATION'
  | 'MISSING_TITLE'
  | 'EMPTY_SLIDE'
  | 'INVALID_COMMAND'
  | 'INVALID_LAYOUT'
  | 'INVALID_TRANSITION'
  | 'MISSING_IMAGE_PATH'
  | 'INVALID_IMAGE_PATH'
  | 'CONTENT_BEFORE_SLIDE'
  | 'MISSING_QUOTES'
  | 'UNCLOSED_QUOTE'
  | 'MISSING_ARGUMENT'
  | 'UNKNOWN_THEME'
  | 'JAVASCRIPT_DETECTED';

export interface ValidationIssue {
  line: number;
  column?: number;
  code?: IssueCode;
  message: string;
  severity: IssueSeverity;
  suggestion?: string;
}

export interface ParseResult {
  presentation: Presentation;
  issues: ValidationIssue[];
  hasErrors: boolean;
  isMultiPresentation?: boolean;
  totalPresentations?: number;
  presentations?: Presentation[];
  batchItems?: any[];
}
