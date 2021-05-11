export type Color = [R: number, G: number, B: number];

export function colorToHex(color: Color): string {
    return '#' + color.map(c => c.toString(16).padStart(2, '0')).join('');
}

export function randomColor(): Color {
    return [0, 0, 0].map(() => Math.floor(255 * Math.random())) as Color;
}

export function randomColorDark(): Color {
    // for a tutorial on custom probability distributions see:
    // https://programming.guide/generate-random-value-with-distribution.html

    const h = Math.random();
    const s = Math.sqrt(0.2 + Math.random() * 0.8);
    const l = Math.random() * 0.7;

    return hslToColor(h, s, l);
}


// HSL to RGB
// https://stackoverflow.com/a/9493060/1137334

function hue2rgb(p: number, q: number, t: number){
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

/**
 * @param h hue, a value from 0 to 1
 * @param s saturation, a value from 0 to 1
 * @param l lightness, a value from 0 to 1
 */
export function hslToColor(h: number, s: number, l: number): Color {
    let r = 0, g = 0, b = 0;

    if (s == 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
