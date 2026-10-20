import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isLiveConnected, liveInterval, subscribeNvr } from "./nvrApi";

class FakeES {
  static all: FakeES[] = [];
  static CLOSED = 2;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((m: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(public url: string) {
    FakeES.all.push(this);
  }
  close() {
    this.closed = true;
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  FakeES.all = [];
  vi.stubGlobal("EventSource", FakeES);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("subscribeNvr — bir kategoriya, bitta ulanish", () => {
  it("bir necha obunachi bitta EventSource'ni bo'lishadi va hodisani hammasi oladi", () => {
    const a = vi.fn();
    const b = vi.fn();
    const stopA = subscribeNvr("all", a);
    const stopB = subscribeNvr("all", b);
    expect(FakeES.all).toHaveLength(1);

    FakeES.all[0].onmessage?.({ data: JSON.stringify({ id: 1 }) });
    expect(a).toHaveBeenCalledWith({ id: 1 });
    expect(b).toHaveBeenCalledWith({ id: 1 });

    stopA();
    stopB();
    vi.advanceTimersByTime(3_000);
    expect(FakeES.all[0].closed).toBe(true);
  });

  it("oxirgi obunachi ketgach ulanish kechikish bilan yopiladi, qaytib kelsa saqlanadi", () => {
    const stop = subscribeNvr("all", vi.fn());
    stop();
    const again = subscribeNvr("all", vi.fn());
    vi.advanceTimersByTime(3_000);
    expect(FakeES.all).toHaveLength(1);
    expect(FakeES.all[0].closed).toBe(false);
    again();
    vi.advanceTimersByTime(3_000);
  });

  it("holat: ulanganda true, uzilganda false; liveInterval unga qarab tanlaydi", () => {
    const states: boolean[] = [];
    const stop = subscribeNvr("all", vi.fn(), (c) => states.push(c));
    const interval = liveInterval(15_000, 120_000);
    expect(isLiveConnected()).toBe(false);
    expect(interval()).toBe(15_000);

    FakeES.all[0].onopen?.();
    expect(isLiveConnected()).toBe(true);
    expect(interval()).toBe(120_000);

    FakeES.all[0].onerror?.();
    expect(isLiveConnected()).toBe(false);
    expect(states).toEqual([true, false]);

    stop();
    vi.advanceTimersByTime(3_000);
  });

  it("server ulanishni butunlay yopsa (CLOSED) o'zimiz qayta ochamiz", () => {
    const stop = subscribeNvr("all", vi.fn());
    const es = FakeES.all[0];
    es.readyState = FakeES.CLOSED;
    es.onerror?.();
    vi.advanceTimersByTime(5_000);
    expect(FakeES.all).toHaveLength(2);
    stop();
    vi.advanceTimersByTime(3_000);
  });
});
