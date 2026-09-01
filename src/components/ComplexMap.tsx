"use client";

import Script from "next/script";
import { useCallback, useRef, useState } from "react";

/* 카카오 지도 SDK 는 전역 kakao 를 쓴다. 타입 패키지를 더 붙이지 않고 최소한만 선언한다. */
declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (cb: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (el: HTMLElement, opts: { center: unknown; level: number }) => unknown;
        Marker: new (opts: { position: unknown; map: unknown }) => unknown;
        ZoomControl: new () => unknown;
        ControlPosition: { RIGHT: unknown };
      };
    };
  }
}

const APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export default function ComplexMap({
  lat,
  lng,
  name,
}: {
  lat: number;
  lng: number;
  name: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const draw = useCallback(() => {
    const kakao = window.kakao;
    if (!kakao || !ref.current) return;
    kakao.maps.load(() => {
      const center = new kakao.maps.LatLng(lat, lng);
      // level 3 이면 주변 지하철역과 노선이 함께 보이는 축척이다.
      const map = new kakao.maps.Map(ref.current!, { center, level: 3 }) as {
        addControl: (c: unknown, p: unknown) => void;
      };
      new kakao.maps.Marker({ position: center, map });
      map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    });
  }, [lat, lng]);

  if (!APP_KEY) {
    return (
      <p className="rounded border border-black/10 px-3 py-2 text-xs opacity-60 dark:border-white/15">
        지도를 보려면 <code>.env.local</code> 에 <code>NEXT_PUBLIC_KAKAO_MAP_KEY</code>(카카오 JavaScript 키)를 넣는다.
      </p>
    );
  }

  return (
    <div>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${APP_KEY}&autoload=false`}
        strategy="afterInteractive"
        onReady={draw}
        onError={() => setError("지도 SDK 를 불러오지 못했다. 카카오 개발자 사이트에 이 사이트 도메인(http://localhost:3000)이 등록돼 있는지 확인한다.")}
      />
      <div
        ref={ref}
        role="img"
        aria-label={`${name} 위치 지도`}
        className="h-72 w-full rounded border border-black/10 dark:border-white/15"
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
