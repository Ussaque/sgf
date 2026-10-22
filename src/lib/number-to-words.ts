// Portuguese (Mozambique/Portugal spelling) number-to-words conversion, used to print
// a receipt's amount "por extenso" the way a cheque or official recibo does.

const UNITS = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const TEENS = [
    'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze',
    'dezasseis', 'dezassete', 'dezoito', 'dezanove',
];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = [
    '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos',
    'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
];
const SCALES = [
    { singular: '', plural: '' },
    { singular: 'mil', plural: 'mil' },
    { singular: 'milhão', plural: 'milhões' },
    { singular: 'mil milhões', plural: 'mil milhões' },
];

const CURRENCY_NAMES: Record<
    string,
    { singular: string; plural: string; centSingular: string; centPlural: string }
> = {
    MZN: { singular: 'metical', plural: 'meticais', centSingular: 'centavo', centPlural: 'centavos' },
    USD: { singular: 'dólar', plural: 'dólares', centSingular: 'cêntimo', centPlural: 'cêntimos' },
    EUR: { singular: 'euro', plural: 'euros', centSingular: 'cêntimo', centPlural: 'cêntimos' },
    ZAR: { singular: 'rand', plural: 'rands', centSingular: 'cêntimo', centPlural: 'cêntimos' },
};

function convertUnder1000(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';

    const h = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];

    if (h > 0) parts.push(HUNDREDS[h]);

    if (rest > 0) {
        if (parts.length) parts.push('e');
        if (rest < 10) parts.push(UNITS[rest]);
        else if (rest < 20) parts.push(TEENS[rest - 10]);
        else {
            const t = Math.floor(rest / 10);
            const u = rest % 10;
            parts.push(u === 0 ? TENS[t] : `${TENS[t]} e ${UNITS[u]}`);
        }
    }

    return parts.join(' ');
}

function convertInteger(n: number): string {
    if (n === 0) return 'zero';

    const groups: number[] = [];
    let remaining = n;
    while (remaining > 0) {
        groups.push(remaining % 1000);
        remaining = Math.floor(remaining / 1000);
    }

    const segments: { text: string; value: number }[] = [];
    for (let i = groups.length - 1; i >= 0; i--) {
        const g = groups[i];
        if (g === 0) continue;

        let text: string;
        if ((i === 1 || i === 3) && g === 1) {
            text = SCALES[i].singular; // "mil" / "mil milhões" — no "um" prefix
        } else {
            const words = convertUnder1000(g);
            const scale = i === 0 ? '' : g === 1 ? SCALES[i].singular : SCALES[i].plural;
            text = scale ? `${words} ${scale}` : words;
        }
        segments.push({ text, value: g });
    }

    if (segments.length === 1) return segments[0].text;

    let result = segments[0].text;
    for (let idx = 1; idx < segments.length; idx++) {
        const segment = segments[idx];
        const isLast = idx === segments.length - 1;
        // Portuguese convention: the final group joins with "e" when it's below one
        // hundred or an exact multiple of a hundred ("mil e cem"); anything else
        // (a group with both hundreds and a remainder, like 272) joins with a comma.
        const joinsWithE = isLast && (segment.value < 100 || segment.value % 100 === 0);
        result += joinsWithE ? ` e ${segment.text}` : `, ${segment.text}`;
    }
    return result;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** e.g. amountToWords(22272, 'MZN') -> "Vinte e dois mil, duzentos e setenta e dois meticais". */
export function amountToWords(amount: number, currency = 'MZN'): string {
    const cur = CURRENCY_NAMES[currency] ?? CURRENCY_NAMES.MZN;
    const rounded = Math.round(amount * 100) / 100;
    const whole = Math.floor(rounded);
    const cents = Math.round((rounded - whole) * 100);

    const wholeWords = convertInteger(whole);
    // "um milhão de meticais", but "mil meticais" (no "de" after "mil").
    const needsDe = /milh(ão|ões)$/.test(wholeWords);
    const wholeLabel = whole === 1 ? cur.singular : cur.plural;
    let text = `${capitalize(wholeWords)} ${needsDe ? 'de ' : ''}${wholeLabel}`;

    if (cents > 0) {
        const centsLabel = cents === 1 ? cur.centSingular : cur.centPlural;
        text += ` e ${convertInteger(cents)} ${centsLabel}`;
    }

    return text;
}
