// Date and time helper functions

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current hour time in HH:00 format
 */
export const getCurrentHourTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  return `${hours}:00`;
};

/**
 * Format date string to display format
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Get weekday abbreviation
 */
export const getWeekday = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return weekdays[date.getDay()];
};

/**
 * Get default time slot with current hour and one hour duration
 * @returns Default TimeSlot object
 */
export const getDefaultTimeSlot = () => {
  const now = new Date();
  const startHours = now.getHours();
  const endHours = (startHours + 1) % 24;
  
  return {
    country: 'Thailand',
    timezone: 'Asia/Bangkok',
    startTime: `${String(startHours).padStart(2, '0')}:00`,
    endTime: `${String(endHours).padStart(2, '0')}:00`
  };
};