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
 * Extensible element stubs for future commands
 */
export interface ImageElement extends BaseSlideElement {
  type: 'image';
  src: string;
  url?: string;
  alt?: string;
}

export interface TableElement extends BaseSlideElement {
  type: 'table';
  headers?: string[];
  rows?: string[][];
}

export interface ChartElement extends BaseSlideElement {
  type: 'chart';
  chartType?: 'bar' | 'pie' | 'line';
  data?: Array<{ label: string; value: number }>;
}

export interface ShapeElement extends BaseSlideElement {
  type: 'shape';
  shapeType?: 'rect' | 'circle' | 'line';
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

export interface Slide {
  id: string;
  index: number;
  title: string;
  line: number;
  layout?: SlideLayout;
  elements: SlideElement[];
}

export interface PresentationMetadata {
  author?: string;
  description?: string;
  date?: string;
}

export interface Presentation {
  title: string;
  theme: ThemeId;
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
}
