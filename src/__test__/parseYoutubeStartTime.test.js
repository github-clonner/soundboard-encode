import parseYoutubeStartTime from '../parseYoutubeStartTime';

describe('parseYoutubeStartTime', () => {
  it('should parse a properly formatted string', () => {
    const startTime = '1h1m20s';

    const startTimeSeconds = parseYoutubeStartTime(startTime);

    expect(startTimeSeconds).toEqual(3680);
  });
  it('should parse a properly formatted string with units in any order', () => {
    const startTime = '1m20s1h';

    const startTimeSeconds = parseYoutubeStartTime(startTime);

    expect(startTimeSeconds).toEqual(3680);
  });
  it('should parse a properly formatted string with any number of spaces', () => {
    const startTime = '    1 h 1       m  2     0 s';

    const startTimeSeconds = parseYoutubeStartTime(startTime);

    expect(startTimeSeconds).toEqual(3680);
  });
  it('should error when a unit is specified with no value', () => {
    const startTime = '1hm20s';

    expect(() => {
      parseYoutubeStartTime(startTime);
    }).toThrow();
  });
  it('should error when a character that is not a digit is specified', () => {
    const startTime = '1h1asdasdm20s';

    expect(() => {
      parseYoutubeStartTime(startTime);
    }).toThrow();
  });
});