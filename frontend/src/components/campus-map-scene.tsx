"use client";

import { Canvas, invalidate, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import {
  CAMPUS_BLOCKS,
  CAMPUS_FIELD,
  CAMPUS_GROUND,
  CAMPUS_HEDGES,
  CAMPUS_PATHS,
  CAMPUS_ROADS,
  CAMPUS_ROUNDABOUT,
  CAMPUS_TREES,
  type CampusBlock,
  type CampusRect,
} from "@/lib/campus-blocks";
import { BUILDING_LEVEL_META, buildingLevel } from "@/lib/room-status";
import type { BuildingSummary } from "@/lib/types";

const ROTATION = {
  azimuth: { start: 0.32, min: -0.1, max: 0.74 },
  elevation: { start: 0.93, min: 0.7, max: 1.12 },
};
const DRAG_THRESHOLD_PX = 5;
const DRAG_SPEED = 0.006;
const CAMERA_DISTANCE = 306;
const LABEL_GAP = 0.6;
const LABEL_CARET_PX = 5;

const RIBBON = { offset: 0.56, ratio: 0.44, proud: 0.1 };
const ROOF_INSET = 0.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** 토큰 색을 재현하려고 지붕에 닿는 빛의 합을 π에 맞춘다(톤 매핑 없음). */
const LIGHT = { ambient: 1.72, sun: 1.78, position: [-68, 112, 50] as const };

/** 앞쪽(+z)으로 낮아지는 경사 지붕. 체육관과 스포츠센터에 쓴다. */
function createWedge() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    if (position.getY(index) > 0 && position.getZ(index) > 0) position.setY(index, 0.02);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** 전망타워: 허리가 잘록하고 위가 넓다. */
function createHourglass() {
  const profile: [number, number][] = [
    [0.36, 0],
    [0.27, 0.18],
    [0.22, 0.38],
    [0.27, 0.6],
    [0.38, 0.82],
    [0.5, 1],
    [0, 1],
  ];
  const geometry = new THREE.LatheGeometry(
    profile.map(([radius, y]) => new THREE.Vector2(radius, y)),
    14,
  );
  geometry.translate(0, -0.5, 0);
  return geometry;
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
const UNIT_WEDGE = createWedge();
const UNIT_HOURGLASS = createHourglass();

// 씬 중심을 원점에 둔다.
const toWorld = (x: number, z: number): [number, number] => [x - CAMPUS_GROUND.x, z - CAMPUS_GROUND.z];

/** globals.css 토큰이 색의 원본이다. oklch 값을 three가 읽는 sRGB로 바꾼다. */
function readFill(className: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.append(rect);
  document.body.append(svg);
  const fill = getComputedStyle(rect).fill;
  svg.remove();

  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) return "#888888";
  context.fillStyle = fill;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

const mixColors = (from: string, to: string, amount: number) =>
  `#${new THREE.Color(from).lerp(new THREE.Color(to), amount).getHexString()}`;

const darken = (color: string, amount: number) => `#${new THREE.Color(color).multiplyScalar(amount).getHexString()}`;

function readPalette() {
  const ground = readFill("fill-plan-ground");
  const road = readFill("fill-plan-corridor");
  const structure = readFill("fill-plan-structure");
  const text = readFill("fill-plan-text");
  return {
    ground,
    road,
    structure,
    text,
    path: mixColors(ground, road, 0.55),
    glass: mixColors(structure, text, 0.42),
    roof: mixColors(structure, text, 0.1),
    tree: mixColors(structure, text, 0.16),
  };
}

type Palette = ReturnType<typeof readPalette>;

interface Placement {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

const ignoreRaycast = () => null;

function Instances({
  geometry,
  items,
  color,
  castShadow = false,
  flatShading = false,
  hittable = false,
}: {
  geometry: THREE.BufferGeometry;
  items: Placement[];
  color: string;
  castShadow?: boolean;
  flatShading?: boolean;
  hittable?: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const transform = new THREE.Object3D();
    items.forEach((item, index) => {
      transform.position.set(item.x, item.y, item.z);
      transform.scale.set(item.w, item.h, item.d);
      transform.updateMatrix();
      target.setMatrixAt(index, transform.matrix);
    });
    target.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [items]);

  if (items.length === 0) return null;
  return (
    <instancedMesh
      key={items.length}
      ref={mesh}
      args={[geometry, undefined, items.length]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled={false}
      {...(hittable ? {} : { raycast: ignoreRaycast })}
    >
      <meshLambertMaterial color={color} flatShading={flatShading} />
    </instancedMesh>
  );
}

/** 건물 조각을 재질과 모양별로 모은다. 건물이 많아도 그리기 호출이 늘지 않는다. */
function collectInstances(blocks: CampusBlock[]) {
  const wallBoxes: Placement[] = [];
  const glassBoxes: Placement[] = [];
  const wallRounds: Placement[] = [];
  const glassRounds: Placement[] = [];
  const wedges: Placement[] = [];
  const hourglasses: Placement[] = [];
  const ribbons: Placement[] = [];
  const roofs: Placement[] = [];

  for (const part of blocks.flatMap((block) => block.parts)) {
    const [x, z] = toWorld(part.x, part.z);
    const base = part.y ?? 0;
    const placement = { x, y: base + part.h / 2, z, w: part.w, h: part.h, d: part.d };
    const isGlass = part.tone === "glass";

    if (part.shape === "wedge") wedges.push(placement);
    else if (part.shape === "hourglass") hourglasses.push(placement);
    else if (part.shape === "round") (isGlass ? glassRounds : wallRounds).push(placement);
    else {
      (isGlass ? glassBoxes : wallBoxes).push(placement);
      const floorHeight = part.floors ? part.h / part.floors : 0;
      for (let floor = 0; floor < (part.floors ?? 0); floor += 1) {
        ribbons.push({
          x,
          y: base + floorHeight * (floor + RIBBON.offset),
          z,
          w: part.w + RIBBON.proud,
          h: floorHeight * RIBBON.ratio,
          d: part.d + RIBBON.proud,
        });
      }
      // 난간이 남도록 지붕을 안쪽으로 한 겹 덮는다.
      if (!isGlass && Math.min(part.w, part.d) >= 2 && (part.h >= 1 || part.decal)) {
        roofs.push({ x, y: base + part.h + 0.012, z, w: part.w - ROOF_INSET, h: 0.024, d: part.d - ROOF_INSET });
      }
    }
  }
  return { wallBoxes, glassBoxes, wallRounds, glassRounds, wedges, hourglasses, ribbons, roofs };
}

function BlockMeshes({
  blocks,
  wall,
  glass,
  roof,
  hittable = false,
}: {
  blocks: CampusBlock[];
  wall: string;
  glass: string;
  roof: string;
  hittable?: boolean;
}) {
  const items = useMemo(() => collectInstances(blocks), [blocks]);
  return (
    <>
      <Instances geometry={UNIT_BOX} items={items.wallBoxes} color={wall} castShadow hittable={hittable} />
      <Instances geometry={UNIT_BOX} items={items.glassBoxes} color={glass} castShadow hittable={hittable} />
      <Instances geometry={UNIT_CYLINDER} items={items.wallRounds} color={wall} castShadow hittable={hittable} />
      <Instances geometry={UNIT_CYLINDER} items={items.glassRounds} color={glass} castShadow hittable={hittable} />
      <Instances geometry={UNIT_WEDGE} items={items.wedges} color={wall} castShadow hittable={hittable} />
      <Instances
        geometry={UNIT_HOURGLASS}
        items={items.hourglasses}
        color={glass}
        castShadow
        flatShading
        hittable={hittable}
      />
      <Instances geometry={UNIT_BOX} items={items.ribbons} color={glass} />
      <Instances geometry={UNIT_BOX} items={items.roofs} color={roof} />
    </>
  );
}

/** 건물 전체를 감싸는 상자 */
function footprint(block: CampusBlock) {
  const minX = Math.min(...block.parts.map((part) => part.x - part.w / 2));
  const maxX = Math.max(...block.parts.map((part) => part.x + part.w / 2));
  const minZ = Math.min(...block.parts.map((part) => part.z - part.d / 2));
  const maxZ = Math.max(...block.parts.map((part) => part.z + part.d / 2));
  return {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    w: maxX - minX,
    d: maxZ - minZ,
    h: Math.max(...block.parts.map((part) => (part.y ?? 0) + part.h)),
  };
}

function LiveBuilding({
  block,
  color,
  onSelect,
  onHoverChange,
}: {
  block: CampusBlock;
  color: string;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const blocks = useMemo(() => [block], [block]);
  const box = footprint(block);
  const [boxX, boxZ] = toWorld(box.x, box.z);
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.delta <= DRAG_THRESHOLD_PX) onSelect();
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHoverChange(true);
      }}
      onPointerOut={() => onHoverChange(false)}
    >
      {/* 중정처럼 뚫린 곳을 눌러도 건물을 누른 것으로 친다. */}
      <mesh geometry={UNIT_BOX} position={[boxX, box.h / 2, boxZ]} scale={[box.w, box.h, box.d]} visible={false} />
      <BlockMeshes blocks={blocks} wall={color} glass={darken(color, 0.34)} roof={darken(color, 0.84)} />
    </group>
  );
}

const DECAL_ASPECT = 2.6;
const DECAL_MAX_WIDTH = 8;
// 폰 너비에서는 글자를 읽을 수 없어 숨긴다. 범례가 회색의 뜻을 알려 준다.
const DECAL_MIN_CANVAS_PX = 480;

function RoofDecals({ blocks, color }: { blocks: CampusBlock[]; color: string }) {
  const isWide = useThree((state) => state.size.width >= DECAL_MIN_CANVAS_PX);
  const material = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 416;
    canvas.height = 160;
    const context = canvas.getContext("2d");
    if (context) {
      const font = getComputedStyle(document.documentElement).getPropertyValue("--app-font");
      context.font = `700 92px ${font}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = color;
      context.fillText("준비 중", canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  }, [color]);

  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  if (!isWide) return null;
  return blocks
    .flatMap((block) => block.parts)
    .filter((part) => part.decal)
    .map((part) => {
      const [x, z] = toWorld(part.x, part.z);
      const width = Math.min((part.w - ROOF_INSET) * 0.86, (part.d - ROOF_INSET) * 0.8 * DECAL_ASPECT, DECAL_MAX_WIDTH);
      return (
        <mesh
          key={`${part.x}-${part.z}`}
          geometry={UNIT_PLANE}
          material={material}
          position={[x, (part.y ?? 0) + part.h + 0.05, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[width, width / DECAL_ASPECT, 1]}
          raycast={ignoreRaycast}
        />
      );
    });
}

function PreparingBuildings({ blocks, palette }: { blocks: CampusBlock[]; palette: Palette }) {
  return (
    // 핸들러가 있어야 앞 건물이 포인터를 막아, 가려진 정보대가 눌리지 않는다.
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => event.stopPropagation()}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => event.stopPropagation()}
    >
      <BlockMeshes blocks={blocks} wall={palette.structure} glass={palette.glass} roof={palette.roof} hittable />
      <RoofDecals blocks={blocks} color={palette.text} />
    </group>
  );
}

function flatRects(rects: CampusRect[], y: number, h: number): Placement[] {
  return rects.map((rect) => {
    const [x, z] = toWorld(rect.x, rect.z);
    return { x, y, z, w: rect.w, h, d: rect.d };
  });
}

const ROAD_ITEMS = flatRects(CAMPUS_ROADS, 0.03, 0.06);
const PATH_ITEMS = flatRects(CAMPUS_PATHS, 0.015, 0.03);
const HEDGE_ITEMS: Placement[] = CAMPUS_HEDGES.map((hedge) => {
  const [x, z] = toWorld(hedge.x, hedge.z);
  return { x, y: hedge.h / 2, z, w: hedge.w, h: hedge.h, d: hedge.d };
});

function FlatDisc({ x, z, w, d, y, color }: { x: number; z: number; w: number; d: number; y: number; color: string }) {
  const [worldX, worldZ] = toWorld(x, z);
  return (
    <mesh geometry={UNIT_CYLINDER} position={[worldX, y, worldZ]} scale={[w, 0.08, d]} receiveShadow>
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

function Ground({ palette }: { palette: Palette }) {
  const { x: fieldX, z: fieldZ, w: fieldW, d: fieldD } = CAMPUS_FIELD;
  const { x: ringX, z: ringZ, outer, inner } = CAMPUS_ROUNDABOUT;
  return (
    <group>
      <mesh geometry={UNIT_BOX} position={[0, -2, 0]} scale={[CAMPUS_GROUND.w, 4, CAMPUS_GROUND.d]} receiveShadow>
        <meshLambertMaterial color={palette.ground} />
      </mesh>
      <Instances geometry={UNIT_BOX} items={ROAD_ITEMS} color={palette.road} />
      <Instances geometry={UNIT_BOX} items={PATH_ITEMS} color={palette.path} />
      <Instances geometry={UNIT_BOX} items={HEDGE_ITEMS} color={palette.tree} castShadow />
      <FlatDisc x={ringX} z={ringZ} w={outer} d={outer} y={0.04} color={palette.road} />
      <FlatDisc x={ringX} z={ringZ} w={inner} d={inner} y={0.08} color={palette.ground} />
      <FlatDisc x={fieldX} z={fieldZ} w={fieldW} d={fieldD} y={0.04} color={palette.structure} />
      <FlatDisc x={fieldX} z={fieldZ} w={fieldW - 5} d={fieldD - 5} y={0.08} color={palette.road} />
    </group>
  );
}

function Trees({ color }: { color: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new THREE.Object3D();
    CAMPUS_TREES.forEach((tree, index) => {
      const [x, z] = toWorld(tree.x, tree.z);
      transform.position.set(x, tree.size * 1.15, z);
      transform.scale.set(tree.size, tree.size * 1.3, tree.size);
      transform.rotation.y = tree.x;
      transform.updateMatrix();
      mesh.current?.setMatrixAt(index, transform.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CAMPUS_TREES.length]} castShadow raycast={ignoreRaycast}>
      <icosahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color={color} flatShading />
    </instancedMesh>
  );
}

interface OrbitState {
  azimuth: number;
  elevation: number;
  targetAzimuth: number;
  targetElevation: number;
}

interface LabelAnchor {
  id: string;
  position: THREE.Vector3;
}

// 원근 때문에 앞쪽이 커 보이므로 바닥 중심보다 앞을 본다.
const CAMERA_TARGET = new THREE.Vector3(1, 0, 6);

/** 카메라와 건물 이름표. 그리는 프레임에서만 돌고, 움직임이 남았을 때만 다음 프레임을 요청한다. */
function CameraRig({
  orbitRef,
  anchors,
  labelsRef,
  reducedMotion,
}: {
  orbitRef: React.RefObject<OrbitState>;
  anchors: LabelAnchor[];
  labelsRef: React.RefObject<Map<string, HTMLElement>>;
  reducedMotion: boolean;
}) {
  const projected = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }, delta) => {
    const state = orbitRef.current;
    const ease = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 1 / 30) * 14);
    state.azimuth += (state.targetAzimuth - state.azimuth) * ease;
    state.elevation += (state.targetElevation - state.elevation) * ease;
    const remaining = Math.abs(state.targetAzimuth - state.azimuth) + Math.abs(state.targetElevation - state.elevation);
    if (remaining > 1e-4) invalidate();

    const horizontal = CAMERA_DISTANCE * Math.cos(state.elevation);
    camera.position.set(
      CAMERA_TARGET.x + horizontal * Math.sin(state.azimuth),
      CAMERA_TARGET.y + CAMERA_DISTANCE * Math.sin(state.elevation),
      CAMERA_TARGET.z + horizontal * Math.cos(state.azimuth),
    );
    camera.lookAt(CAMERA_TARGET);
    camera.updateMatrixWorld();

    for (const anchor of anchors) {
      const label = labelsRef.current.get(anchor.id);
      if (!label) continue;
      projected.copy(anchor.position).project(camera);
      const x = ((projected.x + 1) / 2) * size.width;
      const y = ((1 - projected.y) / 2) * size.height;
      label.style.transform = `translate(${x}px, ${y - LABEL_CARET_PX}px) translate(-50%, -100%)`;
      label.style.visibility = "visible";
    }
  });
  return null;
}

function usePrefersReducedMotion() {
  return useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
}

export function CampusMapScene({
  buildings,
  at,
  onContextLost,
}: {
  buildings: BuildingSummary[];
  at: string;
  onContextLost: () => void;
}) {
  const router = useRouter();
  const reducedMotion = usePrefersReducedMotion();
  const wrapper = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const drag = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const orbit = useRef<OrbitState>({
    azimuth: ROTATION.azimuth.start,
    elevation: ROTATION.elevation.start,
    targetAzimuth: ROTATION.azimuth.start,
    targetElevation: ROTATION.elevation.start,
  });
  const [palette] = useState(readPalette);

  const live = useMemo(
    () =>
      buildings.flatMap((building) => {
        const block = CAMPUS_BLOCKS.find((candidate) => candidate.id === building.id);
        if (!block) return [];
        const meta = BUILDING_LEVEL_META[buildingLevel(building, at)];
        return [{ building, block, fill: readFill(meta.fillClass), text: readFill(meta.textClass) }];
      }),
    [buildings, at],
  );
  // 시간표를 다시 받아도 건물 구성이 같으면 회색 건물을 다시 배치하지 않는다.
  const buildingIds = buildings.map((building) => building.id).join("|");
  const preparing = useMemo(() => {
    const ids = new Set(buildingIds.split("|"));
    return CAMPUS_BLOCKS.filter((block) => !ids.has(block.id));
  }, [buildingIds]);
  const anchors = useMemo<LabelAnchor[]>(
    () =>
      live.map(({ block }) => {
        // 건물 뒤쪽 모서리에 달아 이름표가 건물을 가리지 않게 한다.
        const box = footprint(block);
        const [x, z] = toWorld(box.x, box.z - box.d / 2);
        return { id: block.id, position: new THREE.Vector3(x, box.h + LABEL_GAP, z) };
      }),
    [live],
  );

  const setCursor = (cursor: string) => {
    if (wrapper.current) wrapper.current.style.cursor = cursor;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      // 세로로 미는 터치는 브라우저가 스크롤로 가져간다. 그 사이에 지도가 돌지 않게 한다.
      if (event.pointerType === "touch" && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      current.moved = true;
      // 누르자마자 잡으면 클릭이 씬에 전달되지 않으므로 드래그가 확정된 뒤에 잡는다.
      event.currentTarget.setPointerCapture(event.pointerId);
      setCursor("grabbing");
    }
    current.x = event.clientX;
    current.y = event.clientY;
    const state = orbit.current;
    state.targetAzimuth = clamp(state.targetAzimuth - dx * DRAG_SPEED, ROTATION.azimuth.min, ROTATION.azimuth.max);
    state.targetElevation = clamp(state.targetElevation + dy * DRAG_SPEED, ROTATION.elevation.min, ROTATION.elevation.max);
    invalidate();
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    if (drag.current.moved) setCursor("");
    drag.current = null;
  };

  return (
    <div
      ref={wrapper}
      role="img"
      aria-label="캠퍼스 3D 지도. 색이 칠해진 건물이 정보대이고, 회색 건물은 준비 중이에요. 드래그하면 돌려 볼 수 있어요."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // 세로로 미는 터치는 페이지 스크롤로 남긴다. 가로로 민 드래그만 회전에 쓴다.
      className="relative aspect-[10/9] w-full cursor-grab touch-pan-y overflow-hidden rounded-xl select-none"
    >
      <Canvas
        flat
        shadows="percentage"
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 22, near: 40, far: 700 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", onContextLost, { once: true });
        }}
      >
        <ambientLight intensity={LIGHT.ambient} />
        <directionalLight
          position={[...LIGHT.position]}
          intensity={LIGHT.sun}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-85}
          shadow-camera-right={85}
          shadow-camera-top={85}
          shadow-camera-bottom={-85}
          shadow-camera-near={20}
          shadow-camera-far={320}
          shadow-bias={-0.0006}
        />
        <CameraRig orbitRef={orbit} anchors={anchors} labelsRef={labels} reducedMotion={reducedMotion} />
        <Ground palette={palette} />
        <Trees color={palette.tree} />
        <PreparingBuildings blocks={preparing} palette={palette} />
        {live.map(({ block, building, fill }) => (
          <LiveBuilding
            key={block.id}
            block={block}
            color={fill}
            onSelect={() => router.push(`/buildings/${building.id}`)}
            onHoverChange={(hovered) => setCursor(hovered ? "pointer" : "")}
          />
        ))}
      </Canvas>

      {live.map(({ building, fill, text }) => (
        <Link
          key={building.id}
          ref={(element) => {
            if (element) labels.current.set(building.id, element);
            else labels.current.delete(building.id);
          }}
          href={`/buildings/${building.id}`}
          prefetch={false}
          draggable={false}
          // 키보드 이동은 지도 아래 링크가 맡는다. 이 이름표는 누르기 쉽게 하려는 복제본이다.
          tabIndex={-1}
          aria-hidden="true"
          style={{ backgroundColor: fill, color: text }}
          className="invisible absolute top-0 left-0 flex items-baseline gap-1.5 rounded-md px-2 py-1 text-sm font-bold whitespace-nowrap shadow-md"
        >
          {building.name}
          <span className="font-medium tabular-nums">
            {building.emptyCount}/{building.totalCount}
          </span>
          <span style={{ backgroundColor: fill }} className="absolute top-full left-1/2 -mt-1 -ml-1 size-2 rotate-45" />
        </Link>
      ))}
    </div>
  );
}
