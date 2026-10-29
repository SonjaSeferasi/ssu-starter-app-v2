/** One browser timezone is used for the date and time of every recorded timestamp. */
export function loginDate(timestamp:string,timeZone:string,locale='en-US'){
  const date=new Date(timestamp);
  if(!Number.isFinite(date.getTime()))return 'Date unavailable';
  return new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric',timeZone}).format(date);
}
