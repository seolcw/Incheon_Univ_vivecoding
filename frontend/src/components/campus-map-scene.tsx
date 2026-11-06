"use client";

import { Canvas, invalidate, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import {
  CAMPUS_BLOCKS,
  CAMPUS_COURTS,
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
const CAMERA_FOV = 22;
const CAMERA_DISTANCE = 306;
const LABEL_GAP = 0.6;
const LABEL_CARET_PX = 5;
const LABEL_EDGE_PX = 6;
const OUTLINE_PX = 2.5;

const RIBBON = { offset: 0.56, ratio: 0.36, proud: 0.08 };
const ROOF_INSET = 0.34;
const SELECTION_LABEL_ID = "selection";

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
const UNIT_WEDGE = createWedge();
const UNIT_HOURGLASS = createHourglass();

/** 선택한 건물이 차지한 화면 영역을 스텐실에 표시한다. 색은 그리지 않는다. */
const OUTLINE_MASK_MATERIAL = new THREE.MeshBasicMaterial({
  colorWrite: false,
  depthWrite: false,
  depthFunc: THREE.LessEqualDepth,
  stencilWrite: true,
  stencilFunc: THREE.AlwaysStencilFunc,
  stencilRef: 1,
  stencilZPass: THREE.ReplaceStencilOp,
});

/** 건물보다 조금 큰 검은 도형을 표시 영역 밖에만 그려 바깥 윤곽선만 남긴다. */
const OUTLINE_HULL_MATERIAL = new THREE.MeshBasicMaterial({
  color: "#000000",
  depthWrite: false,
  stencilWrite: true,
  stencilFunc: THREE.NotEqualStencilFunc,
  stencilRef: 1,
  stencilFail: THREE.KeepStencilOp,
  stencilZFail: THREE.KeepStencilOp,
  stencilZPass: THREE.KeepStencilOp,
});

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

function readPalette() {
  const ground = readFill("fill-plan-ground");
  const road = readFill("fill-plan-corridor");
  const structure = readFill("fill-plan-structure");
  const text = readFill("fill-plan-text");
  return {
    ground,
    road,
    structure,
    path: mixColors(ground, road, 0.55),
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
  /** 없으면 메시 재질의 색을 쓴다. */
  color?: string;
  blockId?: string;
}

const ignoreRaycast = () => null;

function Instances({
  geometry,
  items,
  color = "#ffffff",
  material,
  renderOrder = 0,
  castShadow = false,
  flatShading = false,
  hittable = false,
  opacity,
}: {
  geometry: THREE.BufferGeometry;
  items: Placement[];
  color?: string;
  material?: THREE.Material;
  renderOrder?: number;
  castShadow?: boolean;
  flatShading?: boolean;
  hittable?: boolean;
  opacity?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    const transform = new THREE.Object3D();
    const tint = new THREE.Color();
    items.forEach((item, index) => {
      transform.position.set(item.x, item.y, item.z);
      transform.scale.set(item.w, item.h, item.d);
      transform.updateMatrix();
      target.setMatrixAt(index, transform.matrix);
      if (item.color) target.setColorAt(index, tint.set(item.color));
    });
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    invalidate();
  }, [items]);

  if (items.length === 0) return null;
  return (
    <instancedMesh
      key={items.length}
      ref={mesh}
      args={[geometry, material, items.length]}
      renderOrder={renderOrder}
      castShadow={castShadow}
      receiveShadow={!material}
      frustumCulled={false}
      userData={{ blockIds: items.map((item) => item.blockId) }}
      {...(hittable ? {} : { raycast: ignoreRaycast })}
    >
      {!material && (
        <meshLambertMaterial
          color={color}
          flatShading={flatShading}
          transparent={opacity !== undefined}
          opacity={opacity ?? 1}
          depthWrite={opacity === undefined}
        />
      )}
    </instancedMesh>
  );
}

/** 건물 조각을 모양별로 모은다. 색은 조각마다 넣어 건물이 많아도 그리기 호출이 늘지 않는다. */
function collectInstances(blocks: CampusBlock[]) {
  const boxes: Placement[] = [];
  const rounds: Placement[] = [];
  const wedges: Placement[] = [];
  const hourglasses: Placement[] = [];
  const nets: Placement[] = [];
  const ribbons: Placement[] = [];
  const roofs: Placement[] = [];

  for (const block of blocks) {
    const { colors } = block;
    for (const part of block.parts) {
      const [x, z] = toWorld(part.x, part.z);
      const base = part.y ?? 0;
      const tone = part.tone ?? "wall";
      const color =
        tone === "glass"
          ? colors.glass
          : tone === "accent"
            ? colors.accent
            : tone === "frame"
              ? (colors.frame ?? colors.wall)
              : colors.wall;
      const placement = { x, y: base + part.h / 2, z, w: part.w, h: part.h, d: part.d, color, blockId: block.id };

      if (tone === "net") nets.push(placement);
      else if (part.shape === "wedge") wedges.push(placement);
      else if (part.shape === "hourglass") hourglasses.push(placement);
      else if (part.shape === "round") rounds.push(placement);
      else {
        boxes.push(placement);
        const floorHeight = part.floors ? part.h / part.floors : 0;
        for (let floor = 0; floor < (part.floors ?? 0); floor += 1) {
          ribbons.push({
            x,
            y: base + floorHeight * (floor + RIBBON.offset),
            z,
            w: part.w + RIBBON.proud,
            h: floorHeight * (part.glazing ?? RIBBON.ratio),
            d: part.d + RIBBON.proud,
            color: colors.glass,
          });
        }
        // 난간이 남도록 지붕을 안쪽으로 한 겹 덮는다.
        if (tone !== "glass" && Math.min(part.w, part.d) >= 1.5 && part.h >= 1) {
          roofs.push({
            x,
            y: base + part.h + 0.012,
            z,
            w: part.w - ROOF_INSET,
            h: 0.024,
            d: part.d - ROOF_INSET,
            color: colors.roof,
          });
        }
      }
    }
  }
  return { boxes, rounds, wedges, hourglasses, nets, ribbons, roofs };
}

function BlockMeshes({ blocks }: { blocks: CampusBlock[] }) {
  const items = useMemo(() => collectInstances(blocks), [blocks]);
  return (
    <>
      <Instances geometry={UNIT_BOX} items={items.boxes} castShadow hittable />
      <Instances geometry={UNIT_CYLINDER} items={items.rounds} castShadow hittable />
      <Instances geometry={UNIT_WEDGE} items={items.wedges} castShadow hittable />
      <Instances geometry={UNIT_HOURGLASS} items={items.hourglasses} castShadow flatShading hittable />
      <Instances geometry={UNIT_BOX} items={items.nets} color="#7fb5ad" opacity={0.28} hittable />
      <Instances geometry={UNIT_BOX} items={items.ribbons} />
      <Instances geometry={UNIT_BOX} items={items.roofs} />
    </>
  );
}

function growPlacements(items: Placement[], margin: number): Placement[] {
  return items.map((item) => ({
    ...item,
    w: item.w + margin * 2,
    h: item.h + margin * 2,
    d: item.d + margin * 2,
  }));
}

/** 화면 높이에 보이는 월드 길이. 윤곽선 두께를 화면 픽셀로 맞출 때 쓴다. */
const VISIBLE_WORLD_HEIGHT = 2 * CAMERA_DISTANCE * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));

