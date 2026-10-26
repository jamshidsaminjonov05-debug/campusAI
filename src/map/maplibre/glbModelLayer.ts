import { MercatorCoordinate, type CustomLayerInterface, type Map as MlMap } from "maplibre-gl";
import {
  Box3,
  Camera,
  Color,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Scene,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
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
 *   Ya'ni glTF **+Z = JANUB** — kampus json'idagi `y` bilan AYNI yo'nalish.
 *
 * ⚠️ Xarita bilan BITTA WebGL konteksti ishlatiladi (`context: gl`) —
 * chuqurlik buferi umumiy, ya'ni model `fill-extrusion` binolar bilan
 * to'g'ri kesishadi. Har kadrdan oldin `resetState()` SHART: aks holda
 * three.js MapLibre qoldirgan GL holatini (blend, program) buzadi.
 *
 * ⚠️ three.js r163+ faqat WebGL2 bilan ishlaydi. MapLibre 4.x WebGL2 ni
 * birinchi tanlaydi; juda eski brauzerda WebGL1 bo'lsa model shunchaki
 * chizilmaydi (konsolda ogohlantirish), xaritaning qolgani ishlayveradi.
 *
 * 2026-10-23: `recolor` (tugun nomi → rang, tom ranglari sun'iy yo'ldosh
 * suratiga moslandi) va `trees` (bitta daraxt modeli — `InstancedMesh`,
 * o'nlab nusxa BITTA chizish chaqiruvida) qo'shildi — `config/campusGround.ts`.
 */
export interface GlbTreeInstance {
  /** Metr, x — sharq, y — JANUB (kampus json'i bilan bir fazoda). */
  x: number;
  y: number;
  /** Balandlik, metr. */
  h: number;
  /** Model ichidagi daraxt turi — mesh indeksi bo'yicha. */
  k: number;
}

export interface GlbModelLayerOptions {
  /** MapLibre qatlam id'si. */
  id: string;
  /** `.glb` manzili (`public/` ichida). */
  url: string;
  /** Modelning (0,0) nuqtasi — [lng, lat]. */
  origin: [number, number];
  /** Yerdan balandlik, metr (masalan kampus maydonchasi ustida). */
  altitude?: number;
  /** Tugun nomi (prefiks) → rang. Material KLONLANADI — boshqa tugunlarga tegmaydi. */
  recolor?: Record<string, string>;
  /** Daraxtlar — alohida `.glb` dan nusxalar. */
  trees?: { url: string; instances: GlbTreeInstance[] };
}

export function createGlbModelLayer({
  id,
  url,
  origin,
  altitude = 0,
  recolor,
  trees,
}: GlbModelLayerOptions): CustomLayerInterface {
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

  /** Tugun nomi bo'yicha tom/devor rangini almashtirish (`recolor`). */
  const applyRecolor = (root: Object3D) => {
    if (!recolor) return;
    const entries = Object.entries(recolor);
    root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      /* Rang tugun nomi bo'yicha — mesh nomi ko'pincha ota tugunniki */
      const name = mesh.name || mesh.parent?.name || "";
      const hit = entries.find(([prefix]) => name === prefix || name.startsWith(`${prefix}.`) || name.startsWith(`${prefix}_`));
      if (!hit) return;
      const mats: Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = mats.map((m) => {
        const c = m.clone() as MeshStandardMaterial;
        if ("color" in c && c.color instanceof Color) c.color.set(hit[1]);
        return c;
      });
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
    });
  };

  /**
   * Daraxtlar — manba modeldagi HAR BIR mesh uchun bitta `InstancedMesh`.
   * Geometriya avval balandligi 1 m bo'lgan, tagi (0,0,0) da turgan holga
   * NORMALLANADI (Sketchfab eksportlari yuzlab birlik va o'z burilishlari
   * bilan keladi) — keyin har nusxaga `h` metr masshtab beriladi.
   */
  const addTrees = (gltf: { scene: Object3D }) => {
    if (!trees || trees.instances.length === 0) return;
    gltf.scene.updateMatrixWorld(true);
    const meshes: Mesh[] = [];
    gltf.scene.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) meshes.push(m);
    });
    if (meshes.length === 0) return;

    const prepared = meshes.map((m) => {
      const geo = (m.geometry as BufferGeometry).clone();
      geo.applyMatrix4(m.matrixWorld);
      const box = new Box3().setFromBufferAttribute(geo.getAttribute("position") as never);
      const size = new Vector3();
      box.getSize(size);
      const height = size.y || 1;
      /* Tagi — (0, 0, 0): markaz X/Z bo'yicha, Y bo'yicha pastki chegara */
      geo.translate(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
      geo.scale(1 / height, 1 / height, 1 / height);
      const src = (Array.isArray(m.material) ? m.material[0] : m.material) as MeshStandardMaterial;
      const mat = src.clone();
      /* Barg to'ri — `alphaTest` bilan: BLEND shaffoflik nusxalar orasida
         chuqurlik tartibini buzardi (orqadagi daraxt oldingisidan ko'rinardi). */
      mat.transparent = false;
      mat.alphaTest = 0.45;
      mat.side = DoubleSide;
      mat.depthWrite = true;
      return { geo, mat };
    });

    const dummy = new Object3D();
    prepared.forEach(({ geo, mat }, meshIdx) => {
      const own = trees.instances.filter((t) => t.k % prepared.length === meshIdx);
      if (own.length === 0) return;
      const inst = new InstancedMesh(geo, mat, own.length);
      own.forEach((t, i) => {
        /* glTF fazosi: x — sharq, y — yuqori, z — JANUB (yuqoridagi izoh) */
        dummy.position.set(t.x, 0, t.y);
        dummy.rotation.set(0, ((t.x * 7 + t.y * 13) % 360) * (Math.PI / 180), 0);
        dummy.scale.setScalar(t.h);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      });
      inst.instanceMatrix.needsUpdate = true;
      scene.add(inst);
    });
  };

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

      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          if (removed) return;
          applyRecolor(gltf.scene);
          scene.add(gltf.scene);
          map.triggerRepaint();
        },
        undefined,
        (err) => console.warn(`[3d-model] ${url} yuklanmadi:`, err)
      );
      if (trees && trees.instances.length > 0) {
        loader.load(
          trees.url,
          (gltf) => {
            if (removed) return;
            addTrees(gltf);
            map.triggerRepaint();
          },
          undefined,
          (err) => console.warn(`[3d-model] daraxt ${trees.url} yuklanmadi:`, err)
        );
      }

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
