import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import arraySupport from 'dayjs/plugin/arraySupport';
import bigintSupport from 'dayjs/plugin/bigintSupport';
import buddhistEra from 'dayjs/plugin/buddhistEra';
import calendar from 'dayjs/plugin/calendar';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import dayOfYear from 'dayjs/plugin/dayOfYear';
import duration from 'dayjs/plugin/duration';
import isBetween from 'dayjs/plugin/isBetween';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isToday from 'dayjs/plugin/isToday';
import isTomorrow from 'dayjs/plugin/isTomorrow';
import isYesterday from 'dayjs/plugin/isYesterday';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import minMax from 'dayjs/plugin/minMax';
import objectSupport from 'dayjs/plugin/objectSupport';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import toArray from 'dayjs/plugin/toArray';
import toObject from 'dayjs/plugin/toObject';
import updateLocale from 'dayjs/plugin/updateLocale';
// Time manipulation and formatting
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import weekYear from 'dayjs/plugin/weekYear';

// Time manipulation and formatting
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(calendar);
dayjs.extend(relativeTime);
dayjs.extend(duration);

// Comparison plugins
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(isBetween);
dayjs.extend(isToday);
dayjs.extend(isTomorrow);
dayjs.extend(isYesterday);
dayjs.extend(isLeapYear);

// Week and quarter plugins
dayjs.extend(dayOfYear);
dayjs.extend(weekOfYear);
dayjs.extend(weekYear);
dayjs.extend(weekday);
dayjs.extend(isoWeek);
dayjs.extend(isoWeeksInYear);
dayjs.extend(quarterOfYear);

// Conversion plugins
dayjs.extend(toArray);
dayjs.extend(toObject);

// Utility plugins
dayjs.extend(minMax);
dayjs.extend(objectSupport);
dayjs.extend(arraySupport);
dayjs.extend(bigintSupport);

// Locale plugins
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(buddhistEra);
dayjs.extend(updateLocale);

export const date = dayjs;
