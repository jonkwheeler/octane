import { useState } from "../../react-shim.js";
import { PointerSensor } from "@octanejs/dnd-kit";
import { isElement } from "@dnd-kit/dom/utilities";
import { type Distance } from "@dnd-kit/geometry";

export interface DelayConstraint {
  value: number;
  tolerance: Distance;
}

export interface DistanceConstraint {
  value: Distance;
  tolerance?: Distance;
}

export interface ActivationConstraints {
  distance?: DistanceConstraint;
  delay?: DelayConstraint;
}

const touchDefault = { delay: { value: 200, tolerance: 10 } };
const otherDefault = {
  delay: { value: 200, tolerance: 10 },
  distance: { value: 5 },
};

import { withoutSlot } from "../without-slot.js";

export const useSensors = (
  params: {
    mouse?: ActivationConstraints;
    touch?: ActivationConstraints;
    other?: ActivationConstraints;
  } | symbol = {
    touch: touchDefault,
    other: otherDefault,
  },
  ...rest: [slot?: symbol]
) => {
  const resolved = withoutSlot(params) ?? { touch: touchDefault, other: otherDefault };
  const {
    other = otherDefault,
    mouse,
    touch = touchDefault,
  } = resolved;
  const [sensors] = useState(() => [
    PointerSensor.configure({
      activationConstraints(event, source) {
        const { pointerType, target } = event;

        if (
          pointerType === "mouse" &&
          isElement(target) &&
          (source.handle === target || source.handle?.contains(target))
        ) {
          return mouse;
        }

        if (pointerType === "touch") {
          return touch;
        }

        return other;
      },
    }),
  ]);

  return sensors;
};
