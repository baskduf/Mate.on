import assert from "node:assert/strict";
import test from "node:test";
import { resolveSharedSignalRoomId, sanitizeRoomId } from "./signal-routing";

test("sanitizeRoomId trims valid room id", () => {
  assert.equal(sanitizeRoomId(" host-user "), "host-user");
});

test("sanitizeRoomId rejects empty room id", () => {
  assert.equal(sanitizeRoomId("   "), null);
  assert.equal(sanitizeRoomId(""), null);
  assert.equal(sanitizeRoomId(undefined), null);
});

test("resolveSharedSignalRoomId returns shared room when peers match", () => {
  const peerRoomById = new Map<string, string>([
    ["peer-a", "room-1"],
    ["peer-b", "room-1"]
  ]);

  assert.equal(resolveSharedSignalRoomId(peerRoomById, "peer-a", "peer-b"), "room-1");
});

test("resolveSharedSignalRoomId rejects missing or cross-room peers", () => {
  const peerRoomById = new Map<string, string>([
    ["peer-a", "room-1"],
    ["peer-b", "room-2"]
  ]);

  assert.equal(resolveSharedSignalRoomId(peerRoomById, "peer-a", "peer-b"), null);
  assert.equal(resolveSharedSignalRoomId(peerRoomById, "peer-a", "peer-c"), null);
  assert.equal(resolveSharedSignalRoomId(peerRoomById, "peer-x", "peer-b"), null);
});
