export const sleep = async (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// export const arrayRange = (start: number, end: number, step: number) => {
//   return Array.from(Array.from(Array(Math.ceil((end - start) / step)).keys()), (x) => start + x * step)
// }

export const arrayRange = (start: number, end: number, step: number) => {
  return Array.from(Array.from(Array(Math.ceil((end - start + 1) / step)).keys()), (x) => start + x * step)
}
