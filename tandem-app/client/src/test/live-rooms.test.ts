import { describe, it, expect } from "vitest";
// @ts-expect-error plain JS server module
import { createRoom, canStart, chatChannel, canAdvance, nextCreator, allRead } from "../../../server/room-logic.js";

describe("live rooms", () => {
  it("only the room creator can start the game", () => {
    const r = createRoom("ABC12"); r.creatorId = "u-creator";
    expect(canStart(r, "u-creator")).toBe(true);
    expect(canStart(r, "u-friend")).toBe(false);
  });
  it("players and spectators chat on separate channels", () => {
    expect(chatChannel({ role: "player" })).toBe("players");
    expect(chatChannel({ role: "spectator" })).toBe("spectators");
  });
  it("only the creator can deal the next card, and only after the reveal", () => {
    const r = createRoom("ABC12"); r.creatorId = "u-creator"; r.phase = "reveal";
    expect(canAdvance(r, "u-creator")).toBe(true);
    expect(canAdvance(r, "u-friend")).toBe(false);
    r.phase = "question";
    expect(canAdvance(r, "u-creator")).toBe(false);
  });
  it("when the creator leaves, the next connected player takes over", () => {
    const r = createRoom("ABC12");
    r.players.set("a", { id: "a", role: "player", socketId: null });
    r.players.set("b", { id: "b", role: "player", socketId: "s2" });
    expect(nextCreator(r)).toBe("b");
  });
  it("the clock starts only after every connected player's host finished reading", () => {
    const r = createRoom("ABC12"); r.done = new Set(["a"]);
    r.players.set("a", { id: "a", role: "player", socketId: "s1" });
    r.players.set("b", { id: "b", role: "player", socketId: "s2" });
    expect(allRead(r)).toBe(false);
    r.done.add("b");
    expect(allRead(r)).toBe(true);
  });
});
