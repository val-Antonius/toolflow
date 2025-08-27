declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface UserOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
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
    htmlParser?: (element: HTMLTableElement) => any;
    willDrawCell?: (data: any) => void;
    didDrawCell?: (data: any) => void;
    willDrawPage?: (data: any) => void;
    didDrawPage?: (data: any) => void;
    headStyles?: any;
    bodyStyles?: any;
    footStyles?: any;
    alternateRowStyles?: any;
    columnStyles?: { [key: number]: any };
    styles?: any;
  }

  function autoTable(doc: jsPDF, options: UserOptions): void;
  export default autoTable;
}
