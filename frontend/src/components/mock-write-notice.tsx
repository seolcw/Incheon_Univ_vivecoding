import { MOCK_WRITE_MESSAGE, USE_MOCK } from "@/lib/api";

/** 목업 모드에서 쓰기가 왜 막혀 있는지 알린다. */
export function MockWriteNotice() {
  if (!USE_MOCK) return null;
  return <p className="rounded-lg bg-mock px-3 py-2 text-sm text-mock-foreground">{MOCK_WRITE_MESSAGE}</p>;
}
