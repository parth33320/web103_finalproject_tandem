import { describe, it, expect } from "vitest";
// @ts-expect-error plain JS server module
import { createRoom, canStart, chatChannel } from "../../render-server/room-logic.js";

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
});
