import { MOCK_WRITE_MESSAGE, USE_MOCK } from "@/lib/api";

/** 목업 모드에서 쓰기가 왜 막혀 있는지 알린다. */
export function MockWriteNotice() {
  if (!USE_MOCK) return null;
  return <p className="rounded-2xl bg-mock px-3.5 py-2.5 text-sm font-medium text-mock-foreground">{MOCK_WRITE_MESSAGE}</p>;
}
