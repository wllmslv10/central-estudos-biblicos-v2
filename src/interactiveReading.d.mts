import type {PresentationStudy} from './presentation.mjs';
export function createReadingHtml(source:PresentationStudy,options?:{audience?:'teacher'|'student';translation?:string;notice?:string;arBible?:Record<string,unknown>}):string;
