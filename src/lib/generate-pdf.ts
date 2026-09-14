import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 12;
const FOOTER_GAP_MM = 4;
const CONTINUED_TEXT_HEIGHT_MM = 6;
const THEAD_GAP_MM = 2;
const HEADER_GAP_MM = 4;

/** Elements that must never be split across a page boundary. Deliberately just table rows —
 * marking a wrapping <section> atomic would treat the entire items table as one unsplittable
 * block and push it whole onto the next page instead of breaking between rows. */
const ATOMIC_SELECTOR = 'tbody tr';

function getAtomicRanges(container: HTMLElement, scale: number): Array<{ top: number; bottom: number }> {
    const containerTop = container.getBoundingClientRect().top;
    return Array.from(container.querySelectorAll<HTMLElement>(ATOMIC_SELECTOR)).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
            top: (rect.top - containerTop) * scale,
            bottom: (rect.bottom - containerTop) * scale,
        };
    });
}

/** Pulls a proposed page-break position back to the top of any atomic element it would cut through. */
function findSafeBreak(proposed: number, ranges: Array<{ top: number; bottom: number }>, pageStart: number): number {
    let safe = proposed;
    for (const range of ranges) {
        if (range.top < proposed && range.bottom > proposed) {
            if (range.top > pageStart) {
                safe = Math.min(safe, range.top);
            }
        }
    }
    return safe;
}

interface Captured {
    image: string;
    xMm: number;
    widthMm: number;
    heightMm: number;
}

/**
 * Captures a sub-element that will be repeated across pages, positioning it at the same
 * relative offset/width it has inside `container` (in the final contentWidthMm-wide slot).
 * Needed because a tightly-cropped sub-element capture has no knowledge of the container's own
 * padding — drawing it edge-to-edge at contentWidthMm would stretch it wider than the matching
 * content in the main page capture (which does include that padding), misaligning table columns.
 */
async function captureRepeatable(
    el: HTMLElement,
    container: HTMLElement,
    scale: number,
    contentWidthMm: number
): Promise<Captured> {
    const containerRect = container.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const widthMm = (rect.width / containerRect.width) * contentWidthMm;
    const xMm = ((rect.left - containerRect.left) / containerRect.width) * contentWidthMm;

    const canvas = await html2canvas(el, { scale, useCORS: true, backgroundColor: '#ffffff' });
    const heightMm = (canvas.height / canvas.width) * widthMm;

    return { image: canvas.toDataURL('image/png'), xMm, widthMm, heightMm };
}

