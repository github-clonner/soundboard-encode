import { forEach, has, toNumber, isString } from 'lodash';

// Convert a #h#m#s string to seconds
export default function parseYoutubeStartTime(startTime) {
  if (!startTime) {
    return 0;
  }

  const time = {
    h: 0,
    m: 0,
    s: 0,
  };

  let accum = '';

  const startTimeChars = startTime.replace(/ /g, '').split('');

  forEach(startTimeChars, char => {
    if (has(time, char)) {
      if (!accum) {
        throw new Error(`The unit ${char} must have a value`);
      }
      time[char] = toNumber(accum);
      accum = '';
    } else {
      const charCode = char.charCodeAt();
      if (charCode >= '0'.charCodeAt() && charCode <= '9'.charCodeAt()) {
        accum += char;
      } else {
        throw new Error(`Invalid character ${char} found`);
      }
    }
  });

  const {
    h: hours,
    m: minutes,
    s: seconds,
  } = time;

  return (hours * 3600) + (minutes * 60) + seconds;
}