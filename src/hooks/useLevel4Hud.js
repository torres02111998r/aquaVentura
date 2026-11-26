import { useEffect, useState } from "react";
import { EventBus } from "../game/EventBus";

// Guarda el último valor por si el HUD se monta después de la escena
let lastHud = null;

export default function useLevel4Hud() {
  const [hud, setHud] = useState(lastHud);

  useEffect(() => {
    const onHud = (data) => {
      lastHud = data;
      setHud(data);
    };
    const onEnd = () => {
      lastHud = null;
      setHud(null);
    };
    EventBus.on("level4:hud", onHud);
    EventBus.on("level4:hud-end", onEnd);
    setHud(lastHud);
    return () => {
      EventBus.off("level4:hud", onHud);
      EventBus.off("level4:hud-end", onEnd);
    };
  }, []);

  return hud; // null cuando no estás en el nivel 4
}
