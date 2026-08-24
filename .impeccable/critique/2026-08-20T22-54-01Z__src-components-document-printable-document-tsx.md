---
target: invoice PDF (printable-document.tsx / InvoicePrint.tsx)
total_score: 11
max_score: 16
na_heuristics: 1,3,5,7,9,10
p0_count: 1
p1_count: 3
timestamp: 2026-08-20T22-54-01Z
slug: src-components-document-printable-document-tsx
---
Method: dual-agent (A: a4c7e64d5271b73db · B: a776b6f13b44df293)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | n/a | Static print artifact, no ongoing status on this route |
| 2 | Match System / Real World | 3 | Correct Mozambican fiscal vocabulary (NUIT, IVA, NIB, SWIFT, M-Pesa, E-Mola), but no fiscal-certification line and no visible paid/overdue/cancelled state |
| 3 | User Control and Freedom | n/a | No interaction surface — pure output |
| 4 | Consistency and Standards | 3 | One component drives all 3 document types consistently, but client block and payment block get wildly different visual treatment |
| 5 | Error Prevention | n/a | No input on this page to make errors with |
| 6 | Recognition Rather Than Recall | 3 | Everything needed is on the page — except invoice status, which is nowhere |
| 7 | Flexibility and Efficiency | n/a | Static, single-purpose output |
| 8 | Aesthetic and Minimalist Design | 2 | Total under-emphasized, client section under-weighted, payment info is a flat list |
| 9 | Error Recovery | n/a | No errors to recover from in a print artifact |
| 10 | Help and Documentation | n/a | Not applicable to a one-shot printed document |
| **Total** | | **11/16** | **Acceptable (69%)** |

