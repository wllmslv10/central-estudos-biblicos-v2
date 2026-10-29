export type PresentationCover = {src:string;alt?:string};
export type PresentationOptions = {cover?:PresentationCover|null;preserveSource?:boolean};
export type PresentationAssets = {ceb?:string;church?:string;cover?:string};
export type PresentationMode = 'resumido' | 'ampliado';
export type PresentationStudy = { title: string; passage: string; theme: string; introduction: string; points: {title:string; explanation:string; application:string;presentationRole?:'group-activity'}[]; conclusion:string; collection?:string; legacySections?:{title:string;content:string;presentationRole?:'group-activity'}[] };
export type PresentationSlide = { kicker:string; title:string; body:string[]; note:string; presentationRole?:'group-activity' };
export function defaultPresentationMode(study: Pick<PresentationStudy,'collection'>): PresentationMode;
export function cleanPresentationInstructions(value?:string):string;
export function splitPresentationText(value?:string,limit?:number):string[];
export function buildSlides(study:PresentationStudy,mode?:PresentationMode):PresentationSlide[];
export function createPresentationHtml(study:PresentationStudy,mode?:PresentationMode,logos?:PresentationAssets,options?:PresentationOptions):string;
export function escapeHtml(value:unknown):string;

export function createPresentationHtmlFromSlides(slides:PresentationSlide[],metadata:{title:string;collection?:string},mode?:PresentationMode,logos?:PresentationAssets,options?:PresentationOptions):string;

export function reviewPresentationInstructions(value?:string):{text:string;removed:string[]};

export function omitPresentationActivities(value?:string):string;
