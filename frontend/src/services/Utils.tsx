function DateTimeFormat(date: string): string {
    if (!date) {
        return ''
    }
    const dataT = date.split('T')[0].split('-').reverse().join('/');
    return dataT
}

export default DateTimeFormat;