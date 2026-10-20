export type CostumeStyle={id:string;name:string;shirt:string;pants:string};

// Costume accents sit over the existing shaded avatar artwork. Face, hair,
// skin, hands and the animated legs all remain the student's original layers.
export function CostumeDetails({costume,id}:{costume:CostumeStyle;id:string}){
  const kind=costume.id,plumber=kind==='mario'||kind==='luigi';
  if(['goku','vegeta','piccolo'].includes(kind)){
    const column=['goku','vegeta','piccolo'].indexOf(kind);
    return <svg x="79" y="90" width="217" height="391" style={{width:217,height:391,maxWidth:'none',maxHeight:'none',overflow:'hidden'}} viewBox="0 0 512 1024" preserveAspectRatio="none" overflow="hidden" aria-hidden="true"><image href="/jumpyland/dragon-outfits-v2.png" x={-column*512} y="0" width="1536" height="1024"/></svg>;
  }
  return <g aria-hidden="true">
    <defs><linearGradient id={id+'costume'} x1="0" y1="0" x2="1" y2="1"><stop stopColor={costume.shirt}/><stop offset=".5" stopColor={costume.shirt}/><stop offset="1" stopColor="#152638"/></linearGradient><linearGradient id={id+'armor'} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#fff9e9"/><stop offset=".6" stopColor="#cdd2d1"/><stop offset="1" stopColor="#7c8b9c"/></linearGradient></defs>
    {plumber?<>
      <path d="M146 159 160 152 164 183 211 177 215 145 229 144 234 256 138 262Z" fill="#315b8d" stroke="#1c385e" strokeWidth="2"/>
      <path d="M151 162 158 190M220 151 217 185M148 244Q185 251 227 242" fill="none" stroke="#83a4c5" strokeWidth="2" opacity=".65"/>
      <circle cx="165" cy="188" r="4" fill="#dfc276"/><circle cx="211" cy="183" r="4" fill="#dfc276"/>
      <path d="M170 207 205 203 206 228Q188 240 171 229Z" fill="#294c79" stroke="#6b8aac"/>
      <g transform="rotate(7 210 58)"><path d="M178 54Q177 18 210 22 246 20 247 54L239 61 182 62Z" fill={kind==='mario'?'#c5423a':'#3f8856'} stroke="#364542" strokeWidth="1.5"/><path d="M179 53Q220 47 252 62 227 69 186 64Z" fill={kind==='mario'?'#9f302c':'#2c6242'}/><ellipse cx="211" cy="40" rx="13" ry="11" fill="#f7ebd6"/><text x="211" y="46" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="16" fill={kind==='mario'?'#a3312c':'#326946'}>{kind==='mario'?'M':'L'}</text></g>
    </>:kind==='goku'?<>
      <path d="M155 132 190 155 225 131 243 250 138 257Z" fill={'url(#'+id+'costume)'} stroke="#a34729" strokeWidth="2"/>
      <path d="M155 133 189 160 222 134 205 174 190 190Z" fill="#253d69"/>
      <path d="M142 242 237 238 239 253 142 261Z" fill="#24395b"/><path d="M193 249 209 281 196 279 183 250" fill="#24395b"/>
      <circle cx="218" cy="188" r="12" fill="#f0dfb8" stroke="#273d58" strokeWidth="2"/><path d="m213 188 9-4-4 10-3-13m-5 12 15-2" stroke="#293c50" fill="none" strokeWidth="1.8"/>
    </>:kind==='vegeta'?<>
      <path d="M151 132 174 151 211 145 228 127 244 155 239 240Q192 261 140 244L137 160Z" fill={'url(#'+id+'armor)'} stroke="#6b7b8c" strokeWidth="2"/>
      <path d="M156 135 167 155 165 181 146 178 139 158ZM216 145 229 131 240 157 230 179 215 177Z" fill="#d1ad69" stroke="#a27f47"/>
      <path d="M149 205Q191 221 235 201L234 239Q187 254 145 239Z" fill="#ccac73"/>
      {[0,1,2,3].map(n=><path key={n} d={'M148 '+(213+n*7)+'Q188 '+(228+n*7)+' 235 '+(210+n*7)} fill="none" stroke="#9e804c" strokeWidth="1.5"/>)}
    </>:kind==='piccolo'?<>
      <path d="M153 125 183 141 226 123 262 145 274 260 238 246 232 160 152 171 132 262 106 254 121 148Z" fill={'url(#'+id+'armor)'} stroke="#a2abb0" strokeWidth="2"/>
      <path d="M148 240 234 232 238 251 143 259Z" fill="#386c94"/><path d="M191 248 209 281 200 286 181 249" fill="#3b719d"/>
    </>:kind==='naruto'?<>
      <path d="M153 133 181 149 225 131 240 173 137 183Z" fill="#303b43"/>
      <path d="M187 154 193 250" stroke="#b8b8a2" strokeWidth="3"/><path d="M143 221 177 215 178 234 142 240M202 211 234 205 237 225 205 232" fill="#bf6532" stroke="#8f4d2e"/>
      <g transform="rotate(7 210 59)"><path d="M180 48 244 46 244 59 180 63Z" fill="#293d50"/><rect x="191" y="47" width="37" height="13" rx="3" fill="#abb7b9"/><path d="M203 55q-6-7 3-6 8 5 0 8l8-2" fill="none" stroke="#4b6266" strokeWidth="1.4"/></g>
    </>:kind==='sasuke'?<>
      <path d="M157 126 186 150 221 127 210 184 180 202Z" fill="#30384e"/><path d="M157 126 183 160 175 184 148 143M220 126 190 161 202 180 234 138" fill="#dad8d2" stroke="#8e929b"/>
      <path d="M141 249Q185 267 239 245M142 256Q190 274 240 252" fill="none" stroke="#8164a5" strokeWidth="7"/>
      <path d="M192 256q-24 25 3 26 27-5 4-24m-1 3 13 44m-16-44-9 46" fill="none" stroke="#a18abf" strokeWidth="6"/>
    </>:kind==='kakashi'?<>
      <path d="M154 131 175 147 218 135 232 129 245 247 138 260 140 158Z" fill={'url(#'+id+'costume)'} stroke="#3f5947" strokeWidth="2"/>
      <path d="M191 153 194 251" stroke="#a5ad83" strokeWidth="2"/>
      {[0,1].map(n=><g key={n}><path d={'M'+(148+n*53)+' 183 '+(178+n*53)+' 180 '+(180+n*53)+' 215 '+(147+n*53)+' 219Z'} fill="#788d65" stroke="#3d5a46"/><path d={'M'+(148+n*53)+' 187 '+(179+n*53)+' 184'} stroke="#a6b294" strokeWidth="2"/></g>)}
      <g transform="rotate(7 210 59)"><path d="M180 47 244 47 245 60 181 62Z" fill="#2c3e50"/><rect x="188" y="48" width="35" height="12" rx="3" fill="#abb8b9"/><path d="M201 55q-5-7 2-5 7 4 0 7l8-2" fill="none" stroke="#4a6364" strokeWidth="1.4"/></g>
    </>:null}
  </g>;
}
