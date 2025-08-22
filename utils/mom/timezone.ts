// Timezone utilities for calculating time differences

export interface TimezoneInfo {
  name: string;
  offset: number; // Hours from UTC
}

// Timezone offset mapping (relative to UTC)
export const timezoneOffsets: Record<string, TimezoneInfo> = {
  'Asia/Bangkok': { name: 'Thailand', offset: 7 },
  'Asia/Tokyo': { name: 'Japan', offset: 9 },
  'Asia/Singapore': { name: 'Singapore', offset: 8 },
  'Asia/Manila': { name: 'Philippines', offset: 8 },
  'Asia/Jakarta': { name: 'Indonesia', offset: 7 },
  'Asia/Kuala_Lumpur': { name: 'Malaysia', offset: 8 },
  'Asia/Ho_Chi_Minh': { name: 'Vietnam', offset: 7 },
  'Asia/Yangon': { name: 'Myanmar', offset: 6.5 },
  'Asia/Seoul': { name: 'South Korea', offset: 9 },
  'Asia/Shanghai': { name: 'China', offset: 8 },
  'Asia/Hong_Kong': { name: 'Hong Kong', offset: 8 },
  'Asia/Taipei': { name: 'Taiwan', offset: 8 },
};

export interface ConvertedTime {
  time: string;
  dayOffset: number;
}

/**
 * Converts a time string with timezone offset
 * Handles day boundaries (e.g., 23:00 + 2 hours = 01:00 next day)
 * @param timeStr - Time in HH:MM format
 * @param offsetHours - Hours to add/subtract (can be decimal like 0.5)
 * @return Object with converted time and day offset
 */
export function convertTimeWithOffset(timeStr: string, offsetHours: number): ConvertedTime {
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Convert offset to minutes to handle half-hour offsets
  const offsetMinutes = offsetHours * 60;
  let totalMinutes = hours * 60 + minutes + offsetMinutes;
  
  // Calculate day offset
  let dayOffset = 0;
  while (totalMinutes < 0) {
    totalMinutes += 24 * 60;
    dayOffset--;
  }
  while (totalMinutes >= 24 * 60) {
    totalMinutes -= 24 * 60;
    dayOffset++;
  }
  
  // Convert back to hours and minutes
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  
  // Format time string
  const timeString = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  
  return {
    time: timeString,
    dayOffset: dayOffset,
  };
}

/**
 * Calculates time in different timezone
 * @param mainTimezone - Main timezone ID
 * @param mainTime - Time in main timezone (HH:MM)
 * @param targetTimezone - Target timezone ID
 * @return Converted time with day offset
 */
export function calculateTimezoneTime(
  mainTimezone: string,
  mainTime: string,
  targetTimezone: string
): ConvertedTime {
  const mainOffset = timezoneOffsets[mainTimezone]?.offset || 0;
  const targetOffset = timezoneOffsets[targetTimezone]?.offset || 0;
  const offsetDiff = targetOffset - mainOffset;
  
  return convertTimeWithOffset(mainTime, offsetDiff);
}

/**
 * Formats time with day offset indicator
 * @param time - Time string
 * @param dayOffset - Day offset
 * @return Formatted string
 */
export function formatTimeWithDayOffset(time: string, dayOffset: number): string {
  if (dayOffset === 0) {
    return time;
  }
  
  const dayIndicator = dayOffset > 0 ? `+${dayOffset} day` : `${dayOffset} day`;
  return `${time} (${dayIndicator})`;
}