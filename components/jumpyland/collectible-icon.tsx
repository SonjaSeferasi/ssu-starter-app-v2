export function CollectibleIcon({level}:{level:number}){
 return <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true" focusable="false">
   {level===3?<><rect x="5" y="10" width="30" height="22" rx="4" fill="#e8d6b2" stroke="#8f6341" strokeWidth="2"/><rect x="4" y="7" width="7" height="28" rx="3" fill="#ad7d47"/><rect x="29" y="7" width="7" height="28" rx="3" fill="#ad7d47"/><path d="M19 12v18" stroke="#a95645" strokeWidth="5"/></>:<><circle cx="20" cy="20" r="17" fill={level===1?'#ffd65a':'#ffab43'} stroke="#bd8035" strokeWidth="2"/><circle cx="20" cy="20" r="13" fill="none" stroke="#ffe7a0" strokeWidth="1.5"/>{level===1?<path d="M20 10v20" stroke="#b07b27" strokeWidth="5" strokeLinecap="round"/>:<path d="m20 10 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" fill="#c65835"/>}</>}
 </svg>;
}
