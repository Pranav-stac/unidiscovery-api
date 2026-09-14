import { parseNiosCoursePage, parseNiosListing } from './official-media.parser';

const COURSE_SNIPPET = `
1.[Chapter 1. Number Systems (2 MB)](https://www.nios.ac.in/media/documents/SecMathcour/Eng/Chapter-1.pdf)
1.[पाठ 1. संख्या](https://www.nios.ac.in/media/documents/SecMathcour/Hindi/Chapter-1.pdf)
[L-1 (part1)](https://www.nios.ac.in/audio_files/secondary_audio/sec_maths/L-1Part_1_math_sec.mp3)
2.[Chapter 2. Exponents and Radicals (2.5 MB)](https://www.nios.ac.in/media/documents/SecMathcour/Eng/Chapter-2.pdf)
[Rational and Irrational Numbers](https://www.youtube.com/watch?v=UOFXhEv9jqI)
[EXPONENT AND RADICALS](https://www.youtube.com/watch?v=eFEAdsLfDVo)
[LAW OF EXPONENT](https://www.youtube.com/watch?v=XGXZzoLq-Oc)
3.[Chapter 3. Algebraic Expressions and Polynomials](https://www.nios.ac.in/media/documents/SecMathcour/Eng/Chapter-3.pdf)
[SURDS](https://www.youtube.com/watch?v=R5dpF0DanG8)
`;

const LISTING_SNIPPET = `
[Mathematics (211)](https://www.nios.ac.in/online-course-material/secondary-courses/mathematics-(211)-syllabus.aspx)
[Science and Technology (212)](https://www.nios.ac.in/online-course-material/secondary-courses/science-and-technology-(212)-syllabus.aspx)
`;

describe('official-media.parser', () => {
  it('reads chapter PDFs, official YouTube, and audio from a NIOS course page', () => {
    const units = parseNiosCoursePage(COURSE_SNIPPET);
    expect(units).toHaveLength(3);
    expect(units[0]).toMatchObject({
      chapter: 1,
      title: 'Number Systems',
      textbookUrl: 'https://www.nios.ac.in/media/documents/SecMathcour/Eng/Chapter-1.pdf',
      videos: [],
      audios: ['https://www.nios.ac.in/audio_files/secondary_audio/sec_maths/L-1Part_1_math_sec.mp3'],
    });
    expect(units[1].videos).toEqual([
      'https://www.youtube.com/watch?v=UOFXhEv9jqI',
      'https://www.youtube.com/watch?v=eFEAdsLfDVo',
      'https://www.youtube.com/watch?v=XGXZzoLq-Oc',
    ]);
    expect(units[2].title).toBe('Algebraic Expressions and Polynomials');
  });

  it('reads subject course pages from a NIOS listing', () => {
    const courses = parseNiosListing(LISTING_SNIPPET);
    expect(courses.map((item) => item.subjectId)).toEqual([
      'mathematics',
      'science-and-technology',
    ]);
    expect(courses[0].pageUrl).toContain('mathematics-(211)-syllabus.aspx');
  });
});
