import type { GameState } from "../game/GameState.js";
import type { PlayerId } from "../shared/ids.js";
import type { PlayerView } from "../shared/PlayerView.js";
import { createPlayerView, findPlayer } from "./createPlayerView.js";

/**
 * CPU が受け取る情報。人間のクライアントと同じ PlayerView である（master-prompt 12.4）。
 * 公開ログなどの追加情報は Phase 5 以降で足す。
 */
export type CpuView = PlayerView;

export function createCpuView(state: GameState, cpuPlayerId: PlayerId): CpuView {
  const player = findPlayer(state, cpuPlayerId);
  if (player.controllerType !== "CPU") {
    throw new Error(`CPU ではないプレイヤーです: ${cpuPlayerId}`);
  }
  // CPU は同じプロセス内で動くため、内部状態への参照を持たせないようコピーして渡す
  return structuredClone(createPlayerView(state, cpuPlayerId));
}
