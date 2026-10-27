// Read PNG alpha to locate safe sprite viewports. Does not modify artwork pixels.
const fs=require('node:fs'),zlib=require('node:zlib');
const metadata={};
for(const file of fs.readdirSync('public/avatars/v4')){
 const p=fs.readFileSync('public/avatars/v4/'+file),w=p.readUInt32BE(16),h=p.readUInt32BE(20);let parts=[];
 for(let i=8;i<p.length;){const n=p.readUInt32BE(i),t=p.toString('ascii',i+4,i+8);if(t==='IDAT')parts.push(p.subarray(i+8,i+8+n));i+=n+12;}
 const raw=zlib.inflateSync(Buffer.concat(parts)),stride=w*4;let prev=Buffer.alloc(stride),offset=0,counts=[],columns=Array(w).fill(0);
 for(let y=0;y<h;y++){const filter=raw[offset++],row=Buffer.alloc(stride);let count=0;
  for(let x=0;x<stride;x++){const a=x>=4?row[x-4]:0,b=prev[x],c=x>=4?prev[x-4]:0;let pred=0;
   if(filter===1)pred=a;else if(filter===2)pred=b;else if(filter===3)pred=Math.floor((a+b)/2);else if(filter===4){const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);pred=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
   row[x]=(raw[offset++]+pred)&255;if(x%4===3&&row[x]>16){count++;columns[(x-3)/4]++;}
  }counts.push(count);prev=row;
 }
 let split=Math.floor(h/2);for(let y=Math.floor(h*.47);y<Math.floor(h*.54);y++)if(counts[y]<counts[split]||counts[y]===counts[split]&&Math.abs(y-h/2)<Math.abs(split-h/2))split=y;
 const gap=(target)=>{let best=Math.round(w*target);for(let x=Math.floor(w*(target-.07));x<Math.ceil(w*(target+.07));x++)if(columns[x]<columns[best]||columns[x]===columns[best]&&Math.abs(x-w*target)<Math.abs(best-w*target))best=x;return best;};
 metadata[file]={width:w,height:h,columns:[0,gap(1/3),gap(2/3),w],row:split};
 console.log(file,metadata[file]);
}

fs.writeFileSync('lib/avatar-atlases.json',JSON.stringify(metadata,null,2)+'\n');
