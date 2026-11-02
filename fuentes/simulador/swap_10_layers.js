// function applyLayers() {
// let walk = null
function applyLayers() {
  const L = state.layers, xr = state.mode === "xray";
  const vis = {muros: L.muros, losas: L.losas, mob: L.mob, elec: L.elec, agua: L.agua, caliente: L.caliente, desague: L.desague, etiquetas: L.etiquetas && state.mode !== "ext" && state.mode !== "site", vecinos: L.vecinos, entorno: true, terreno: true, jardin: state.mode !== "cut" && state.mode !== "plan", noche: state.time === "tarde"};
  if (["walk", "ext", "site"].includes(state.mode)) ["elec", "agua", "caliente", "desague"].forEach(k => vis[k] = false);   // las tuberías van empotradas: se ven en Corte, Rayos X y Plano   // al recorrer, las tuberías quedan dentro de los muros: se ven en Rayos X y Corte
  Object.entries(groups).forEach(([k, g]) => g.visible = vis[k] !== false);
  ["wall", "wallExt", "slab", "accent", "frame", "floorLiving", "floorWet", "floorBed", "floorTerr", "wood", "deck", "fabric", "fabric2", "cushion", "rug", "bedding", "white", "steel", "dark", "stone"].forEach(k => {
    const m = MAT[k], t = xr ? (k.startsWith("floor") ? 0.35 : 0.12) : 1;
    m.transparent = xr; m.opacity = t; m.depthWrite = !xr; m.needsUpdate = true;
  });
  const f = state.mode === "plan" ? 2.3 * clamp(canvas.clientWidth / 900, 0.72, 1) : state.mode === "walk" ? 0.35 : 1.15;
  if (groups.etiquetas) groups.etiquetas.children.forEach(s => { s.material.depthTest = state.mode === "walk"; if (s.userData.base) s.scale.copy(s.userData.base).multiplyScalar(f); if (state.mode !== "walk") s.visible = true; });
}
