// Mount every visible behavior plus the next three offscreen behaviors.
// At the end of the gallery, use preceding behaviors to fill the buffer.
export function previewWindow(bounds,height){
 const visible=bounds.flatMap((b,i)=>b.bottom>0&&b.top<height?[i]:[]);
 if(!visible.length)return bounds[0]?.top>=height&&bounds[0].top<height+500?[0,1,2].filter(i=>i<bounds.length):[];
 const first=visible[0],last=visible.at(-1);
 const after=bounds.map((_,i)=>i).slice(last+1);
 const before=Array.from({length:first},(_,i)=>first-i-1);
 return [...visible,...after.concat(before).slice(0,3)];
}
