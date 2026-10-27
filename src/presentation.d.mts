export type PresentationMode = 'resumido' | 'ampliado';
export type PresentationStudy = { title: string; passage: string; theme: string; introduction: string; points: {title:string; explanation:string; application:string}[]; conclusion:string; collection?:string; legacySections?:{title:string;content:string}[] };
export type PresentationSlide = { kicker:string; title:string; body:string[]; note:string };
export function defaultPresentationMode(study: Pick<PresentationStudy,'collection'>): PresentationMode;
export function cleanPresentationInstructions(value?:string):string;
export function splitPresentationText(value?:string,limit?:number):string[];
export function buildSlides(study:PresentationStudy,mode?:PresentationMode):PresentationSlide[];
export function createPresentationHtml(study:PresentationStudy,mode?:PresentationMode,logos?:{ceb?:string;church?:string}):string;
export function escapeHtml(value:unknown):string;

export function createPresentationHtmlFromSlides(slides:PresentationSlide[],metadata:{title:string;collection?:string},mode?:PresentationMode,logos?:{ceb?:string;church?:string}):string;
