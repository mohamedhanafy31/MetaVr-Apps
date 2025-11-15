// main.js - robust version (no imports; intended for direct browser include)

let THREECAMERA = null;
let threeStuffs = null;
let currentModel = null;
let currentOccluder = null;
let pendingModelKey = null;
let sceneInitialized = false;

/* safe dispose helper */
function disposeObject3D(obj){
  if(!obj) return;
  obj.traverse((child)=>{
    if(child.geometry){
      try{ child.geometry.dispose(); }catch(e){}
    }
    if(child.material){
      try{
        if(Array.isArray(child.material)){
          child.material.forEach(m=>{
            if(m.map) try{ m.map.dispose(); }catch(e){}
            try{ m.dispose(); }catch(e){}
          });
        } else {
          if(child.material.map) try{ child.material.map.dispose(); }catch(e){}
          try{ child.material.dispose(); }catch(e){}
        }
      }catch(e){}
    }
  });
}

/* detect callback (optional) */
function detect_callback(faceIndex, isDetected){
  console.log(isDetected ? "INFO: DETECTED" : "INFO: LOST");
}

/* load glasses using existing JeelizThreeGlassesCreator */
function loadGlassesModel(){
  if(!threeStuffs || !window.JeelizModelsConfig) {
    pendingModelKey = 'glasses';
    return;
  }

  const cfg = window.JeelizModelsConfig.glasses;
  // Remove previous occluder if any
  if(currentOccluder){
    threeStuffs.faceObject.remove(currentOccluder);
    disposeObject3D(currentOccluder);
    currentOccluder = null;
  }
  if(currentModel){
    threeStuffs.faceObject.remove(currentModel);
    disposeObject3D(currentModel);
    currentModel = null;
  }

  const r = JeelizThreeGlassesCreator({
    envMapURL: cfg.envMapURL,
    frameMeshURL: cfg.frameMeshURL,
    lensesMeshURL: cfg.lensesMeshURL,
    occluderURL: cfg.occluderURL
  });

  // Wait a tick because JeelizThreeGlassesCreator loads asynchronously (it adds meshes via callbacks).
  // But we can immediately add occluder & glasses if created synchronously by the creator.
  // Position occluder and frames with the same offsets as your original demo:
  const dy = (cfg.dy !== undefined) ? cfg.dy : 0.07;

  // If occluder exists on r, configure it and add.
  if(r.occluder){
    r.occluder.rotation.set(0.3, 0, 0);
    r.occluder.position.set(0, 0.03 + dy, -0.04);
    r.occluder.scale.multiplyScalar(cfg.occluderScale || 0.0084);
    threeStuffs.faceObject.add(r.occluder);
    currentOccluder = r.occluder;
  }

  if(r.glasses){
    r.glasses.position.set(0, dy, cfg.z || 0.4);
    r.glasses.scale.multiplyScalar(cfg.scale || 0.006);
    threeStuffs.faceObject.add(r.glasses);
    currentModel = r.glasses;
  }
}