function SelectionOutline({ block }: { block: CampusBlock }) {
  const canvasHeight = useThree((state) => state.size.height);
  const margin = (OUTLINE_PX * VISIBLE_WORLD_HEIGHT) / canvasHeight;
  const { mask, hull } = useMemo(() => {
    const items = collectInstances([block]);
    const solids = [...items.boxes, ...items.nets];
    return {
      mask: {
        boxes: [...solids, ...items.ribbons, ...items.roofs],
        rounds: items.rounds,
        wedges: items.wedges,
        hourglasses: items.hourglasses,
      },
      hull: {
        boxes: growPlacements(solids, margin),
        rounds: growPlacements(items.rounds, margin),
        wedges: growPlacements(items.wedges, margin),
        hourglasses: growPlacements(items.hourglasses, margin),
      },
    };
  }, [block, margin]);

  const shapes = [
    [UNIT_BOX, mask.boxes, hull.boxes],
    [UNIT_CYLINDER, mask.rounds, hull.rounds],
    [UNIT_WEDGE, mask.wedges, hull.wedges],
    [UNIT_HOURGLASS, mask.hourglasses, hull.hourglasses],
  ] as const;

  return shapes.map(([geometry, maskItems, hullItems]) => (
    <group key={geometry.uuid}>
      <Instances geometry={geometry} items={maskItems} material={OUTLINE_MASK_MATERIAL} renderOrder={1} />
      <Instances geometry={geometry} items={hullItems} material={OUTLINE_HULL_MATERIAL} renderOrder={2} />
    </group>
  ));
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

/** 이름표를 달 위치: 건물 뒤쪽 모서리 위 */
function labelAnchor(block: CampusBlock) {
  const box = footprint(block);
  const [x, z] = toWorld(box.x, box.z - box.d / 2);
  return new THREE.Vector3(x, box.h + LABEL_GAP, z);
}

function blockIdOf(event: ThreeEvent<MouseEvent | PointerEvent>): string | undefined {
  const { blockIds, blockId } = event.object.userData as { blockIds?: (string | undefined)[]; blockId?: string };
  return blockIds?.[event.instanceId ?? -1] ?? blockId;
}

function CampusBuildings({
  blocks,
  liveBlocks,
  onPick,
  onHoverChange,
}: {
  blocks: CampusBlock[];
  liveBlocks: CampusBlock[];
  onPick: (blockId: string) => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.delta > DRAG_THRESHOLD_PX) return;
        const blockId = blockIdOf(event);
        if (blockId) onPick(blockId);
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        onHoverChange(true);
      }}
      onPointerOut={() => onHoverChange(false)}
    >
      <BlockMeshes blocks={blocks} />
      {liveBlocks.map((block) => {
        const box = footprint(block);
        const [x, z] = toWorld(box.x, box.z);
        // 중정처럼 뚫린 곳을 눌러도 건물을 누른 것으로 친다.
        return (
          <mesh
            key={block.id}
            geometry={UNIT_BOX}
            position={[x, box.h / 2, z]}
            scale={[box.w, box.h, box.d]}
            visible={false}
            userData={{ blockId: block.id }}
          />
        );
      })}
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
const COURT_ITEMS = flatRects(CAMPUS_COURTS, 0.015, 0.03);
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
      <Instances geometry={UNIT_BOX} items={COURT_ITEMS} color={palette.path} />
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
      // 화면 가장자리 건물이어도 이름표가 지도 밖으로 잘리지 않게 한다.
      const halfWidth = label.offsetWidth / 2;
      const x = clamp(((projected.x + 1) / 2) * size.width, halfWidth + LABEL_EDGE_PX, size.width - halfWidth - LABEL_EDGE_PX);
      const y = Math.max(((1 - projected.y) / 2) * size.height - LABEL_CARET_PX, label.offsetHeight + LABEL_EDGE_PX);
      label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      label.style.visibility = "visible";
    }
  });
  return null;
}

