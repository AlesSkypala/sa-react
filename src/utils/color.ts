export function colorToHex(color: [number, number, number]) {
    return '#' + color.map(c => c.toString(16).padStart(2, '0')).join('');
}

export function randomColor() {
    let color = '#';
    const chars = '0123456789abcdef';

    for (let i = 0; i < 6; i++) {
        color += chars[ Math.floor(Math.random() * chars.length) ];
    }

    return color;
}