/* load helmet model */
function loadHelmetModel(){
  if(!threeStuffs || !window.JeelizModelsConfig) {
    pendingModelKey = 'helmet';
    return;
  }

  const cfg = window.JeelizModelsConfig.helmet;

  // remove previous
  if(currentOccluder){
    threeStuffs.faceObject.remove(currentOccluder);
    disposeObject3D(currentOccluder);
    currentOccluder = null;
  }
  if(currentModel){
    threeStuffs.faceObject.remove(currentModel);
    disposeObject3D(currentModel);
    currentModel = null;
  }

  const helmetGroup = new THREE.Object3D();
  const loader = new THREE.BufferGeometryLoader();
  const textureLoader = new THREE.TextureLoader();

  // Helmet body
  if(cfg.helmetURL){
    loader.load(cfg.helmetURL, (geom) => {
      geom.computeVertexNormals && geom.computeVertexNormals();
      const mat = new THREE.MeshPhongMaterial({
        map: cfg.diffuseTextureURL ? textureLoader.load(cfg.diffuseTextureURL) : null,
        shininess: cfg.shininess || 50
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.frustumCulled = false;
      // default transforms (you can tune per-model in modelsConfig)
      mesh.scale.multiplyScalar(cfg.scale || 0.037);
      mesh.position.set(cfg.offsetX || 0, cfg.offsetY !== undefined ? cfg.offsetY : -0.3, cfg.offsetZ !== undefined ? cfg.offsetZ : -0.5);
      if(cfg.rotation) mesh.rotation.set(cfg.rotation.x||0, cfg.rotation.y||0, cfg.rotation.z||0);
      helmetGroup.add(mesh);
    }, undefined, (err)=>{
      console.warn('Failed to load helmet geometry', err);
    });
  }

  // Visor
  if(cfg.visiereURL){
    loader.load(cfg.visiereURL, (geom) => {
      geom.computeVertexNormals && geom.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: cfg.visiereOpacity !== undefined ? cfg.visiereOpacity : 0.5,
        side: THREE.FrontSide
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.frustumCulled = false;
      mesh.scale.multiplyScalar(cfg.scale || 0.037);
      mesh.position.set(cfg.offsetX || 0, cfg.offsetY !== undefined ? cfg.offsetY : -0.3, cfg.offsetZ !== undefined ? cfg.offsetZ : -0.5);
      if(cfg.rotation) mesh.rotation.set(cfg.rotation.x||0, cfg.rotation.y||0, cfg.rotation.z||0);
      helmetGroup.add(mesh);
    }, undefined, (err)=>{
      console.warn('Failed to load visiere geometry', err);
    });
  }

  // Face occluder (optional)
  if(cfg.faceMaskURL){
    // we reuse JeelizHelper's occluder creation if present:
    const oc = JeelizThreeHelper.create_threejsOccluder(cfg.faceMaskURL);
    oc.rotation.set(0.3, 0, 0);
    oc.position.set(0, 0.03 + (cfg.dy || 0.0), -0.04);
    oc.scale.multiplyScalar(cfg.occluderScale || 1.12 * 0.0084); // tuned from original demo
    threeStuffs.faceObject.add(oc);
    currentOccluder = oc;
  }

  // add the group
  threeStuffs.faceObject.add(helmetGroup);
  currentModel = helmetGroup;
}

/* generic switch function with queuing */
window.switchJeelizModel = function(modelKey){
  // if scene not initialized yet, queue the request and return
  if(!threeStuffs){
    pendingModelKey = modelKey;
    return;
  }

  // remove previous
  if(currentModel){
    threeStuffs.faceObject.remove(currentModel);
    disposeObject3D(currentModel);
    currentModel = null;
  }
  if(currentOccluder){
    threeStuffs.faceObject.remove(currentOccluder);
    disposeObject3D(currentOccluder);
    currentOccluder = null;
  }

  if(modelKey === 'glasses') loadGlassesModel();
  else if(modelKey === 'helmet') loadHelmetModel();
  else {
    console.warn('Unknown modelKey', modelKey);
  }
};

/* init 3D scene after Jeeliz gives spec */
function init_threeScene(spec){
  threeStuffs = JeelizThreeHelper.init(spec, detect_callback);

  // renderer tweaks (as before)
  try{
    threeStuffs.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    threeStuffs.renderer.outputEncoding = THREE.sRGBEncoding;
  }catch(e){}

  THREECAMERA = JeelizThreeHelper.create_camera();

  // add default model (use pending or glasses)
  const startModel = pendingModelKey || (window.JeelizModelsConfig && window.JeelizModelsConfig.defaultModel) || 'glasses';
  // ensure we call the switcher to reuse logic:
  setTimeout(()=>{ // small delay to ensure threeStuffs.faceObject exists
    window.switchJeelizModel(startModel);
  }, 30);

  sceneInitialized = true;

  // Notify React that Jeeliz is ready (if callback exists)
  if(window.onJeelizReady && typeof window.onJeelizReady === 'function'){
    try{ window.onJeelizReady(); }catch(e){}
  }
}

/* start face filter */
function init_faceFilter(videoSettings){
  JEELIZFACEFILTER.init({
    followZRot: true,
    canvasId: 'jeeFaceFilterCanvas',
    NNCPath: '/libs/jeelizFaceFilter/neuralNets/',
    videoSettings: videoSettings,
    callbackReady: function(errCode, spec){
      if(errCode){
        console.error('JEELIZ ERROR', errCode);
        return;
      }
      console.log('INFO: JEELIZ READY');
      init_threeScene(spec);
    },
    callbackTrack: function(detectState){
      JeelizThreeHelper.render(detectState, THREECAMERA);
    }
  });
}

/* helper to size canvas and start - keep compatibility with your React loader */
function main(){
  JeelizResizer.size_canvas({
    canvasId: 'jeeFaceFilterCanvas',
    callback: function(isError, bestVideoSettings){
      init_faceFilter(bestVideoSettings);
    }
  });
}

/* expose main so React can call window.main() */
window.main = main;

/* safety: if someone called switch before load, keep pending value set.
   React should set window.onJeelizReady before loading scripts (we will in React below),
   but we also allow React to set window.defaultModelKey if required. */

