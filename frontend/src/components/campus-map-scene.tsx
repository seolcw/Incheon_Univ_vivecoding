"use client";

import { Canvas, invalidate, useFrame, type ThreeEvent } from "@react-three/fiber";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import * as THREE from "three";
import {
  CAMPUS_BLOCKS,
  CAMPUS_FIELD,
  CAMPUS_GROUND,
  CAMPUS_ROADS,
  CAMPUS_TREES,
  type CampusBlock,
  type CampusPart,
} from "@/lib/campus-blocks";
import { BUILDING_LEVEL_META, buildingLevel } from "@/lib/room-status";
import type { BuildingSummary } from "@/lib/types";

const ROTATION = {
  azimuth: { start: 0.32, min: -0.1, max: 0.74 },
  elevation: { start: 0.93, min: 0.7, max: 1.12 },
};
const DRAG_THRESHOLD_PX = 5;
const DRAG_SPEED = 0.006;
const CAMERA_DISTANCE = 300;
const FLOOR_GAP_RATIO = 0.24;
const LABEL_GAP = 0.6;
const LABEL_CARET_PX = 5;

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** 토큰 색을 재현하려고 지붕에 닿는 빛의 합을 π에 맞춘다(톤 매핑 없음). */
const LIGHT = { ambient: 1.72, sun: 1.78, position: [-68, 112, 50] as const };

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

function readPalette() {
  return {
    ground: readFill("fill-plan-ground"),
    road: readFill("fill-plan-corridor"),
    structure: readFill("fill-plan-structure"),
    text: readFill("fill-plan-text"),
  };
}

type Palette = ReturnType<typeof readPalette>;

function Part({ part, color, shadow = true }: { part: CampusPart; color: string; shadow?: boolean }) {
  const [x, z] = toWorld(part.x, part.z);
  return (
    <mesh
      geometry={part.round ? UNIT_CYLINDER : UNIT_BOX}
      position={[x, part.h / 2, z]}
      scale={[part.w, part.h, part.d]}
      castShadow={shadow}
      receiveShadow
    >
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

/** 층이 드러나게 쌓은 건물: 안쪽 기둥 위로 층 판을 올린다. */
function StackedPart({ part, floors, color }: { part: CampusPart; floors: number; color: string }) {
  const floorHeight = part.h / floors;
  const gap = floorHeight * FLOOR_GAP_RATIO;
  return (
    <>
      <Part part={{ ...part, w: part.w - 0.5, d: part.d - 0.5 }} color={color} />
      {Array.from({ length: floors }, (_, floor) => {
        const [x, z] = toWorld(part.x, part.z);
        const slabHeight = floorHeight - gap;
        return (
          <mesh
            key={floor}
            geometry={UNIT_BOX}
            position={[x, floorHeight * (floor + 1) - slabHeight / 2, z]}
            scale={[part.w, slabHeight, part.d]}
            castShadow
            receiveShadow
          >
            <meshLambertMaterial color={color} />
          </mesh>
        );
      })}
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
    h: Math.max(...block.parts.map((part) => part.h)),
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
      {block.parts.map((part) =>
        block.floors ? (
          <StackedPart key={`${part.x}-${part.z}`} part={part} floors={block.floors} color={color} />
        ) : (
          <Part key={`${part.x}-${part.z}`} part={part} color={color} />
        ),
      )}
    </group>
  );
}

/** 글자가 들어갈 만큼 넓은 지붕을 고른다. */
const DECAL_ASPECT = 2.6;
const DECAL_MAX_WIDTH = 8;
const DECAL_MIN_WIDTH = 4.5;

function roofForDecal(block: CampusBlock) {
  let best: { part: CampusPart; width: number } | null = null;
  for (const part of block.parts) {
    if (part.round) continue;
    const width = Math.min(part.w * 0.86, part.d * 0.8 * DECAL_ASPECT, DECAL_MAX_WIDTH);
    if (!best || width > best.width) best = { part, width };
  }
  return best && best.width >= DECAL_MIN_WIDTH ? best : null;
}

function abovePart(part: CampusPart): [number, number, number] {
  const [x, z] = toWorld(part.x, part.z);
  return [x, part.h + 0.04, z];
}

function PreparingBuildings({ blocks, palette }: { blocks: CampusBlock[]; palette: Palette }) {
  const decalMaterial = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 416;
    canvas.height = 160;
    const context = canvas.getContext("2d");
    if (context) {
      const font = getComputedStyle(document.documentElement).getPropertyValue("--app-font");
      context.font = `700 92px ${font}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = palette.text;
      context.fillText("준비 중", canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  }, [palette.text]);

  useEffect(
    () => () => {
      decalMaterial.map?.dispose();
      decalMaterial.dispose();
    },
    [decalMaterial],
  );

  return (
    // 핸들러가 있어야 앞 건물이 포인터를 막아, 가려진 정보대가 눌리지 않는다.
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => event.stopPropagation()}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => event.stopPropagation()}
    >
      {blocks.map((block) => {
        const roof = roofForDecal(block);
        return (
          <group key={block.id}>
            {block.parts.map((part) => (
              <Part key={`${part.x}-${part.z}`} part={part} color={palette.structure} />
            ))}
            {roof && (
              <mesh
                material={decalMaterial}
                position={abovePart(roof.part)}
                rotation={[-Math.PI / 2, 0, 0]}
                raycast={() => null}
              >
                <planeGeometry args={[roof.width, roof.width / DECAL_ASPECT]} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Ground({ palette }: { palette: Palette }) {
  const [fieldX, fieldZ] = toWorld(CAMPUS_FIELD.x, CAMPUS_FIELD.z);
  return (
    <group>
      <mesh geometry={UNIT_BOX} position={[0, -2, 0]} scale={[CAMPUS_GROUND.w, 4, CAMPUS_GROUND.d]} receiveShadow>
        <meshLambertMaterial color={palette.ground} />
      </mesh>
      {CAMPUS_ROADS.map((road) => {
        const [x, z] = toWorld(road.x, road.z);
        return (
          <mesh key={`${road.x}-${road.z}`} geometry={UNIT_BOX} position={[x, 0.02, z]} scale={[road.w, 0.04, road.d]} receiveShadow>
            <meshLambertMaterial color={palette.road} />
          </mesh>
        );
      })}
      <mesh geometry={UNIT_CYLINDER} position={[fieldX, 0.05, fieldZ]} scale={[CAMPUS_FIELD.w, 0.1, CAMPUS_FIELD.d]} receiveShadow>
        <meshLambertMaterial color={palette.structure} />
      </mesh>
      <mesh
        geometry={UNIT_CYLINDER}
        position={[fieldX, 0.08, fieldZ]}
        scale={[CAMPUS_FIELD.w - 5, 0.12, CAMPUS_FIELD.d - 5]}
        receiveShadow
      >
        <meshLambertMaterial color={palette.road} />
      </mesh>
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
    <instancedMesh ref={mesh} args={[undefined, undefined, CAMPUS_TREES.length]} castShadow raycast={() => null}>
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
const CAMERA_TARGET = new THREE.Vector3(1, 0, 7);

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
  const liveIds = new Set(live.map(({ block }) => block.id));
  const preparing = CAMPUS_BLOCKS.filter((block) => !liveIds.has(block.id));
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
        <Trees color={palette.structure} />
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
          <span
            style={{ backgroundColor: fill }}
            className="absolute top-full left-1/2 -mt-1 -ml-1 size-2 rotate-45"
          />
        </Link>
      ))}
    </div>
  );
}
