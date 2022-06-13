export function escapeHtml(text: string) {
    let lookup: Record<string, string> = {
        '&': "&amp;",
        '"': "&quot;",
        '\'': "&apos;",
        '<': "&lt;",
        '>': "&gt;"
    };
    return text.replace( /[&"'<>]/g, c => lookup[c] );
}