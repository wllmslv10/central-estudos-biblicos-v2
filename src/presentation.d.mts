export type PresentationCover = {src:string;alt?:string};
export type PresentationOptions = {cover?:PresentationCover|null;preserveSource?:boolean;review?:boolean};
export type PresentationAssets = {ceb?:string;church?:string;cover?:string};
export type PresentationMode = 'resumido' | 'ampliado' | 'explicativo';
export type PresentationStudy = { presentationLayoutVersion?:'explicativo-v1'; title: string; passage: string; theme: string; introduction: string; points: {title:string; explanation:string; application:string;presentationRole?:'group-activity'}[]; conclusion:string; collection?:string; legacySections?:{title:string;content:string;presentationRole?:'group-activity'}[] };
export type PresentationSlide = { kicker:string; title:string; body:string[]; note:string; presentationRole?:'group-activity';titleLines?:1;topic?:string };
export function defaultPresentationMode(study: Pick<PresentationStudy,'collection'>): PresentationMode;
export function cleanPresentationInstructions(value?:string):string;
export function splitPresentationText(value?:string,limit?:number):string[];
export function buildSlides(study:PresentationStudy,mode?:PresentationMode):PresentationSlide[];
export function createPresentationHtml(study:PresentationStudy,mode?:PresentationMode,logos?:PresentationAssets,options?:PresentationOptions):string;
export function escapeHtml(value:unknown):string;

export function createPresentationHtmlFromSlides(slides:PresentationSlide[],metadata:{title:string;collection?:string},mode?:PresentationMode,logos?:PresentationAssets,options?:PresentationOptions):string;

export function reviewPresentationInstructions(value?:string):{text:string;removed:string[]};

export function omitPresentationActivities(value?:string):string;

export function defaultNewPresentationMode(study?:PresentationStudy):'explicativo';
export function presentationUsesExpandedIdentity(study:Pick<PresentationStudy,'collection'>,mode:PresentationMode):boolean;
