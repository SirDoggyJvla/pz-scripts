export function colorText(text: string, color: string): string {
    return `<span style="color:${color};">${text}</span>`;
}

export function underlineText(text: string): string {
    return `<ins>${text}</ins>`;
}

export function boldText(text: string): string {
    return `<strong>${text}</strong>`;
}