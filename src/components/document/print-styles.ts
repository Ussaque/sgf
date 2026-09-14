export const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 12mm;
    }

    .print-document {
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      background: white !important;
    }

    .print-document table {
      page-break-inside: auto;
      width: 100%;
      border-collapse: collapse;
    }

    .print-document thead {
      display: table-header-group;
    }

    .print-document tbody tr {
      page-break-inside: avoid;
    }

    .print-footer {
      page-break-inside: avoid;
      position: static !important;
    }
  }
`;
