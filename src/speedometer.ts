const speedometerTick: HTMLDivElement | null = document.querySelector("[data-speedometer-value]");

// Map range from [0, 500] to [0, 180]
function mapRange(value : number, inMin : number, inMax : number, outMin : number, outMax : number) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}


// Set the speedometer value in the range [0, 500]
export function setSpeedometerValue(value: number) {
  const degree = mapRange(value, 0, 500, 0, 180);
  speedometerTick!.style.transform = `rotate(${degree}deg)`;
}
