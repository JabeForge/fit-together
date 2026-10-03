// Prepare a local photo before sending it to Storage. Never upload a raw
// original as fallback when decoding or compression fails.
(() => {
  const policies={progress:{edge:1600,bytes:512*1024,quality:.84},proof:{edge:1200,bytes:256*1024,quality:.80}};
  const fail=(code)=>Object.assign(new Error(code),{code});
  async function decode(file){
    if(window.createImageBitmap){
      try{return await window.createImageBitmap(file,{imageOrientation:'from-image'});}catch{}
    }
    const url=URL.createObjectURL(file),img=new Image();
    try{
      await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(fail('decode'));img.src=url;});
      return img;
    }finally{URL.revokeObjectURL(url);}
  }
  async function prepare(file,kind='progress'){
    const policy=policies[kind];if(!policy)throw fail('kind');
    if(!file||!file.size)throw fail('empty');
    if(file.size>32*1024*1024)throw fail('input-size');
    const types=['image/jpeg','image/png','image/webp','image/avif','image/heic','image/heif'];
    const ext=/\.(jpe?g|png|webp|avif|heic|heif)$/i.test(file.name||'');
    if((file.type&&!types.includes(file.type))||(!file.type&&!ext))throw fail('format');
    let image,canvas;
    try{
      image=await decode(file);
      const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
      if(!w||!h||w*h>64*1000*1000)throw fail('dimensions');
      const scale=Math.min(1,policy.edge/Math.max(w,h));
      let width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
      canvas=document.createElement('canvas');
      let blob;
      for(let pass=0;pass<6;pass++){
        canvas.width=width;canvas.height=height;
        const ctx=canvas.getContext('2d');if(!ctx)throw fail('encode');
        // JPEG cannot retain alpha; white avoids black transparent backgrounds.
        ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
        ctx.drawImage(image,0,0,width,height);
        for(const quality of [policy.quality,policy.quality-.08,policy.quality-.16,policy.quality-.24]){
          blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
          if(!blob||blob.type!=='image/jpeg')throw fail('encode');
          if(blob.size<=policy.bytes)break;
        }
        if(blob.size<=policy.bytes)break;
        if(Math.max(width,height)<=640)throw fail('output-size');
        const shrink=Math.max(.8,640/Math.max(width,height));
        width=Math.max(1,Math.round(width*shrink));height=Math.max(1,Math.round(height*shrink));
      }
      if(!blob||blob.size>policy.bytes)throw fail('output-size');
      const name=(file.name||'photo').replace(/\.[^.]+$/,'')+'.jpg';
      return new File([blob],name,{type:'image/jpeg',lastModified:Date.now()});
    }catch(error){throw error.code?error:fail('decode');}
    finally{image?.close?.();if(canvas){canvas.width=1;canvas.height=1;}}
  }
  function errorMessage(error,language){
    const en=language==='en';
    if(error.code==='input-size')return en?'This photo exceeds 32 MB. Please choose a smaller photo.':'Dieses Foto ist größer als 32 MB. Bitte wähle ein kleineres Foto.';
    if(error.code==='dimensions')return en?'This photo is too large to process. Please export a smaller version.':'Dieses Foto ist zu groß zum Verarbeiten. Bitte exportiere eine kleinere Version.';
    if(['decode','format','empty'].includes(error.code))return en?'This photo could not be opened. Please select a JPEG, PNG or WebP photo; if HEIC is unsupported, export it as JPEG.':'Dieses Foto konnte nicht geöffnet werden. Bitte wähle JPEG, PNG oder WebP. Falls HEIC nicht unterstützt wird, exportiere es als JPEG.';
    return en?'The photo could not be compressed. Please try a different photo.':'Das Foto konnte nicht verkleinert werden. Bitte versuche ein anderes Foto.';
  }
  window.FitTogetherImages={prepare,errorMessage};
})();
