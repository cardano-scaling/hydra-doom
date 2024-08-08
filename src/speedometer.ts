const speedometerTick: HTMLDivElement | null = document.querySelector("[data-speedometer-value]");
const speedometerMax: HTMLDivElement | null = document.querySelector(".speedometer-max");

// Map a value from one range to another
function mapRange(value : number, inMin : number, inMax : number, outMin : number, outMax : number) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

export const MAX_SPEED = 50;
speedometerMax!.innerText = MAX_SPEED.toString();

// Set the speedometer value in the range [0, MAX_SPEED]
export function setSpeedometerValue(value: number) {
  const degree = mapRange(value, 0, MAX_SPEED, 0, 180);
  speedometerTick!.style.transform = `rotate(${degree}deg)`;
}
