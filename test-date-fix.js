
const months = {
  'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
  'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
  'January': 0, 'February': 1, 'March': 2, 'April': 3, 'June': 5,
  'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
};

function parseVlrDate(vlrDate, vlrTime) {
  try {
    const parts = vlrDate.split(',').map(p => p.trim());
    if (parts.length < 2) return null;

    const monthDayPart = parts[1].split(' ');
    const monthName = monthDayPart[0];
    const day = parseInt(monthDayPart[1]);
    const month = months[monthName];

    if (month === undefined || isNaN(day)) return null;

    const now = new Date();
    let year = now.getFullYear();

    if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
        year = parseInt(parts[2]);
    } else if (now.getMonth() === 11 && month === 0) {
        year++;
    }

    const date = new Date(year, month, day);
    
    if (vlrTime && vlrTime.toLowerCase() !== 'live' && !vlrTime.includes('h')) {
        const timeMatch = vlrTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const ampm = timeMatch[3].toUpperCase();
            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            date.setHours(hours, minutes, 0, 0);
        }
    }
    return date.toISOString();
  } catch (e) {
    return e;
  }
}

console.log("Test 1 (Full Month, No Year):", parseVlrDate("Thursday, February 5", "5:00 PM"));
console.log("Test 2 (Full Month, With Year):", parseVlrDate("Thursday, February 5, 2026", "5:00 PM"));
console.log("Test 3 (Short Month):", parseVlrDate("Thu, Feb 5, 2026", "10:30 AM"));
console.log("Test 4 (Today format):", parseVlrDate("Today, February 5", "LIVE"));
