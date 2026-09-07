import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat.js';
import arraySupport from 'dayjs/plugin/arraySupport.js';
import bigIntSupport from 'dayjs/plugin/bigIntSupport.js';
import buddhistEra from 'dayjs/plugin/buddhistEra.js';
import calendar from 'dayjs/plugin/calendar.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import dayOfYear from 'dayjs/plugin/dayOfYear.js';
import duration from 'dayjs/plugin/duration.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import isLeapYear from 'dayjs/plugin/isLeapYear.js';
import isoWeek from 'dayjs/plugin/isoWeek.js';
import isoWeeksInYear from 'dayjs/plugin/isoWeeksInYear.js';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import isToday from 'dayjs/plugin/isToday.js';
import isTomorrow from 'dayjs/plugin/isTomorrow.js';
import isYesterday from 'dayjs/plugin/isYesterday.js';
import localeData from 'dayjs/plugin/localeData.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import minMax from 'dayjs/plugin/minMax.js';
import objectSupport from 'dayjs/plugin/objectSupport.js';
import quarterOfYear from 'dayjs/plugin/quarterOfYear.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import timezone from 'dayjs/plugin/timezone.js';
import toArray from 'dayjs/plugin/toArray.js';
import toObject from 'dayjs/plugin/toObject.js';
import updateLocale from 'dayjs/plugin/updateLocale.js';
// Time manipulation and formatting
import utc from 'dayjs/plugin/utc.js';
import weekday from 'dayjs/plugin/weekday.js';
import weekOfYear from 'dayjs/plugin/weekOfYear.js';
import weekYear from 'dayjs/plugin/weekYear.js';

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
dayjs.extend(bigIntSupport);

// Locale plugins
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(buddhistEra);
dayjs.extend(updateLocale);

export const date = dayjs;
