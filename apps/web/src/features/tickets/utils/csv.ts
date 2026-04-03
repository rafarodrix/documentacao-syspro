export function downloadCsv(filename: string, rows: Record<string, any>[]) {
    if (!rows || !rows.length) return;
    
    // Extract headers based on the first object's keys
    const headers = Object.keys(rows[0]);
    
    // Create CSV content
    const csvContent = [
        headers.join(','), // Header row
        ...rows.map(row => headers.map(header => {
            let val = row[header];
            if (val === null || val === undefined) val = '';
            const strVal = String(val).replace(/"/g, '""');
            // Quote fields containing commas, newlines, or double quotes
            return /["\n,]/.test(strVal) ? `"${strVal}"` : strVal;
        }).join(','))
    ].join('\n');
    
    // Create blob with UTF-8 BOM so Excel opens it with correct encoding
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link and trigger click
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
