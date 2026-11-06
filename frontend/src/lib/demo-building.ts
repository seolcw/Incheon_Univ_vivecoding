// 시연 건물. API는 건물 20개를 돌려주지만 지도와 도면은 이 건물만 다룬다(docs/scope-change.md).

export const DEMO_BUILDING_ID = "7";

/**
 * 지도에서 시연 건물을 그릴 고정 위치. API의 map은 건물을 격자로 늘어놓은 개략값이라 쓰지 않는다.
 * CampusMap이 건물의 map으로 위치를 잡으므로 이 값을 넣어 넘긴다.
 */
export const DEMO_BUILDING_BLOCK = { x: 8, y: 14, w: 30, h: 22 };
