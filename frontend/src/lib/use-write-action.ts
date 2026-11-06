// 모임 쓰기 공통 흐름(SPEC v1 §4): 중복 제출 방지, 성공·409 뒤 재조회, 오류 문구.

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ApiError, useRevalidateData } from "@/lib/api";

export type WriteResult<T> = { ok: true; data: T } | { ok: false; message: string };

function writeErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "일시적인 오류가 생겼어요. 잠시 후 다시 시도해 주세요.";
  if (error.code === "MEETUP_FULL") return "정원 마감";
  if (error.code === "MEETUP_CLOSED") return "종료되거나 취소된 모임이에요.";
  return error.message;
}

export function useWriteAction() {
  const revalidate = useRevalidateData();
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  /** successMessage가 null이면 토스트 대신 호출한 화면이 직접 성공을 보여 준다. */
  async function run<T>(action: () => Promise<T>, successMessage: string | null): Promise<WriteResult<T>> {
    if (inFlight.current) return { ok: false, message: "처리 중이에요. 잠시만 기다려 주세요." };
    inFlight.current = true;
    setPending(true);
    try {
      const data = await action();
      if (successMessage) toast.success(successMessage);
      // 저장은 이미 끝났다. 재조회가 실패해도 POST를 다시 보내지 않는다.
      const refreshed = await revalidate();
      if (!refreshed) toast.warning("저장됐지만 화면 갱신에 실패했어요.");
      return { ok: true, data };
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) void revalidate();
      return { ok: false, message: writeErrorMessage(error) };
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return { pending, run };
}
