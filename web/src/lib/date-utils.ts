/**
 * Date formatting utilities for locale-aware date display
 * Automatically detects browser locale and formats dates accordingly
 */

export interface DateFormatOptions {
  locale?: string;
  dateStyle?: 'short' | 'medium' | 'long' | 'full';
  timeStyle?: 'short' | 'medium' | 'long' | 'full';
  timeZone?: string;
}

/**
 * Get user's preferred locale from browser settings
 * Falls back to 'en-US' if unavailable
 */
export function getUserLocale(): string {
  if (typeof window !== 'undefined' && window.navigator) {
    return navigator.language || navigator.languages?.[0] || 'en-US';
  }
  return 'en-US';
}

/**
 * Format date string to localized date format
 * @param dateString - ISO 8601 date string from API
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string | Date,
  options: DateFormatOptions = {}
): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Invalid date check
  if (isNaN(date.getTime())) return '';

  const locale = options.locale || getUserLocale();
  
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: options.timeZone,
      ...options
    }).format(date);
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    console.warn('Date formatting failed, using fallback:', error);
    return date.toLocaleDateString('en-US');
  }
}

/**
 * Format date string to localized date and time format
 * @param dateString - ISO 8601 date string from API
 * @param options - Formatting options
 * @returns Formatted date and time string
 */
export function formatDateTime(
  dateString: string | Date,
  options: DateFormatOptions = {}
): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Invalid date check
  if (isNaN(date.getTime())) return '';

  const locale = options.locale || getUserLocale();
  
  try {
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      // TEMPORARY FIX: Force UTC timezone until backend @field_serializer is fixed
      // TODO: Remove this after backend properly serializes datetime with 'Z' suffix
      timeZone: options.timeZone || 'UTC',
      ...options
    };
    
    // Show UTC indicator for temporary fix
    if (!options.timeZoneName && !options.timeZone) {
      formatOptions.timeZoneName = 'short'; // Will show "UTC"
    } else if (options.timeZoneName) {
      formatOptions.timeZoneName = options.timeZoneName;
    }
    
    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    console.warn('DateTime formatting failed, using fallback:', error);
    return date.toLocaleString('en-US');
  }
}

/**
 * Format time only (no date)
 * @param dateString - ISO 8601 date string from API
 * @param options - Formatting options
 * @returns Formatted time string
 */
export function formatTime(
  dateString: string | Date,
  options: DateFormatOptions = {}
): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Invalid date check
  if (isNaN(date.getTime())) return '';

  const locale = options.locale || getUserLocale();
  
  try {
    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // TEMPORARY FIX: Force UTC timezone until backend @field_serializer is fixed
      timeZone: options.timeZone || 'UTC',
      ...options
    };
    
    // Show UTC indicator for temporary fix
    if (!options.timeZoneName && !options.timeZone) {
      formatOptions.timeZoneName = 'short'; // Will show "UTC"
    } else if (options.timeZoneName) {
      formatOptions.timeZoneName = options.timeZoneName;
    }
    
    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
  } catch (error) {
    // Fallback to basic formatting if Intl fails
    console.warn('Time formatting failed, using fallback:', error);
    return date.toLocaleTimeString('en-US');
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * @param dateString - ISO 8601 date string from API
 * @param options - Formatting options
 * @returns Relative time string
 */
export function formatRelativeTime(
  dateString: string | Date,
  options: { locale?: string } = {}
): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // Invalid date check
  if (isNaN(date.getTime())) return '';

  const locale = options.locale || getUserLocale();
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (diffInSeconds < 604800) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else {
      // For dates older than a week, show absolute date
      return formatDate(date, options);
    }
  } catch (error) {
    // Fallback for browsers that don't support RelativeTimeFormat
    console.warn('Relative time formatting failed, using fallback:', error);
    return formatDate(date, options);
  }
}

/**
 * Check if a date is today
 * @param dateString - ISO 8601 date string from API
 * @returns True if date is today
 */
export function isToday(dateString: string | Date): boolean {
  if (!dateString) return false;

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const today = new Date();
  
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Check if a date is yesterday
 * @param dateString - ISO 8601 date string from API
 * @returns True if date is yesterday
 */
export function isYesterday(dateString: string | Date): boolean {
  if (!dateString) return false;

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

/**
 * Smart date formatting that shows relative time for recent dates
 * and absolute dates for older ones
 * @param dateString - ISO 8601 date string from API
 * @param options - Formatting options
 * @returns Smart formatted date string
 */
export function formatSmartDate(
  dateString: string | Date,
  options: DateFormatOptions = {}
): string {
  if (!dateString) return '';

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  // Show relative time for recent dates (within 7 days)
  if (diffInDays <= 7) {
    return formatRelativeTime(date, options);
  } else {
    // Show absolute date for older dates
    return formatDate(date, options);
  }
}

/**
 * Format date with timezone display (for user preference settings)
 * @param dateString - ISO 8601 date string from API
 * @param options - Formatting options
 * @returns Formatted date string with timezone indicator
 */
export function formatDateTimeWithTimezone(
  dateString: string | Date,
  options: DateFormatOptions = {}
): string {
  return formatDateTime(dateString, { 
    ...options, 
    timeZoneName: 'short' 
  });
}

/**
 * Format time with timezone display (for user preference settings)
 * @param dateString - ISO 8601 date string from API
 * @param options - Formatting options
 * @returns Formatted time string with timezone indicator
 */
export function formatTimeWithTimezone(
  dateString: string | Date,
  options: DateFormatOptions = {}
): string {
  return formatTime(dateString, { 
    ...options, 
    timeZoneName: 'short' 
  });
}