import type {PresentationStudy} from './presentation.mjs';
export function downloadReadingPdf(study:PresentationStudy,audience:'teacher'|'student'):Promise<void>;
