declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface TableRow {
    [key: string]: string | number | boolean | null | undefined;
  }

  interface UserOptions {
    head?: (string | TableRow)[][];
    body?: (string | TableRow)[][];
    foot?: (string | TableRow)[][];
    startY?: number;
    margin?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
    pageBreak?: 'auto' | 'avoid' | 'always';
    rowPageBreak?: 'auto' | 'avoid';
    tableWidth?: 'auto' | 'wrap' | number;
    showHead?: 'everyPage' | 'firstPage' | 'never';
    showFoot?: 'everyPage' | 'lastPage' | 'never';
    theme?: 'striped' | 'grid' | 'plain';
    useCss?: boolean;
    includeHiddenHtml?: boolean;
    html?: string | HTMLTableElement;
    htmlParser?: (element: HTMLTableElement) => TableRow[];
    willDrawCell?: (data: DrawCallbackData) => void;
    didDrawCell?: (data: DrawCallbackData) => void;
    willDrawPage?: (data: DrawCallbackData) => void;
    didDrawPage?: (data: DrawCallbackData) => void;
    headStyles?: TableStyles;
    bodyStyles?: TableStyles;
    footStyles?: TableStyles;
    alternateRowStyles?: TableStyles;
    columnStyles?: { [key: number]: TableStyles };
    styles?: TableStyles;
  }

  interface DrawCallbackData {
    table: Table;
    pageNumber: number;
    pageCount: number;
    settings: UserOptions;
    doc: jsPDF;
    cursor: { x: number; y: number };
  }

  interface TableStyles {
    font?: string;
    fontStyle?: string;
    fontSize?: number;
    textColor?: number[];
    fillColor?: number[];
    lineColor?: number[];
    lineWidth?: number;
    cellPadding?: number | { top?: number; right?: number; bottom?: number; left?: number };
    cellWidth?: number | 'wrap' | 'auto';
    overflow?: string;
    halign?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
  }

  interface Table {
    readonly rows: TableRow[][];
    readonly columns: Column[];
    readonly height: number;
    readonly width: number;
  }

  interface Column {
    readonly dataKey: string | number;
    readonly raw?: string | number;
    readonly width?: number;
    readonly text: string[];
  }

  function autoTable(doc: jsPDF, options: UserOptions): void;
  export default autoTable;
}