*(6 of 10 heuristics scored n/a — this route is a static print output, not an interactive screen, so system-status/control/error-prevention/flexibility/error-recovery/help heuristics genuinely don't apply.)*

## Design Specificity Verdict

**LLM assessment**: The data model is genuinely Mozambican — NUIT on both company and client, NIB/SWIFT alongside M-Pesa/E-Mola, IVA-labeled tax column, `pt-MZ` Intl currency formatting. This isn't a re-skinned generic template at the field level. But the visual layout (header-left/doc-right, plain client block, table, right-aligned totals, boxed payment footer) is interchangeable with any country's invoice template once labels are translated — no local convention (e.g. an AT fiscal-software certification line, "ORIGINAL" stamp) gives it a distinctly Mozambican feel beyond the field labels.

**Deterministic scan**: `detect.mjs` returned exit 0 with zero findings on both target files — the automated ruleset has nothing structural to flag here (no anti-patterns it's tuned to catch). The mechanical pass did surface one concrete new defect the LLM review didn't name precisely: the footer text (`text-neutral-400` on white, `printable-document.tsx:239`) computes to a **2.52:1 contrast ratio**, below WCAG AA's 4.5:1 floor for small text. It also independently confirmed, by grep, that `voided` is never passed from `InvoicePrint.tsx` — corroborating the LLM's finding that cancelled/paid/overdue invoices print identically.

**Visual overlays**: Not available — no browser automation tool is exposed this session, so there's no live rendered screenshot or injected overlay to point to. This critique is source-level only.

## Overall Impression

The data model and defensive rendering (every optional field is properly guarded — B confirmed zero unguarded optional fields across Company/Client/Invoice) are solid engineering. But the layout hasn't had a real hierarchy pass: the total owed — the entire reason the document exists — is typeset at the same weight as "Subtotal," while the word "FATURA" dominates the page at `text-2xl font-bold`. The biggest opportunity is a straightforward one: make the number the client needs to pay the most visually important thing on the page, and give "who this is billed to" comparable weight to "how to pay it."

## What's Working

- **`hasPaymentInfo` guard** (`printable-document.tsx:47-55`) cleanly omits the entire payment section when nothing's configured, instead of rendering an empty box.
- **One component, three document types** (`printable-document.tsx:20-44`, consumed by `InvoicePrint.tsx`, `ReceiptPrint.tsx`, `QuotationPrint.tsx`) — a single consistent printed visual language instead of three drifting templates.
- **Real domain modeling, not decoration**: NUIT on both parties, `pt-MZ` locale routed through `Intl` for currency/dates rather than hardcoded formatting.

## Priority Issues

**[P0] No print pagination handling for the line-items table**
- **Why it matters**: `@media print` in `index.css:143-153` has no `thead { display: table-header-group }` and no `break-inside: avoid`. Past ~15-20 line items, the table spills to page 2 with no repeated header, and rows can split mid-row across the page break in Chromium print-to-PDF. This is the single most likely real failure mode — a business with a longer invoice — and there's currently zero mitigation.
- **Fix**: add to the `@media print` block: `.print-document thead { display: table-header-group; }` and `.print-document tbody tr, .print-document section { break-inside: avoid; }`.
- **Suggested command**: `/impeccable harden`

**[P1] The total is not the most prominent number on the page**
- **Why it matters**: The Total row (`printable-document.tsx:148-154`) is `text-sm` with only `font-semibold`, identical size to "Subtotal" one line above. Meanwhile "FATURA" (`line 87`) is `text-2xl font-bold`. A client scanning the page is pointed at the document's name before the amount they owe.
- **Fix**: bump the total row to `text-lg`/`text-xl font-bold`, optionally with an accent-colored background chip.
- **Suggested command**: `/impeccable typeset`

**[P1] Client block has no visual weight despite being the second most important section**
- **Why it matters**: `printable-document.tsx:100-108` is a bare section with only a `text-xs uppercase` label — no border, no background. The payment-info box (`lines 191-195`) — a lower-priority section — gets `rounded-md border p-4` with an accent border. The hierarchy is inverted relative to actual importance: who the bill is going to should read at least as strongly as how to pay it.
- **Fix**: give the client section comparable framing to the payment box, or a stronger label like "Faturar a:".
- **Suggested command**: `/impeccable layout`

**[P1] No contrast safeguard on the free-form `brand_color`**
- **Why it matters**: `accentColor` (`printable-document.tsx:45`, `company.brand_color || 'var(--primary)'`) is used raw as text color for the document-type heading (`line 87`) and as border color throughout. It's a free-form hex a business owner picks in Settings with zero validation — a pale/pastel choice (common) makes the FATURA/RECIBO/COTAÇÃO heading and section borders nearly invisible, both on screen and worse on a grayscale office printer.
- **Fix**: derive a contrast-safe/darkened variant of the accent for text usage; keep the raw hex for borders/backgrounds only.
- **Suggested command**: `/impeccable harden`

**[P2] Cancelled/paid/overdue state never appears on a printed Fatura or Cotação**
- **Why it matters**: `Invoice.status` (`types/index.ts:71`) models `DRAFT/SENT/PAID/OVERDUE/CANCELLED`, and the watermark mechanism already exists (the `voided` prop, `printable-document.tsx:59-65`) — but `InvoicePrint.tsx` never passes it (confirmed by grep in Assessment B: no `voided` reference in the file). A cancelled invoice and a paid one print pixel-identical, which matters for a document that doubles as a bookkeeping record.
- **Fix**: map `invoice.status`/`quotation.status` to a status badge or watermark on those two print routes, the same way `ReceiptPrint.tsx` already does for `Receipt.voided`.
- **Suggested command**: `/impeccable harden`

## Persona Red Flags

**First-time small-business owner (setting up their company profile)**: Nothing stops them from picking a pale/pastel brand color in Definições — it silently makes their own invoice heading and borders barely legible once printed on a black-and-white office printer, and they won't notice it on a bright color monitor at 100% opacity to catch it before it ships to a client.

**Client receiving and paying the invoice**: Has to hunt for the amount due because it's the same size as every other totals line, while "FATURA" dominates the page. If paying via M-Pesa, has to read past Banco/Conta/NIB/SWIFT fields with no sub-grouping to find their number — the payment box treats a bank wire and a mobile-money number as interchangeable line items.

**Someone reviewing printed invoices for a tax/audit trail**: NUIT is present for both parties and sequential numbering exists, but the printed page carries no indication of paid/overdue/cancelled state — from the paper alone, a stack of printed invoices in a drawer all look equally "final," even though the app itself tracks that distinction.

## Minor Observations

- Footer (`printable-document.tsx:239-242`) repeats the company name and NUIT already shown 6 lines above in the header — the footer text at `text-neutral-400` also fails WCAG AA contrast (2.52:1, needs 4.5:1); the redundant duplication could instead carry something like a print timestamp.
- Payment box (`lines 199-230`) lists Banco/Conta/NIB/SWIFT/M-Pesa/E-Mola as six undifferentiated entries in one grid — splitting into "Transferência bancária" vs. "Mobile money" sub-groups would make it scannable rather than a flat list to read in full.
- `client.phone` exists on the `Client` type but is never rendered in the client section, even though `company.phone` is rendered in the equivalent company block — asymmetric completeness between the two "who" blocks.
- Totals block is a fixed `w-56` with no overflow handling — untested against a large 7-digit MZN total.
- No `print-color-adjust: exact` in the `@media print` block — not biting today since no background colors are used yet, but will silently vanish the moment a status badge/chip (as recommended above) gets a background color.

## Questions to Consider

1. The total owed is the one fact this document exists to convey — was its current same-size-as-Subtotal treatment a deliberate minimalist choice, or did it just inherit the table's `text-sm` without a second pass?
2. `brand_color` is fully free-form with zero contrast constraints today — has an invoice actually been printed with a pale color on a real black-and-white office printer to see what a client receives?
3. The watermark mechanism already exists and is wired for receipts — was leaving invoices/quotations without any printed status indicator an intentional scope cut, or did it just not get extended past the first use case?
