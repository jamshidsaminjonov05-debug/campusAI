import { MercatorCoordinate, type CustomLayerInterface, type Map as MlMap } from "maplibre-gl";
import {
  Camera,
  DirectionalLight,
  HemisphereLight,
  Matrix4,
  Scene,
  Vector3,
  WebGLRenderer,
  type Material,
  type Mesh,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * `.glb` MODELNI MapLibre XARITASIGA QO'YADIGAN custom layer (three.js).
 *
 * Model koordinatalari (Blender eksporti): 1 birlik = 1 metr, glTF Y —
 * yuqori, modelning (0,0,0) nuqtasi — `origin` ([lng, lat]).
 *
 * Konversiya (MapLibre'ning rasmiy three.js namunasi bilan AYNI):
 *   glTF (x, y-yuqori, z) → X o'qi atrofida +90° burish → (x, y-shimol, z-yuqori)
 *   → masshtab `(s, -s, s)`: Merkator Y JANUBGA o'sadi, shuning uchun
 *   shimol manfiy bo'ladi → origin'ning Merkator nuqtasiga ko'chirish.
 *
 * ⚠️ Xarita bilan BITTA WebGL konteksti ishlatiladi (`context: gl`) —
 * chuqurlik buferi umumiy, ya'ni model `fill-extrusion` binolar bilan
 * to'g'ri kesishadi. Har kadrdan oldin `resetState()` SHART: aks holda
 * three.js MapLibre qoldirgan GL holatini (blend, program) buzadi.
 *
 * ⚠️ three.js r163+ faqat WebGL2 bilan ishlaydi. MapLibre 4.x WebGL2 ni
 * birinchi tanlaydi; juda eski brauzerda WebGL1 bo'lsa model shunchaki
 * chizilmaydi (konsolda ogohlantirish), xaritaning qolgani ishlayveradi.
 */
export interface GlbModelLayerOptions {
  /** MapLibre qatlam id'si. */
  id: string;
  /** `.glb` manzili (`public/` ichida). */
  url: string;
  /** Modelning (0,0) nuqtasi — [lng, lat]. */
  origin: [number, number];
  /** Yerdan balandlik, metr (masalan kampus maydonchasi ustida). */
  altitude?: number;
}

export function createGlbModelLayer({ id, url, origin, altitude = 0 }: GlbModelLayerOptions): CustomLayerInterface {
  const scene = new Scene();
  const camera = new Camera();
  const projection = new Matrix4();
  let renderer: WebGLRenderer | null = null;
  let removed = false;

  const mc = MercatorCoordinate.fromLngLat(origin, altitude);
  const s = mc.meterInMercatorCoordinateUnits();
  const modelMatrix = new Matrix4()
    .makeTranslation(mc.x, mc.y, mc.z)
    .scale(new Vector3(s, -s, s))
    .multiply(new Matrix4().makeRotationX(Math.PI / 2));

  return {
    id,
    type: "custom",
    renderingMode: "3d",

    onAdd(map: MlMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
      if (typeof WebGL2RenderingContext === "undefined" || !(gl instanceof WebGL2RenderingContext)) {
        console.warn(`[3d-model] ${url}: WebGL2 yo'q — model chizilmaydi`);
        return;
      }
      /* Yorug'lik — tekis "osmon" + yuqori-yon tomondan quyosh, aks holda
         PBR materiallar (Blender Principled → glTF) qop-qora ko'rinadi. */
      scene.add(new HemisphereLight(0xffffff, 0x6b7079, 2.2));
      const sun = new DirectionalLight(0xfff3e0, 2.4);
      sun.position.set(-40, 80, 60); // glTF fazosida: Y — yuqori
      scene.add(sun);

      new GLTFLoader().load(
        url,
        (gltf) => {
          if (removed) return;
          scene.add(gltf.scene);
          map.triggerRepaint();
        },
        undefined,
        (err) => console.warn(`[3d-model] ${url} yuklanmadi:`, err)
      );

      renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
      renderer.autoClear = false;
    },

    render(_gl, matrix) {
      if (!renderer) return;
      projection.fromArray(Array.from(matrix as ArrayLike<number>)).multiply(modelMatrix);
      camera.projectionMatrix.copy(projection);
      renderer.resetState();
      renderer.render(scene, camera);
    },

    onRemove() {
      removed = true;
      scene.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mats: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m.dispose());
      });
      scene.clear();
      /* Kontekst XARITANIKI — `dispose()` faqat three.js ichki resurslarini
         bo'shatadi, kontekstni yo'qotmaydi (`forceContextLoss` CHAQIRILMAYDI). */
      renderer?.dispose();
      renderer = null;
    },
  };
}
