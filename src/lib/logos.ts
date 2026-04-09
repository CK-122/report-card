import logo1 from "../school logo/1.png";
import logo2 from "../school logo/2.png";
import logo3 from "../school logo/3.png";
import logo1_color from "../logo/C.K. JUNIOR HIGH SCHOOL COLURFULL LOGO.png";
import logo2_color from "../logo/C.K. HIGH SCHOOL COLURFULL logo.png";

// Next.js static imports return an object in some versions, or a string in others.
// We extract the 'src' which is the base64/URL data.
export const LOGO_SCHOOL_1 = (logo1 as any).src || logo1;
export const LOGO_SCHOOL_2 = (logo2 as any).src || logo2;
export const LOGO_SCHOOL_3 = (logo3 as any).src || logo3;

export const LOGO_SCHOOL_1_COLOR = (logo1_color as any).src || logo1_color;
export const LOGO_SCHOOL_2_COLOR = (logo2_color as any).src || logo2_color;