function usePrefersReducedMotion() {
  return useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
}

function SelectionDetails({ building, at }: { building: BuildingSummary | undefined; at: string }) {
  if (!building) return <p className="text-muted-foreground">준비 중이에요</p>;
  const level = buildingLevel(building, at);
  const meta = BUILDING_LEVEL_META[level];
  const emptyPercent = building.totalCount > 0 ? Math.round((building.emptyCount / building.totalCount) * 100) : 0;
  return (
    <>
      {level === "closed" ? (
        <p className="text-muted-foreground">운영 시간이 아니에요</p>
      ) : (
        <p className="flex items-center gap-1.5 whitespace-nowrap">
          <svg aria-hidden="true" viewBox="0 0 10 10" className="size-3 shrink-0">
            <rect width="10" height="10" rx="2" className={meta.fillClass} />
          </svg>
          빈 비율 <strong className="tabular-nums">{emptyPercent}%</strong>
          <span className="text-muted-foreground tabular-nums">
            {building.emptyCount}/{building.totalCount}
          </span>
        </p>
      )}
      <Link
        href={`/buildings/${building.id}`}
        prefetch={false}
        className="mt-1 flex min-h-8 items-center justify-between gap-2 rounded-md font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        강의실 보기
        <ChevronRight aria-hidden="true" className="size-4" />
      </Link>
    </>
  );
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
  // 시간표를 다시 받아도 건물 구성이 같으면 클릭 영역을 다시 만들지 않는다.
  const buildingIds = buildings.map((building) => building.id).join("|");
  const liveBlocks = useMemo(() => {
    const ids = new Set(buildingIds.split("|"));
    return CAMPUS_BLOCKS.filter((block) => ids.has(block.id));
  }, [buildingIds]);

  const selectedBlock = selectedId ? CAMPUS_BLOCKS.find((block) => block.id === selectedId) : undefined;
  const selectedBuilding = selectedId ? buildings.find((building) => building.id === selectedId) : undefined;

  const anchors = useMemo<LabelAnchor[]>(() => {
    const pills = liveBlocks.map((block) => ({ id: block.id, position: labelAnchor(block) }));
    return selectedBlock ? [...pills, { id: SELECTION_LABEL_ID, position: labelAnchor(selectedBlock) }] : pills;
  }, [liveBlocks, selectedBlock]);

  // 고른 건물의 윤곽선과 카드 위치를 그리려면 프레임이 한 번 더 필요하다.
  useEffect(() => {
    invalidate();
  }, [selectedId]);

  const setCursor = (cursor: string) => {
    if (wrapper.current) wrapper.current.style.cursor = cursor;
  };

  /** 처음 누르면 고른다. 빈 비율이 있는 건물을 한 번 더 누르면 강의실 화면으로 간다. */
  const handlePick = (blockId: string) => {
    if (blockId === selectedId && buildings.some((building) => building.id === blockId)) {
      router.push(`/buildings/${blockId}`);
      return;
    }
    setSelectedId(blockId);
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
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // 세로로 미는 터치는 페이지 스크롤로 남긴다. 가로로 민 드래그만 회전에 쓴다.
      className="relative aspect-[10/9] w-full cursor-grab touch-pan-y overflow-hidden rounded-xl select-none"
    >
      <div
        role="img"
        aria-label="캠퍼스 3D 지도. 건물을 누르면 검은 윤곽선과 빈 비율이 나와요. 시간표가 있는 건물은 정보대뿐이에요. 드래그하면 돌려 볼 수 있어요."
        className="absolute inset-0"
      >
        <Canvas
          flat
          shadows="percentage"
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ stencil: true }}
          camera={{ fov: CAMERA_FOV, near: 40, far: 700 }}
          onPointerMissed={() => setSelectedId(null)}
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
          <CampusBuildings
            blocks={CAMPUS_BLOCKS}
            liveBlocks={liveBlocks}
            onPick={handlePick}
            onHoverChange={(hovered) => setCursor(hovered ? "pointer" : "")}
          />
          {selectedBlock && <SelectionOutline key={selectedBlock.id} block={selectedBlock} />}
        </Canvas>
      </div>

      {live
        // 건물을 고르면 선택 팝업만 남긴다. 다른 건물을 눌렀을 때 이름표가 함께 떠 있지 않게 한다.
        .filter(() => selectedId === null)
        .map(({ building, fill, text }) => (
          <button
            key={building.id}
            ref={(element) => {
              if (element) labels.current.set(building.id, element);
              else labels.current.delete(building.id);
            }}
            type="button"
            // 키보드 이동은 지도 아래 링크가 맡는다. 이 이름표는 누르기 쉽게 하려는 복제본이다.
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => handlePick(building.id)}
            style={{ backgroundColor: fill, color: text }}
            className="invisible absolute top-0 left-0 flex items-baseline gap-1.5 rounded-md px-2 py-1 text-sm font-bold whitespace-nowrap shadow-md"
          >
            {building.name}
            <span className="font-medium tabular-nums">
              {building.emptyCount}/{building.totalCount}
            </span>
            <span style={{ backgroundColor: fill }} className="absolute top-full left-1/2 -mt-1 -ml-1 size-2 rotate-45" />
          </button>
        ))}

      {selectedBlock && (
        <div
          key={selectedBlock.id}
          ref={(element) => {
            if (element) labels.current.set(SELECTION_LABEL_ID, element);
            else labels.current.delete(SELECTION_LABEL_ID);
          }}
          role="status"
          // 카드 위에서 시작한 동작은 지도 회전으로 치지 않는다.
          onPointerDown={(event) => event.stopPropagation()}
          className="invisible absolute top-0 left-0 z-10 flex w-max max-w-[calc(100%-1rem)] cursor-default flex-col gap-0.5 rounded-lg border border-foreground bg-background px-2.5 py-1.5 text-xs shadow-lg sm:px-3 sm:py-2 sm:text-sm"
        >
          <p className="font-bold">{selectedBuilding?.name ?? selectedBlock.name}</p>
          <SelectionDetails building={selectedBuilding} at={at} />
        </div>
      )}
    </div>
  );
}