export async function generatePdf(element: HTMLElement, filename: string) {
    const scale = 2;
    const contentWidthMm = A4_WIDTH_MM - MARGIN_MM * 2;
    const contentHeightMm = A4_HEIGHT_MM - MARGIN_MM * 2;

    // First check whether the document fits on a single page as naturally rendered (footer
    // included, wherever it sits). If so, skip all the multi-page machinery below entirely —
    // reserving space to repeat the footer/header on "page 2" would otherwise shave a few mm off
    // page 1's budget and spill a near-empty second page for documents that just barely fit.
    const naturalCanvas = await html2canvas(element, { scale, useCORS: true, backgroundColor: '#ffffff' });
    const naturalPxPerMm = naturalCanvas.width / contentWidthMm;
    const naturalHeightMm = naturalCanvas.height / naturalPxPerMm;

    if (naturalHeightMm <= contentHeightMm) {
        const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
        pdf.addImage(naturalCanvas.toDataURL('image/png'), 'PNG', MARGIN_MM, MARGIN_MM, contentWidthMm, naturalHeightMm);
        pdf.save(filename);
        return;
    }

    // The payment-info footer is captured separately so it can be repeated on every page,
    // instead of appearing once wherever it naturally falls in the document flow.
    const footerEl = element.querySelector<HTMLElement>('.print-footer');
    const footer = footerEl ? await captureRepeatable(footerEl, element, scale, contentWidthMm) : null;

    // The document header (title/number/date + company/client info) is captured separately too,
    // so continuation pages open with a reminder of which document and parties this is, instead
    // of dropping straight into raw table rows.
    const headerEl = element.querySelector<HTMLElement>('.print-header-block');
    const header = headerEl ? await captureRepeatable(headerEl, element, scale, contentWidthMm) : null;

    // The table's column header is captured separately too, so it can be repeated at the top
    // of continuation pages (it still appears inline, in its normal spot, on the first page).
    const theadEl = element.querySelector<HTMLElement>('table thead');
    const thead = theadEl ? await captureRepeatable(theadEl, element, scale, contentWidthMm) : null;

    const originalDisplay = footerEl?.style.display ?? '';
    if (footerEl) footerEl.style.display = 'none';

    const atomicRanges = getAtomicRanges(element, scale);
    const canvas = await html2canvas(element, { scale, useCORS: true, backgroundColor: '#ffffff' });

    if (footerEl) footerEl.style.display = originalDisplay;

    const pxPerMm = canvas.width / contentWidthMm;
    const reservedFooterAreaMm = CONTINUED_TEXT_HEIGHT_MM + (footer ? FOOTER_GAP_MM + footer.heightMm : 0);
    const repeatedTopAreaMm =
        (header ? header.heightMm + HEADER_GAP_MM : 0) + (thead ? THEAD_GAP_MM + thead.heightMm : 0);

    const firstPageHeightPx = Math.floor((contentHeightMm - reservedFooterAreaMm) * pxPerMm);
    const continuationPageHeightPx = Math.floor(
        (contentHeightMm - reservedFooterAreaMm - repeatedTopAreaMm) * pxPerMm
    );

    const slices: { start: number; end: number }[] = [];
    let renderedPx = 0;
    while (renderedPx < canvas.height) {
        const pageHeightPx = slices.length === 0 ? firstPageHeightPx : continuationPageHeightPx;
        const proposedEnd = renderedPx + pageHeightPx;
        let sliceEnd = Math.min(proposedEnd, canvas.height);

        if (sliceEnd < canvas.height) {
            const safeEnd = findSafeBreak(sliceEnd, atomicRanges, renderedPx);
            // Only use the safe break if it still makes meaningful progress (avoids infinite loops
            // when a single atomic element is taller than a full page).
            if (safeEnd > renderedPx + pageHeightPx * 0.3) {
                sliceEnd = safeEnd;
            }
        }

        slices.push({ start: renderedPx, end: sliceEnd });
        renderedPx = sliceEnd;
    }

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const footerY = A4_HEIGHT_MM - MARGIN_MM - (footer?.heightMm ?? 0);

    slices.forEach((slice, index) => {
        const sliceHeightPx = Math.round(slice.end - slice.start);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, slice.start, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        const imgData = pageCanvas.toDataURL('image/png');
        const sliceHeightMm = sliceHeightPx / pxPerMm;

        if (index > 0) pdf.addPage();

        let contentY = MARGIN_MM;
        if (index > 0 && header) {
            pdf.addImage(header.image, 'PNG', MARGIN_MM + header.xMm, contentY, header.widthMm, header.heightMm);
            contentY += header.heightMm + HEADER_GAP_MM;
        }
        if (index > 0 && thead) {
            pdf.addImage(thead.image, 'PNG', MARGIN_MM + thead.xMm, contentY, thead.widthMm, thead.heightMm);
            contentY += thead.heightMm + THEAD_GAP_MM;
        }
        pdf.addImage(imgData, 'PNG', MARGIN_MM, contentY, contentWidthMm, sliceHeightMm);

        const isLastPage = index === slices.length - 1;
        if (!isLastPage) {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(9);
            pdf.setTextColor(120, 120, 120);
            pdf.text('Continua na página seguinte...', A4_WIDTH_MM / 2, footerY - 2, { align: 'center' });
        }

        if (footer) {
            pdf.addImage(footer.image, 'PNG', MARGIN_MM + footer.xMm, footerY, footer.widthMm, footer.heightMm);
        }

        if (slices.length > 1) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Página ${index + 1} de ${slices.length}`, A4_WIDTH_MM - MARGIN_MM, A4_HEIGHT_MM - 6, {
                align: 'right',
            });
        }
    });

    pdf.save(filename);
}
