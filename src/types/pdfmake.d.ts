// src/types/pdfmake.d.ts
declare module 'pdfmake/build/pdfmake' {
    export interface TDocumentDefinitions {
      content: any;
      styles?: Record<string, any>;
      defaultStyle?: Record<string, any>;
    }
  
    export interface Content {
      text?: string | string[] | { text: string; style?: string }[];
      table?: {
        headerRows?: number;
        widths?: string[];
        body: any[][];
      };
      margin?: number[];
      style?: string;
      bold?: boolean;
    }
  
    const pdfMake: {
      vfs: Record<string, string>;
      createPdf: (docDefinition: TDocumentDefinitions) => {
        getBuffer: (callback: (buffer: Buffer) => void) => void;
      };
    };
  
    export default pdfMake;
  }