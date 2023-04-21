export default function (source : string) {
    if (source.indexOf('#'))
        return [source, ''];
    
    const lines = source.split('\n');
    const result = lines.slice(1).join('\n');
    const [shebang] = lines;
    
    return [
        result,
        `${shebang}\n`,
    ];
}